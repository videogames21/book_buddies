import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MongoClient, ObjectId, type Db } from "mongodb";
import type { BrowserContext } from "@playwright/test";

// Test-only session fixture. Sign-in belongs to UC-PAR-onboarding, which is not built,
// so the tests write an Auth.js database session directly and set its cookie. Never
// used by the app. Invented accounts only.

let client: MongoClient | undefined;

export async function e2eDb(): Promise<Db> {
  if (!client) {
    const uri = readFileSync(join(__dirname, ".mongo-uri"), "utf8").trim();
    client = new MongoClient(uri);
  }
  return client.db("bookbuddies_e2e");
}

export async function closeE2eDb(): Promise<void> {
  await client?.close();
  client = undefined;
}

export async function signInParent(
  context: BrowserContext,
  options: { parentRole: "main" | "sub"; consentConfirmed: boolean },
): Promise<{ familyId: ObjectId }> {
  const db = await e2eDb();
  const userId = new ObjectId();
  const familyId = new ObjectId();
  await db.collection("users").insertOne({
    _id: userId,
    role: "parent",
    parentRole: options.parentRole,
    familyId,
    email: `parent-${userId.toHexString()}@example.test`,
  });
  await db
    .collection("consentRecords")
    .insertOne({ familyId, ...(options.consentConfirmed && { confirmedAt: new Date() }) });

  const sessionToken = randomBytes(32).toString("hex");
  await db.collection("sessions").insertOne({
    sessionToken,
    userId,
    expires: new Date(Date.now() + 60 * 60 * 1000),
  });
  await context.addCookies([
    { name: "authjs.session-token", value: sessionToken, domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax" },
  ]);
  return { familyId };
}
