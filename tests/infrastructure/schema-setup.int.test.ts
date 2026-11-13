import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { expect, it } from "vitest";

it("runs the deployment setup command twice without duplicate-index failures", async () => {
  const run = promisify(execFile);
  for (let attempt = 0; attempt < 2; attempt++) {
    const { stdout } = await run(
      process.execPath,
      ["--conditions=react-server", "scripts/ensure-indexes.mjs"],
      { env: process.env },
    );
    expect(stdout).toContain("collections and indexes are ready");
  }
});
