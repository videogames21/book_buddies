import { describe, expect, it } from "vitest";
import { reactToRecommendationSchema } from "./schema";

// UC-REC-kid-review input (design/rec.md, Tests). Invented IDs only.

const BOOK_ID = "book-1";

const passes = (input: unknown) =>
  reactToRecommendationSchema.safeParse(input).success;

describe("reactToRecommendationSchema (UC-REC-kid-review input)", () => {
  it.each([
    [{ bookId: BOOK_ID, reaction: "yes" }],
    [{ bookId: BOOK_ID, reaction: "maybeLater" }],
    [{ bookId: BOOK_ID, reaction: "notForMe" }],
    [{ bookId: BOOK_ID, reaction: "notForMe", declineReason: "tooHard" }],
  ])("accepts %j", (input) => {
    expect(passes(input)).toBe(true);
  });

  it("accepts every decline reason with Not for me", () => {
    for (const declineReason of [
      "notInterested",
      "tooEasy",
      "tooHard",
      "notMyStyle",
      "other",
    ]) {
      expect(
        passes({ bookId: BOOK_ID, reaction: "notForMe", declineReason }),
      ).toBe(true);
    }
  });

  it("passes a malformed book ID, which the server answers BOOK_NOT_IN_LIST", () => {
    expect(passes({ bookId: "not an id ✨", reaction: "yes" })).toBe(true);
  });

  it.each([["love"], ["Yes"], [""], [null]])(
    "refuses the unknown reaction %j",
    (reaction) => {
      expect(passes({ bookId: BOOK_ID, reaction })).toBe(false);
    },
  );

  it.each([["boring"], ["TooHard"], [""], [null]])(
    "refuses the unknown reason %j",
    (declineReason) => {
      expect(
        passes({ bookId: BOOK_ID, reaction: "notForMe", declineReason }),
      ).toBe(false);
    },
  );

  // Review of #152: a reason sent with Yes or Maybe later is refused, not dropped.
  it.each([["yes"], ["maybeLater"]])(
    "refuses a decline reason sent with %s",
    (reaction) => {
      expect(
        passes({ bookId: BOOK_ID, reaction, declineReason: "tooEasy" }),
      ).toBe(false);
    },
  );

  it.each([
    [{ reaction: "yes" }],
    [{ bookId: BOOK_ID }],
    [{}],
    [undefined],
    [null],
  ])("refuses the missing field in %j", (input) => {
    expect(passes(input)).toBe(false);
  });

  it.each([
    [{ bookId: 42, reaction: "yes" }],
    [{ bookId: [BOOK_ID], reaction: "yes" }],
    [{ bookId: BOOK_ID, reaction: 1 }],
    [{ bookId: BOOK_ID, reaction: "notForMe", declineReason: 3 }],
    ["book-1"],
  ])("refuses the non-string in %j", (input) => {
    expect(passes(input)).toBe(false);
  });

  it("refuses an empty or over-long book ID", () => {
    expect(passes({ bookId: "", reaction: "yes" })).toBe(false);
    expect(passes({ bookId: "a".repeat(101), reaction: "yes" })).toBe(false);
    expect(passes({ bookId: "a".repeat(100), reaction: "yes" })).toBe(true);
  });

  it("refuses a child ID sent by the caller (the action takes no child ID)", () => {
    expect(
      passes({ bookId: BOOK_ID, reaction: "yes", childId: "another-child" }),
    ).toBe(false);
  });
});
