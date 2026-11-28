import { describe, expect, it } from "vitest";
import { firstErrorCode, removeBookSchema } from "./schema";

// UC-SHLF-parent-remove-book step 4 and the API contract's input codes. Invented values.
const base = { childId: "child-1", bookId: "book-1", confirmed: true };

function codeOf(input: unknown) {
  const result = removeBookSchema.safeParse(input);
  return result.success ? "ok" : firstErrorCode(result.error);
}

describe("removeBookSchema (UC-SHLF-parent-remove-book)", () => {
  it("accepts the two IDs with the confirmation, and keeps nothing else", () => {
    expect(removeBookSchema.parse({ ...base, familyId: "f-1" })).toEqual(base);
  });

  it("confirmation: missing, false, 1 or the string 'true' is NOT_CONFIRMED", () => {
    for (const confirmed of [undefined, false, "true", 1]) {
      expect(codeOf({ ...base, confirmed })).toBe("NOT_CONFIRMED");
    }
  });

  it("a missing, empty or non-string ID, or a non-object input, is INVALID_INPUT", () => {
    for (const bad of [
      { ...base, childId: undefined },
      { ...base, bookId: "" },
      { ...base, childId: { $gt: "" } },
      { ...base, bookId: 7, confirmed: false },
      null,
      "child-1",
    ]) {
      expect(codeOf(bad)).toBe("INVALID_INPUT");
    }
  });
});
