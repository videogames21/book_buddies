import { describe, expect, it } from "vitest";
import { screenNote } from "./screen-note";
const entries = [
  { word: "fixture", category: "test" },
  { word: "a+b", category: "literal" },
];
describe("local note screening", () => {
  it("matches whole terms case-insensitively and retains offsets in stored text", () => {
    const text = "🌟 FIXTURE, fixture!";
    const result = screenNote(text, entries, "test-1");
    expect(result.state).toBe("flagged");
    expect(result.passages.map((p) => text.slice(p.start, p.end))).toEqual([
      "FIXTURE",
      "fixture",
    ]);
    expect(result.version).toBe("test-1");
  });
  it("escapes regex characters and does not match a term inside another word", () => {
    expect(screenNote("fixtures préfixture a+b", entries).passages).toEqual([
      { start: 20, end: 23, category: "literal" },
    ]);
    expect(screenNote("fiction and moon stories", entries).state).toBe("none");
  });
  it("does not silently mark an unavailable detector as clean", () => {
    expect(() => screenNote("anything", [])).toThrow("not configured");
    expect(() =>
      screenNote("anything", [{ word: " ", category: "test" }]),
    ).toThrow();
  });
  it("orders passages by their position rather than word-list order", () => {
    expect(screenNote("a+b then fixture", entries).passages).toEqual([
      { start: 0, end: 3, category: "literal" },
      { start: 9, end: 16, category: "test" },
    ]);
  });
});
