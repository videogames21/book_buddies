import { describe, expect, it } from "vitest";
import { createChildSchema, fieldErrorsOf } from "./schema";
import { GRADES } from "@/server/accounts-family/grades";

const valid = {
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
    const result = createChildSchema.parse({
      ...valid,
      username: "  Star_Reader ",
    });
    expect(result.username).toBe("star_reader");
  });

  it("accepts a child with no reading level (FR-ONB-level-optional)", () => {
    const withoutLevel = { ...valid, readingLevel: undefined };
    expect(createChildSchema.safeParse(withoutLevel).success).toBe(true);
  });

  it("4a: accepts letters and digits only, never collects a real name", () => {
    for (const nickname of ["Star7", "123"]) {
      expect(errorsFor({ ...valid, nickname })).toEqual({});
    }
    expect(errorsFor({ ...valid, nickname: " " }).nickname).toBe(
      "NICKNAME_REQUIRED",
    );
    for (const nickname of ["Star Fish", "Star!", "étoile", "star_fish"]) {
      expect(errorsFor({ ...valid, nickname }).nickname).toBe(
        "INVALID_NICKNAME",
      );
    }
    expect(
      createChildSchema.parse({
        ...valid,
        name: "Discarded",
        realName: "Discarded",
      }),
    ).not.toHaveProperty("name");
    expect(
      createChildSchema.parse({ ...valid, realName: "Discarded" }),
    ).not.toHaveProperty("realName");
  });

  it("4i: counts trimmed Unicode characters and rejects notes longer than 250", () => {
    expect(
      createChildSchema.parse({
        ...valid,
        note: "  " + "🌟".repeat(250) + "  ",
      }).note,
    ).toBe("🌟".repeat(250));
    expect(errorsFor({ ...valid, note: "x".repeat(251) }).note).toBe(
      "NOTE_TOO_LONG",
    );
    expect(createChildSchema.parse({ ...valid, note: "   " }).note).toBe("");
  });

  it("4h: refuses contact information and the nickname anywhere in the username", () => {
    expect(errorsFor({ ...valid, username: "reader123456" })).toEqual({});
    for (const username of [
      "reader@example.test",
      "reader.name",
      "reader1234567",
    ]) {
      expect(errorsFor({ ...valid, username }).username).toBe(
        "INVALID_USERNAME",
      );
    }
    expect(errorsFor({ ...valid, username: "mySTARFISH12" }).username).toBe(
      "USERNAME_CONTAINS_NICKNAME",
    );
  });

  it("refuses a nickname over 20 characters", () => {
    expect(errorsFor({ ...valid, nickname: "a".repeat(21) }).nickname).toBe(
      "INVALID_NICKNAME",
    );
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
    for (const grade of GRADES) {
      expect(errorsFor({ ...valid, grade }), grade).toEqual({});
    }
  });

  it("4f: refuses an empty username", () => {
    expect(errorsFor({ ...valid, username: "  " }).username).toBe(
      "USERNAME_REQUIRED",
    );
    expect(errorsFor({ ...valid, username: undefined }).username).toBe(
      "USERNAME_REQUIRED",
    );
  });

  it("4h: refuses a username breaking the format rules", () => {
    for (const username of ["abc", "a".repeat(20)]) {
      expect(errorsFor({ ...valid, username })).toEqual({});
    }
    for (const username of [
      "ab",
      "a".repeat(21),
      "star reader",
      "star-reader",
      "stär",
    ]) {
      expect(errorsFor({ ...valid, username }).username).toBe(
        "INVALID_USERNAME",
      );
    }
  });

  it("4d: accepts each scale's format", () => {
    const accepted = [
      ["lexile", "650L"],
      ["lexile", "BR200L"],
      ["lexile", "820"],
      ["atos", "3.5"],
      ["atos", "13.0"],
      ["atos", "0"],
      ["dra", "A"],
      ["dra", "80"],
      ["grl", "m"],
      ["gradeRange", "2–3"],
      ["gradeRange", "K-1"],
      ["gradeRange", "4-4"],
    ];
    for (const [scale, value] of accepted) {
      expect(
        errorsFor({ ...valid, readingLevel: { scale, value } }),
        `${scale} ${value}`,
      ).toEqual({});
    }
  });

  it("4d: refuses a value that does not match its scale, or an unknown scale", () => {
    const refused = [
      ["lexile", "six hundred"],
      ["atos", "13.5"],
      ["atos", "3.25"],
      ["dra", "81"],
      ["dra", "0"],
      ["grl", "AB"],
      ["gradeRange", "3-2"],
      ["gradeRange", "2-13"],
      ["gradeRange", "2"],
      ["fountasPinnell", "M"],
      ["lexile", ""],
    ];
    for (const [scale, value] of refused) {
      expect(
        errorsFor({ ...valid, readingLevel: { scale, value } }).readingLevel,
        `${scale} ${value}`,
      ).toBe("INVALID_READING_LEVEL");
    }
  });

  it("refuses a missing or unknown avatar", () => {
    expect(errorsFor({ ...valid, avatar: undefined }).avatar).toBe(
      "INVALID_AVATAR",
    );
    expect(
      errorsFor({ ...valid, avatar: "https://example.test/photo.jpg" }).avatar,
    ).toBe("INVALID_AVATAR");
  });

  it("strips fields the form does not have, such as a family ID", () => {
    expect(
      createChildSchema.parse({ ...valid, familyId: "someone-else" }),
    ).not.toHaveProperty("familyId");
  });
});
