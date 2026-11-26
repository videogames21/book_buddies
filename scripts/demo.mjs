// Local demo harness, outside the application. Seeds one invented Main Parent, who
// signs in through the real /sign-in page. Takes only its mail settings from .env or
// .env.local; never their database or other settings.
import { spawn } from "node:child_process";
import { createHash, randomBytes, scrypt } from "node:crypto";
import { once } from "node:events";
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { parseArgs, parseEnv, promisify } from "node:util";
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

// The demo's mail settings, and nothing else, may come from the untracked .env or
// .env.local, so a developer can keep a Resend key there. A shell variable wins over a
// file, and .env.local over .env. Every other setting in those files is ignored.
const MAIL_KEYS = ["DEMO_SMTP_URL", "DEMO_MAIL_FROM"];
function demoMailSettings() {
  const settings = {};
  for (const name of [".env", ".env.local"]) {
    const file = fileURLToPath(new URL(`../${name}`, import.meta.url));
    if (!existsSync(file)) continue;
    const parsed = parseEnv(readFileSync(file, "utf8"));
    for (const key of MAIL_KEYS) if (parsed[key]) settings[key] = parsed[key];
  }
  for (const key of MAIL_KEYS)
    if (process.env[key]) settings[key] = process.env[key];
  return settings;
}
const mail = demoMailSettings();
const nextBin = fileURLToPath(
  new URL("../node_modules/next/dist/bin/next", import.meta.url),
);

// Invented, and only valid in this run's temporary database.
const DEMO_EMAIL = "demo-parent@example.test";
const DEMO_PASSWORD = "demo-password-123";
const DEMO_ADMIN_EMAIL = "demo-admin@example.test";
const DEMO_ADMIN_PASSWORD = "demo-admin-password-123";

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
    // Production mode has no default mail server. With DEMO_SMTP_URL (Resend's SMTP
    // URL) and DEMO_MAIL_FROM set, email is really delivered; otherwise it goes to
    // local Mailpit and never leaves this machine (design/par.md, Email Service).
    SMTP_URL: mail.DEMO_SMTP_URL ?? "smtp://127.0.0.1:1025",
    MAIL_FROM:
      mail.DEMO_MAIL_FROM ?? "BookBuddies demo <no-reply@bookbuddies.test>",
    NEXT_TELEMETRY_DISABLED: "1",
    // Child sign-in: a fresh cookie secret each run, and the zone midnight is read in.
    CHILD_DEVICE_SECRET: randomBytes(32).toString("hex"),
    CHILD_SESSION_TIME_ZONE:
      process.env.CHILD_SESSION_TIME_ZONE ?? "America/Chicago",
    // TEMPORARY (OI-61): lets the demo admin sign in on the parent page.
    ALLOW_ADMIN_PARENT_SIGNIN: "1",
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
  // The client's seed catalog, as active books: the admin list and the parent's
  // favorite-book picker both read it.
  const seed = spawn(
    process.execPath,
    ["--experimental-transform-types", "scripts/seed-catalog.mjs"],
    {
      cwd: root,
      env,
      stdio: "inherit",
    },
  );
  const [seedCode] = await once(seed, "exit");
  if (seedCode !== 0) throw new Error("Demo catalog seed failed.");

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
  await db.collection("users").insertOne({
    _id: new ObjectId(),
    role: "admin",
    name: "Demo Admin",
    email: DEMO_ADMIN_EMAIL,
    passwordHash: await hashDemoPassword(DEMO_ADMIN_PASSWORD),
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

  // Names the mail host only, never the URL, which can hold an API key.
  const mailHost = new URL(env.SMTP_URL).hostname;
  const mailNote =
    mailHost === "127.0.0.1" || mailHost === "localhost"
      ? "Emails (sign-up confirmation, password reset) go to Mailpit, not a real inbox:\n  Start it: docker run -p 1025:1025 -p 8025:8025 axllent/mailpit:v1.33.1\n  Read them: http://localhost:8025"
      : `Emails go out for real through ${mailHost}, to the address typed at sign-up.`;
  console.log(
    `
BookBuddies demo: ${appOrigin}
Sign in with the invented parent:
  Email:    ${DEMO_EMAIL}
  Password: ${DEMO_PASSWORD}
And the invented admin (same page, opens /admin/catalog):
  Email:    ${DEMO_ADMIN_EMAIL}
  Password: ${DEMO_ADMIN_PASSWORD}
${mailNote}
Press Ctrl+C to stop. Restart npm run demo for a fresh family.
`,
  );
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Demo startup failed.",
  );
  await shutdown(1);
}
