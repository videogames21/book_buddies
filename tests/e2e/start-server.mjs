// Starts an in-memory MongoDB replica set and the Next.js dev server against it, for
// Playwright. The tests read the database URI from tests/e2e/.mongo-uri to seed
// invented test accounts and sessions.
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { MongoMemoryReplSet } from "mongodb-memory-server";

const port = process.env.E2E_PORT ?? "3100";
const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
const uri = replSet.getUri();
writeFileSync(fileURLToPath(new URL("./.mongo-uri", import.meta.url)), uri);

const nextBin = fileURLToPath(new URL("../../node_modules/next/dist/bin/next", import.meta.url));
const server = spawn(process.execPath, [nextBin, "dev", "--port", port], {
  stdio: "inherit",
  env: {
    ...process.env,
    MONGODB_URI: uri,
    MONGODB_DB: "bookbuddies_e2e",
    AUTH_SECRET: randomBytes(32).toString("hex"),
    AUTH_TRUST_HOST: "true",
  },
});

function stopServer() {
  // On Windows, kill() stops only the `next` launcher and leaves the server it started
  // holding the port, so stop the whole process tree.
  if (process.platform === "win32" && server.pid) {
    spawn("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    server.kill();
  }
}

async function shutdown() {
  stopServer();
  await replSet.stop();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
server.on("exit", async () => {
  await replSet.stop();
  process.exit(0);
});
