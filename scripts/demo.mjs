// Local demo harness, outside the application. Uses the same invented-parent and
// database-session approach as tests/e2e/session-fixture.ts. Never uses .env.local.
import { spawn } from "node:child_process";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
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

const { values } = parseArgs({
  options: {
    port: { type: "string" },
    "launcher-port": { type: "string" },
  },
});

function portOf(value, fallback) {
  const port = Number(value ?? fallback);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error("Demo ports must be whole numbers from 1024 to 65535.");
  }
  return port;
}

const port = portOf(values.port ?? process.env.DEMO_PORT, 3000);
const launcherPort = portOf(
  values["launcher-port"] ?? process.env.DEMO_LAUNCHER_PORT,
  port + 1,
);
if (port === launcherPort) throw new Error("Demo ports must be different.");
const appOrigin = `http://localhost:${port}`;
const launcherOrigin = `http://localhost:${launcherPort}`;
const root = fileURLToPath(new URL("../", import.meta.url));
const nextBin = fileURLToPath(
  new URL("../node_modules/next/dist/bin/next", import.meta.url),
);

let replSet;
let client;
let app;
let launcher;
let stopping = false;

async function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  launcher?.close();
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
  // Fail before downloading/starting MongoDB if either requested port is busy.
  for (const requested of [port, launcherPort]) {
    const probe = createServer();
    probe.listen(requested, "127.0.0.1");
    try {
      await once(probe, "listening");
    } catch (error) {
      if (error.code === "EADDRINUSE") {
        throw new Error(
          `Port ${requested} is in use. Stop the other server, or run: npm run demo -- --port 3200`,
        );
      }
      throw error;
    }
    await new Promise((resolve) => probe.close(resolve));
  }

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
    NEXTAUTH_URL: appOrigin,
    PRIVACY_NOTICE_URL: `${appOrigin}/privacy-notice`,
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
  const sessionToken = randomBytes(32).toString("hex");
  const formToken = randomBytes(32).toString("hex");
  await db.collection("users").insertOne({
    _id: userId,
    familyId,
    role: "parent",
    parentRole: "main",
    email: "demo-parent@example.test",
    emailVerified: new Date(),
  });
  await db
    .collection("consentRecords")
    .insertOne({ familyId, confirmedAt: new Date() });
  await db.collection("sessions").insertOne({
    sessionToken,
    userId,
    expires: new Date(Date.now() + 4 * 60 * 60 * 1000),
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

  launcher = createServer(async (req, res) => {
    // Bind to loopback and require a per-run form token. This fixture cannot
    // sign into any other database or be exposed as an application auth route.
    if (
      ![`localhost:${launcherPort}`, `127.0.0.1:${launcherPort}`].includes(
        req.headers.host,
      )
    ) {
      res.writeHead(403).end("Local demo only.");
      return;
    }
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader(
      "Content-Security-Policy",
      `default-src 'none'; style-src 'unsafe-inline'; form-action 'self' ${appOrigin}; frame-ancestors 'none'`,
    );
    if (req.url === "/start" && req.method === "POST") {
      let body = "";
      try {
        for await (const chunk of req) {
          body += chunk.toString();
          if (body.length > 256) {
            res.writeHead(413).end("Request too large.");
            return;
          }
        }
      } catch {
        res.writeHead(400).end("Request could not be read.");
        return;
      }
      const submittedToken = Buffer.from(
        new URLSearchParams(body).get("csrf") ?? "",
      );
      const expectedToken = Buffer.from(formToken);
      if (
        submittedToken.length !== expectedToken.length ||
        !timingSafeEqual(submittedToken, expectedToken)
      ) {
        res.writeHead(403).end("Open the demo from its local start page.");
        return;
      }
      res
        .writeHead(303, {
          "Set-Cookie": `next-auth.session-token=${sessionToken}; HttpOnly; SameSite=Lax; Path=/; Max-Age=14400`,
          Location: `${appOrigin}/parent/children/new`,
        })
        .end();
      return;
    }
    if (req.url !== "/" || req.method !== "GET") {
      res.writeHead(404).end("Not found.");
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
      .end(`<!doctype html>
<html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>BookBuddies demo</title><style>
body{margin:0;background:#f3f5fa;color:#23314a;font:18px/1.6 system-ui}main{max-width:640px;margin:10vh auto;padding:36px;background:white;border-radius:18px;box-shadow:0 8px 35px #24314a12}h1{line-height:1.2}button{padding:14px 24px;background:#334bc2;color:white;border:0;border-radius:8px;font:inherit;cursor:pointer}small{display:block;margin-top:28px;color:#58677d}li{margin:8px 0}
</style><main><p>BOOKBUDDIES · LOCAL DEMO</p><h1>Create a child's account</h1>
<p>Try the Main Parent's account-creation flow with an invented family.</p>
<ol><li>Enter a nickname, age, grade and username.</li><li>Choose a character and optionally add a reading level or note.</li><li>Create the account and see the generated credentials once.</li></ol>
<form action="/start" method="post"><input type="hidden" name="csrf" value="${formToken}"><button>Open demo</button></form>
<small>Sample data is temporary and is removed when this process stops. Parent sign-in and reading-interest onboarding are unfinished. Use invented data only.</small></main></html>`);
  });
  launcher.listen(launcherPort, "127.0.0.1");
  await once(launcher, "listening");
  console.log(
    `\nBookBuddies demo: ${launcherOrigin}\nPress Ctrl+C to stop. Restart npm run demo for a fresh family.\n`,
  );
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Demo startup failed.",
  );
  await shutdown(1);
}
