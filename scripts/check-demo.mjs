// Exercise the real demo runner with no .env file, external database or browser.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";

async function availablePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

const port = await availablePort();
let launcherPort = await availablePort();
while (launcherPort === port) launcherPort = await availablePort();
const root = fileURLToPath(new URL("../", import.meta.url));
const launcher = `http://127.0.0.1:${launcherPort}`;
let output = "";
const demo = spawn(
  process.execPath,
  [
    "scripts/demo.mjs",
    "--port",
    String(port),
    "--launcher-port",
    String(launcherPort),
  ],
  {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: "development",
      MONGODB_URI: "mongodb://example.invalid:1",
      MONGODB_DB: "must_not_be_used",
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
demo.stdout.on("data", (chunk) => {
  output += chunk.toString();
});
demo.stderr.on("data", (chunk) => {
  output += chunk.toString();
});
const exited = once(demo, "exit");

try {
  const deadline = Date.now() + 180_000;
  while (!output.includes("BookBuddies demo:")) {
    if (demo.exitCode !== null || demo.signalCode !== null)
      throw new Error("Demo exited before it was ready.");
    if (Date.now() >= deadline) throw new Error("Demo startup timed out.");
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const response = await fetch(launcher);
  assert.equal(response.status, 200);
  const html = await response.text();
  const token = /name="csrf" value="([a-f0-9]+)"/.exec(html)?.[1];
  assert.ok(token, "The launcher must provide its session-start form token.");
  const denied = await fetch(`${launcher}/start`, { method: "POST" });
  assert.equal(denied.status, 403);
  const start = await fetch(`${launcher}/start`, {
    method: "POST",
    body: new URLSearchParams({ csrf: token }),
    redirect: "manual",
  });
  assert.equal(start.status, 303);
  const destination = start.headers.get("location");
  assert.equal(destination, `http://localhost:${port}/parent/children/new`);
  const cookie = start.headers.get("set-cookie")?.split(";")[0];
  assert.ok(
    cookie,
    "The launcher must set the invented parent's database session.",
  );
  const form = await fetch(destination, {
    headers: { cookie },
    redirect: "manual",
  });
  assert.equal(form.status, 200);
  const formHtml = await form.text();
  assert.ok(formHtml.includes("Add a child"));
  assert.ok(formHtml.includes("Create account"));
  console.log(
    "Demo smoke check passed: production build, temporary database, session handoff and protected launcher.",
  );
} catch (error) {
  console.error(output.slice(-6000));
  throw error;
} finally {
  if (demo.exitCode === null && demo.signalCode === null) {
    demo.kill("SIGINT");
    const forceStop = setTimeout(() => demo.kill("SIGKILL"), 10_000);
    const [exitCode] = await exited;
    clearTimeout(forceStop);
    assert.equal(exitCode, 0, "The demo runner must shut down cleanly.");
  }
  for (const released of [port, launcherPort]) {
    const probe = createServer();
    probe.listen(released, "127.0.0.1");
    await once(probe, "listening");
    await new Promise((resolve) => probe.close(resolve));
  }
  console.log("Demo shutdown check passed: both ports were released.");
}
