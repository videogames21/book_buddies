import { describe, expect, it } from "vitest";
import { createChildSchema, fieldErrorsOf } from "./schema";

const valid = {
  name: "Invented Child",
  nickname: "Starfish",
  age: 8,
  grade: "3",
  username: "Star_Reader",
  readingLevel: { scale: "lexile", value: "650L" },
  avatar: "1",
};

function errorsFor(input: Record<string, unknown>) {
  const result = createChildSchema.safeParse(input);
  return result.success ? {} : fieldErrorsOf(result.error);
}

describe("createChildSchema", () => {
  it("accepts a complete child and lowercases and trims the username", () => {
    const result = createChildSchema.parse({ ...valid, username: "  Star_Reader " });
    expect(result.username).toBe("star_reader");
  });

  it("accepts a child with no reading level (FR-ONB-level-optional)", () => {
    const { readingLevel: _skipped, ...withoutLevel } = valid;
    expect(createChildSchema.safeParse(withoutLevel).success).toBe(true);
  });

  it("4a: refuses an empty or blank name", () => {
    expect(errorsFor({ ...valid, name: "" }).name).toBe("NAME_REQUIRED");
    expect(errorsFor({ ...valid, name: "   " }).name).toBe("NAME_REQUIRED");
    expect(errorsFor({ ...valid, name: undefined }).name).toBe("NAME_REQUIRED");
  });

  it("4i: refuses an empty nickname, or one equal to the name ignoring case and spaces", () => {
    expect(errorsFor({ ...valid, nickname: " " }).nickname).toBe("NICKNAME_REQUIRED");
    expect(errorsFor({ ...valid, nickname: "  invented CHILD " }).nickname).toBe("NICKNAME_MATCHES_NAME");
  });

  it("refuses a nickname over 20 characters", () => {
    expect(errorsFor({ ...valid, nickname: "a".repeat(21) }).nickname).toBe("INVALID_NICKNAME");
    expect(errorsFor({ ...valid, nickname: "a".repeat(20) })).toEqual({});
  });

  it("4b: accepts an age outside 6–11 but inside 3–17", () => {
    expect(errorsFor({ ...valid, age: 3 })).toEqual({});
    expect(errorsFor({ ...valid, age: 17 })).toEqual({});
  });

  it("4b, bounds: refuses an age that is not a whole number in 3–17", () => {
    for (const age of [2, 18, 7.5, Number.NaN, "8", undefined]) {
      expect(errorsFor({ ...valid, age }).age).toBe("INVALID_AGE");
    }
  });

  it("4c: refuses a grade not in the grade list", () => {
    for (const grade of ["13", "Pre-K", "", undefined]) {
      expect(errorsFor({ ...valid, grade }).grade).toBe("INVALID_GRADE");
    }
    expect(errorsFor({ ...valid, grade: "K" })).toEqual({});
  });

  it("4f: refuses an empty username", () => {
    expect(errorsFor({ ...valid, username: "  " }).username).toBe("USERNAME_REQUIRED");
    expect(errorsFor({ ...valid, username: undefined }).username).toBe("USERNAME_REQUIRED");
  });

  it("4h: refuses a username breaking the format rules", () => {
    for (const username of ["ab", "a".repeat(21), "star reader", "star-reader", "stär"]) {
      expect(errorsFor({ ...valid, username }).username).toBe("INVALID_USERNAME");
    }
  });

  it("4d: accepts each scale's format", () => {
    const accepted = [
      ["lexile", "650L"], ["lexile", "BR200L"], ["lexile", "820"],
      ["atos", "3.5"], ["atos", "13.0"], ["atos", "0"],
      ["dra", "A"], ["dra", "80"],
      ["grl", "m"],
      ["gradeRange", "2–3"], ["gradeRange", "K-1"], ["gradeRange", "4-4"],
    ];
    for (const [scale, value] of accepted) {
      expect(errorsFor({ ...valid, readingLevel: { scale, value } }), `${scale} ${value}`).toEqual({});
    }
  });

  it("4d: refuses a value that does not match its scale, or an unknown scale", () => {
    const refused = [
      ["lexile", "six hundred"], ["atos", "13.5"], ["atos", "3.25"],
      ["dra", "81"], ["dra", "0"], ["grl", "AB"],
      ["gradeRange", "3-2"], ["gradeRange", "2-13"], ["gradeRange", "2"],
      ["fountasPinnell", "M"], ["lexile", ""],
    ];
    for (const [scale, value] of refused) {
      expect(errorsFor({ ...valid, readingLevel: { scale, value } }).readingLevel, `${scale} ${value}`).toBe(
        "INVALID_READING_LEVEL",
      );
    }
  });

  it("refuses a missing or unknown avatar", () => {
    expect(errorsFor({ ...valid, avatar: undefined }).avatar).toBe("INVALID_AVATAR");
    expect(errorsFor({ ...valid, avatar: "https://example.test/photo.jpg" }).avatar).toBe("INVALID_AVATAR");
  });

  it("strips fields the form does not have, such as a family ID", () => {
    expect(createChildSchema.parse({ ...valid, familyId: "someone-else" })).not.toHaveProperty("familyId");
  });
});
