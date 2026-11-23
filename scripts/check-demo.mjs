// Exercise the real demo runner with no .env file, external database or browser.
// The browser sign-in itself is covered by tests/e2e/sign-in.spec.ts.
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
const root = fileURLToPath(new URL("../", import.meta.url));
const origin = `http://localhost:${port}`;
let output = "";
const demo = spawn(
  process.execPath,
  ["scripts/demo.mjs", "--port", String(port)],
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
  while (!output.includes("Press Ctrl+C to stop.")) {
    if (demo.exitCode !== null || demo.signalCode !== null)
      throw new Error("Demo exited before it was ready.");
    if (Date.now() >= deadline) throw new Error("Demo startup timed out.");
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(output.includes("demo-parent@example.test"));

  const home = await fetch(`${origin}/`, { redirect: "manual" });
  assert.equal(home.status, 307);
  assert.equal(
    new URL(home.headers.get("location"), origin).pathname,
    "/sign-in",
  );

  const signIn = await fetch(`${origin}/sign-in`);
  assert.equal(signIn.status, 200);
  assert.ok((await signIn.text()).includes("Parent sign in"));

  const parent = await fetch(`${origin}/parent`);
  assert.equal(new URL(parent.url).pathname, "/sign-in");
  console.log(
    "Demo smoke check passed: production build, temporary database and sign-in page.",
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
  const probe = createServer();
  probe.listen(port, "127.0.0.1");
  await once(probe, "listening");
  await new Promise((resolve) => probe.close(resolve));
  console.log("Demo shutdown check passed: the port was released.");
}
