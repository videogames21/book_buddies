import { describe, expect, it } from "vitest";
import {
  buildMatchKey,
  normalizeCustomTag,
  normalizeIsbn,
  normalizeText,
} from "./normalize";

const SEP = "\u001f";

// The expected keys are the table in design/adm.md, Tests.
describe("buildMatchKey", () => {
  it.each([
    ["Charlotte's Web", "E. B. White", `charlottes web${SEP}e b white`],
    ["Charlotte’s Web", "E.B. White", `charlottes web${SEP}eb white`],
    ["  The  Cat in the Hat ", "Dr. Seuss", `the cat in the hat${SEP}dr seuss`],
    ["Pokémon", "Satoshi Tajiri", `pokemon${SEP}satoshi tajiri`],
    ["Pokémon", "Satoshi Tajiri", `pokemon${SEP}satoshi tajiri`],
    ["ﬁsh", "A. Author", `fish${SEP}a author`],
    ["Spider-Man", "S. Lee", `spiderman${SEP}s lee`],
    ["Spider Man", "S. Lee", `spider man${SEP}s lee`],
    ["a b", "c", `a b${SEP}c`],
    ["a", "b c", `a${SEP}b c`],
    ["É", "é", `e${SEP}e`],
  ])("%s by %s gives the expected key", (title, author, key) => {
    expect(buildMatchKey(title, author)).toBe(key);
  });

  it("does not let a space in the title collide with one in the author", () => {
    expect(buildMatchKey("a b", "c")).not.toBe(buildMatchKey("a", "b c"));
  });

  it("matches one book across case, accents, punctuation and spacing (5a)", () => {
    expect(buildMatchKey("THE  CAT, in the HAT!", "dr seuss")).toBe(
      buildMatchKey("The Cat in the Hat", "Dr. Seuss"),
    );
  });
});

describe("normalizeText, control characters", () => {
  it("removes them, so the key separator cannot appear inside a key part", () => {
    expect(normalizeText("a\u001fb")).toBe("ab");
    expect(buildMatchKey("a\u001fb", "c")).not.toBe(
      buildMatchKey("a", "b\u001fc"),
    );
    expect(buildMatchKey("a\u001fb", "c").split("\u001f")).toHaveLength(2);
  });

  it("keeps words apart when a tab or line break separates them", () => {
    expect(normalizeText("a\tb\nc")).toBe("a b c");
  });
});

describe("normalizeText", () => {
  it("reduces a title that is only punctuation to an empty string (4a)", () => {
    expect(normalizeText(" ... !? ")).toBe("");
  });
});

describe("normalizeCustomTag", () => {
  it("trims, lower-cases and collapses spaces, with no plural merging", () => {
    expect(normalizeCustomTag("  Scary   But  Warming ")).toBe(
      "scary but warming",
    );
    expect(normalizeCustomTag("FRIEND")).toBe("friend");
    expect(normalizeCustomTag("friends")).toBe("friends");
    expect(normalizeCustomTag("   ")).toBe("");
  });

  it("folds full-width and compatibility characters (NFKC)", () => {
    expect(normalizeCustomTag("ＦＲＩＥＮＤ")).toBe("friend");
    expect(normalizeCustomTag("ﬁsh")).toBe("fish");
  });
});

describe("normalizeIsbn", () => {
  it("returns an ISBN-13 unchanged, ignoring hyphens and spaces", () => {
    expect(normalizeIsbn("9780439023481")).toBe("9780439023481");
    expect(normalizeIsbn("978-0-439-02348-1")).toBe("9780439023481");
    expect(normalizeIsbn(" 978 0439 023481 ")).toBe("9780439023481");
  });

  it("accepts a 979 ISBN-13 and refuses another prefix with a valid check digit", () => {
    expect(normalizeIsbn("9791234567896")).toBe("9791234567896");
    expect(normalizeIsbn("9771234567898")).toBeNull();
  });

  it("converts an ISBN-10 to the matching ISBN-13", () => {
    expect(normalizeIsbn("0439023483")).toBe("9780439023481");
    expect(normalizeIsbn("0-439-02348-3")).toBe("9780439023481");
  });

  it("counts an X as 10 in an ISBN-10", () => {
    expect(normalizeIsbn("080442957X")).toBe("9780804429573");
    expect(normalizeIsbn("080442957x")).toBe("9780804429573");
  });

  it("accepts an ISBN whose check digit is 0, as ISBN-13 and as the ISBN-10 that converts to it", () => {
    expect(normalizeIsbn("9784390234870")).toBe("9784390234870");
    expect(normalizeIsbn("4390234870")).toBe("9784390234870");
  });

  it("gives the same result for one book entered as ISBN-10 and as ISBN-13", () => {
    expect(normalizeIsbn("0439023483")).toBe(normalizeIsbn("9780439023481"));
  });

  it.each([
    "9780439023482", // wrong ISBN-13 check digit
    "0439023484", // wrong ISBN-10 check digit
    "978043902348", // 12 digits
    "97804390234811", // 14 digits
    "043902348", // 9 digits
    "1234567890123", // right length, not an ISBN prefix
    "04390234X3", // X inside the number
    "",
    "not an isbn",
  ])("refuses %j", (input) => {
    expect(normalizeIsbn(input)).toBeNull();
  });
});
