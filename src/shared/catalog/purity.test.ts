import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// "Shared module purity" (design/adm.md, Tests): src/shared/catalog/ runs in the browser,
// in the action and in the import script, so it imports nothing from the server.
const FORBIDDEN = [
  /^@\/server\//,
  /^server-only$/,
  /^mongodb$/,
  /^next(\/|$)/,
  /^node:/,
  /clock/,
];

function importsOf(source: string): string[] {
  const found: string[] = [];
  for (const match of source.matchAll(
    /(?:from\s+|import\s+|import\(\s*)["']([^"']+)["']/g,
  ))
    found.push(match[1]);
  return found;
}

describe("src/shared/catalog purity", () => {
  const dir = __dirname;
  const files = readdirSync(dir).filter(
    (name) => name.endsWith(".ts") && !name.endsWith(".test.ts"),
  );

  it("has the files the design names", () => {
    expect(files).toEqual(
      expect.arrayContaining(["normalize.ts", "tags.ts", "new-book-schema.ts"]),
    );
  });

  it.each(files)("%s imports nothing from the server", (name) => {
    const imports = importsOf(readFileSync(join(dir, name), "utf8"));
    for (const specifier of imports)
      expect(FORBIDDEN.some((rule) => rule.test(specifier))).toBe(false);
  });

  it("the check catches a forbidden import", () => {
    expect(importsOf('import { now } from "@/server/lib/clock";')).toEqual([
      "@/server/lib/clock",
    ]);
  });
});
