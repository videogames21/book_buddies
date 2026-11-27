import { describe, expect, it } from "vitest";
import { firstErrorCode, suggestBookSchema } from "./schema";

// UC-PAR-suggest-book 3b and the check order (design/par.md, Tests). Invented IDs only.

const CHILD_ID = "6b0f2c6e-0f3c-4b5e-9d51-0c2d5e1a7a11";
const valid = { childId: CHILD_ID, bookId: "book-1" };

function codeFor(input: unknown) {
  const parsed = suggestBookSchema.safeParse(input);
  return parsed.success ? "ok" : firstErrorCode(parsed.error);
}

describe("suggestBookSchema, the note (3b)", () => {
  it("accepts 250 characters after trimming, and trims them", () => {
    const note = "a".repeat(250);
    const parsed = suggestBookSchema.parse({ ...valid, note: `  ${note}\n` });
    expect(parsed.note).toBe(note);
  });

  it("refuses 251 characters after trimming with NOTE_TOO_LONG", () => {
    expect(codeFor({ ...valid, note: "a".repeat(251) })).toBe("NOTE_TOO_LONG");
  });

  it.each([[""], ["   \t\n "], [null], [undefined]])(
    "treats %j as no note",
    (note) => {
      expect(suggestBookSchema.parse({ ...valid, note }).note).toBeUndefined();
    },
  );

  it("defaults suggestAnyway to false", () => {
    expect(suggestBookSchema.parse(valid).suggestAnyway).toBe(false);
  });
});

describe("suggestBookSchema, IDs and shape", () => {
  it.each([["not-a-uuid"], [""], [42], [undefined]])(
    "answers child ID %j with CHILD_NOT_FOUND, as for an unknown child",
    (childId) => {
      expect(codeFor({ ...valid, childId })).toBe("CHILD_NOT_FOUND");
    },
  );

  it.each([[""], ["x".repeat(101)], [7], [undefined]])(
    "answers book ID %j with INVALID_BOOK, as for an unknown book",
    (bookId) => {
      expect(codeFor({ ...valid, bookId })).toBe("INVALID_BOOK");
    },
  );

  it.each([
    ["a non-object", "suggest"],
    ["a note that is not text", { ...valid, note: 5 }],
    ["a suggestAnyway that is not a boolean", { ...valid, suggestAnyway: "1" }],
  ])("answers %s with INVALID_INPUT", (_label, input) => {
    expect(codeFor(input)).toBe("INVALID_INPUT");
  });

  it("check order: a long note with a well-formed (possibly foreign) child fails at the note", () => {
    expect(codeFor({ ...valid, note: "a".repeat(251) })).toBe("NOTE_TOO_LONG");
  });
});
