// Local demo harness, outside the application. Seeds one invented Main Parent, who
// signs in through the real /sign-in page. Never uses .env.local.
import { spawn } from "node:child_process";
import { createHash, randomBytes, scrypt } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { parseArgs, promisify } from "node:util";
import { MongoClient, ObjectId } from "mongodb";
import { MongoMemoryReplSet } from "mongodb-memory-server";

if (process.env.NODE_ENV === "production") {
  throw new Error("The demo harness is for local development only.");
}
if (Number(process.versions.node.split(".")[0]) < 24) {
  console.error(
    "BookBuddies requires Node.js 24 or newer. Install Node.js 24, then run npm ci again.",
  );
  process.exit(1);
}

const { values } = parseArgs({ options: { port: { type: "string" } } });

const port = Number(values.port ?? process.env.DEMO_PORT ?? 3000);
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error("The demo port must be a whole number from 1024 to 65535.");
}
const appOrigin = `http://localhost:${port}`;
const root = fileURLToPath(new URL("../", import.meta.url));
const nextBin = fileURLToPath(
  new URL("../node_modules/next/dist/bin/next", import.meta.url),
);

// Invented, and only valid in this run's temporary database.
const DEMO_EMAIL = "demo-parent@example.test";
const DEMO_PASSWORD = "demo-password-123";

// The stored format and cost of src/server/identity-access/passwords.ts.
async function hashDemoPassword(password) {
  const [N, r, p] = [2 ** 17, 8, 1];
  const salt = randomBytes(16);
  const key = await promisify(scrypt)(password, salt, 64, {
    N,
    r,
    p,
    maxmem: 256 * 1024 * 1024,
  });
  return [
    "scrypt",
    N,
    r,
    p,
    salt.toString("base64"),
    key.toString("base64"),
  ].join("$");
}

let replSet;
let client;
let app;
let stopping = false;

async function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  if (app && app.exitCode === null && app.signalCode === null) {
    const exited = once(app, "exit");
    app.kill("SIGTERM");
    const forceStop = setTimeout(() => app.kill("SIGKILL"), 5000);
    await exited;
    clearTimeout(forceStop);
  }
  await client?.close();
  await replSet?.stop();
  process.exit(code);
}
process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());

try {
  // Fail before downloading/starting MongoDB if the requested port is busy.
  const probe = createServer();
  probe.listen(port, "127.0.0.1");
  try {
    await once(probe, "listening");
  } catch (error) {
    if (error.code === "EADDRINUSE") {
      throw new Error(
        `Port ${port} is in use. Stop the other server, or run: npm run demo -- --port 3200`,
      );
    }
    throw error;
  }
  await new Promise((resolve) => probe.close(resolve));

  console.log("Starting a fresh local demo database...");
  replSet = await MongoMemoryReplSet.create({
    instanceOpts: [{ ip: "127.0.0.1" }],
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  const uri = replSet.getUri();
  const env = {
    ...process.env,
    NODE_ENV: "production",
    MONGODB_URI: uri,
    MONGODB_DB: "bookbuddies_demo",
    AUTH_SECRET: randomBytes(32).toString("hex"),
    APP_URL: appOrigin,
    PRIVACY_NOTICE_URL: `${appOrigin}/privacy-notice`,
    // Production mode has no default mail server, so name local Mailpit; emails never
    // leave this machine (design/par.md, Email Service).
    SMTP_URL: process.env.DEMO_SMTP_URL ?? "smtp://127.0.0.1:1025",
    MAIL_FROM: "BookBuddies demo <no-reply@bookbuddies.test>",
    NEXT_TELEMETRY_DISABLED: "1",
  };
  console.log("Building the demo application...");
  app = spawn(process.execPath, [nextBin, "build"], {
    cwd: root,
    env,
    stdio: "inherit",
  });
  const [buildCode] = await once(app, "exit");
  app = undefined;
  if (buildCode !== 0) throw new Error("Demo build failed.");
  const setup = spawn(
    process.execPath,
    ["--conditions=react-server", "scripts/ensure-indexes.mjs"],
    {
      cwd: root,
      env,
      stdio: "inherit",
    },
  );
  const [setupCode] = await once(setup, "exit");
  if (setupCode !== 0) throw new Error("Demo database setup failed.");

  client = new MongoClient(uri);
  const db = client.db("bookbuddies_demo");
  const userId = new ObjectId();
  const familyId = new ObjectId();
  await db.collection("users").insertOne({
    _id: userId,
    familyId,
    role: "parent",
    parentRole: "main",
    name: "Demo Parent",
    email: DEMO_EMAIL,
    passwordHash: await hashDemoPassword(DEMO_PASSWORD),
  });
  const acknowledgedAt = new Date();
  await db.collection("consentRecords").insertOne({
    familyId,
    parentUserId: userId,
    noticeVersion: "demo",
    method: "email-plus",
    acknowledgedAt,
    confirmBy: new Date(acknowledgedAt.getTime() + 14 * 24 * 60 * 60 * 1000),
    confirmationTokenHash: createHash("sha256")
      .update(randomBytes(32))
      .digest("hex"),
    confirmedAt: acknowledgedAt,
  });

  app = spawn(
    process.execPath,
    [nextBin, "start", "--hostname", "127.0.0.1", "--port", String(port)],
    {
      cwd: root,
      env,
      stdio: "inherit",
    },
  );
  app.on("error", () => void shutdown(1));
  app.on("exit", (code) => {
    if (!stopping) void shutdown(code ?? 1);
  });
  const deadline = Date.now() + 120_000;
  while (true) {
    try {
      if (
        (
          await fetch(`${appOrigin}/avatars/1.png`, {
            signal: AbortSignal.timeout(2000),
          })
        ).ok
      )
        break;
    } catch {
      /* The application server is still starting. */
    }
    if (Date.now() >= deadline)
      throw new Error("Demo server did not start within two minutes.");
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  console.log(
    `\nBookBuddies demo: ${appOrigin}\nSign in with the invented parent:\n  Email:    ${DEMO_EMAIL}\n  Password: ${DEMO_PASSWORD}\nEmails (sign-up confirmation, password reset) go to Mailpit, not a real inbox:\n  Start it: docker run -p 1025:1025 -p 8025:8025 axllent/mailpit:v1.33.1\n  Read them: http://localhost:8025\nPress Ctrl+C to stop. Restart npm run demo for a fresh family.\n`,
  );
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Demo startup failed.",
  );
  await shutdown(1);
}
