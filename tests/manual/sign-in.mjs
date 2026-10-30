// Manual-testing helper for UC-PAR-create-kid-account. Works only against the
// in-memory database started by `node tests/e2e/start-server.mjs`; never the app's
// real database. Sign-in (UC-PAR-onboarding) is not built, so this writes an
// invented parent and an Auth.js session directly, like the end-to-end tests do.
//
//   node tests/manual/sign-in.mjs main        a Main Parent with confirmed consent
//   node tests/manual/sign-in.mjs sub         a Sub Parent (extension 1b)
//   node tests/manual/sign-in.mjs no-consent  a Main Parent without consent (1c)
//   node tests/manual/sign-in.mjs show        what has been stored so far
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { MongoClient, ObjectId } from "mongodb";

const kind = process.argv[2];
const kinds = ["main", "sub", "no-consent", "show"];
if (!kinds.includes(kind)) {
  console.error(`Usage: node tests/manual/sign-in.mjs <${kinds.join(" | ")}>`);
  process.exit(1);
}

let uri;
try {
  uri = readFileSync(fileURLToPath(new URL("../e2e/.mongo-uri", import.meta.url)), "utf8").trim();
} catch {
  console.error("Start the test server first: node tests/e2e/start-server.mjs");
  process.exit(1);
}

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
try {
  const db = client.db("bookbuddies_e2e");

  if (kind === "show") {
    const children = await db.collection("children").find().toArray();
    const identities = await db.collection("childIdentities").find().toArray();
    const credentials = await db
      .collection("users")
      .find({ role: "child" }, { projection: { passwordHash: 0 } })
      .toArray();
    console.log("children (what the child is shown as):", children);
    console.log("childIdentities (private details):", identities);
    console.log("child logins (password hash hidden here):", credentials);
  } else {
    const userId = new ObjectId();
    const familyId = new ObjectId();
    await db.collection("users").insertOne({
      _id: userId,
      role: "parent",
      parentRole: kind === "sub" ? "sub" : "main",
      familyId,
      email: `parent-${userId.toHexString()}@example.test`,
    });
    await db
      .collection("consentRecords")
      .insertOne({ familyId, ...(kind !== "no-consent" && { confirmedAt: new Date() }) });
    const sessionToken = randomBytes(32).toString("hex");
    await db.collection("sessions").insertOne({
      sessionToken,
      userId,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    console.log(`Signed in as an invented ${kind} parent (family ${familyId.toHexString()}).`);
    console.log("On http://localhost:3100, paste this into the browser console (F12, Console tab):\n");
    console.log(`document.cookie = "authjs.session-token=${sessionToken}; path=/"`);
  }
} finally {
  await client.close();
}
