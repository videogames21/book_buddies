import { describe, expect, it } from "vitest";
import {
  firstErrorCode,
  MAX_FAVORITE_BOOKS,
  readingProfileSchema,
} from "./schema";

const base = { childId: "child-1", interests: [], favoriteBookIds: [] };

describe("readingProfileSchema (UC-REC-kid-onboarding)", () => {
  it("accepts no interests and no books (steps 3 and 4)", () => {
    expect(readingProfileSchema.safeParse(base).success).toBe(true);
  });

  it("3: a value not on the interest list is INVALID_INTEREST", () => {
    const result = readingProfileSchema.safeParse({
      ...base,
      interests: ["fantasy", "my-own-text"],
    });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(firstErrorCode(result.error)).toBe("INVALID_INTEREST");
  });

  it("collapses duplicate interests and duplicate books", () => {
    const result = readingProfileSchema.parse({
      ...base,
      interests: ["fantasy", "fantasy", "mystery"],
      favoriteBookIds: ["a", "a", "b"],
    });
    expect(result.interests).toEqual(["fantasy", "mystery"]);
    expect(result.favoriteBookIds).toEqual(["a", "b"]);
  });

  it("4a: more than the cap of books is TOO_MANY_BOOKS, exactly the cap is fine", () => {
    const books = (n: number) =>
      Array.from({ length: n }, (_, i) => `book-${String(i)}`);
    expect(
      readingProfileSchema.safeParse({
        ...base,
        favoriteBookIds: books(MAX_FAVORITE_BOOKS),
      }).success,
    ).toBe(true);
    const result = readingProfileSchema.safeParse({
      ...base,
      favoriteBookIds: books(MAX_FAVORITE_BOOKS + 1),
    });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(firstErrorCode(result.error)).toBe("TOO_MANY_BOOKS");
  });

  it("duplicates do not count towards the cap", () => {
    const result = readingProfileSchema.safeParse({
      ...base,
      favoriteBookIds: Array.from({ length: 15 }, () => "same-book"),
    });
    expect(result.success).toBe(true);
  });

  it("refuses a non-string book ID and unknown fields are dropped", () => {
    const bad = readingProfileSchema.safeParse({
      ...base,
      favoriteBookIds: [1],
    });
    expect(bad.success).toBe(false);
    const parsed = readingProfileSchema.parse({
      ...base,
      age: 8,
      familyId: "other",
    });
    expect(parsed).not.toHaveProperty("age");
    expect(parsed).not.toHaveProperty("familyId");
  });
});
