import { describe, expect, it } from "vitest";
import { buildNewBookSchema, newBookErrorOf } from "./new-book-schema";
import { isReadingLevelValid, TAG_LISTS } from "./tags";

// Field order, input types and bounds for the Add Book schema (UC-ADM-add-content 4a to 4h).
// The main flows are in new-book-schema.test.ts.

const NOW = new Date("2026-11-20T12:00:00Z");

const valid: Record<string, unknown> = {
  title: "The Moon Garden",
  author: "A. Writer",
  year: 2001,
  isbn: "9780439023481",
  noIsbn: false,
  genres: ["fantasy"],
  subjects: ["animals"],
  moods: ["calm"],
  format: "picture book",
  length: "quick read",
  ageMin: 6,
  ageMax: 8,
  readingChallenge: "reading independently",
  readingLevel: "650L",
  customTags: ["cute"],
};

function parse(input: Record<string, unknown>, now = NOW) {
  return buildNewBookSchema({ tags: TAG_LISTS, now }).safeParse(input);
}

function errorOf(input: Record<string, unknown>) {
  const result = parse(input);
  if (result.success) throw new Error("expected a failure");
  return newBookErrorOf(result.error);
}

describe("form order across every field", () => {
  const broken: Record<string, unknown> = {
    title: "",
    author: "",
    year: 1,
    isbn: "x",
    noIsbn: false,
    genres: ["nope"],
    subjects: ["nope"],
    moods: ["nope"],
    format: "nope",
    length: "nope",
    ageMin: "x",
    ageMax: "x",
    readingChallenge: "nope",
    readingLevel: "nope",
    customTags: [" "],
  };
  const order = [
    "title",
    "author",
    "year",
    "isbn",
    "genres",
    "subjects",
    "moods",
    "format",
    "length",
    "ageMin",
    "ageMax",
    "readingChallenge",
    "readingLevel",
    "customTags",
  ];

  it("names the earliest broken field, one field at a time", () => {
    const input = { ...broken };
    for (const field of order) {
      expect(errorOf(input).field).toBe(field);
      // Repair this field so the next one is the earliest broken.
      if (field === "isbn") Object.assign(input, { isbn: "", noIsbn: true });
      else input[field] = valid[field];
    }
    expect(parse(input).success).toBe(true);
  });

  it("checks the age range after both ages, and names the age max", () => {
    expect(errorOf({ ...valid, ageMin: 9, ageMax: 8 })).toEqual({
      code: "INVALID_AGE_RANGE",
      field: "ageMax",
    });
    expect(errorOf({ ...valid, ageMin: 9, ageMax: "x" }).code).toBe(
      "INVALID_AGE",
    );
  });
});

describe("input types and bounds", () => {
  it.each([
    ["genres as a string", { genres: "fantasy" }, "genres"],
    ["a genre that is not a string", { genres: [1] }, "genres"],
    ["subjects as a string", { subjects: "animals" }, "subjects"],
    ["moods as an object", { moods: { calm: true } }, "moods"],
    ["a format that is a list", { format: ["picture book"] }, "format"],
    ["a length that is a number", { length: 1 }, "length"],
    [
      "a reading challenge that is a list",
      { readingChallenge: ["reading independently"] },
      "readingChallenge",
    ],
  ])("%s is INVALID_TAG", (_name, change, field) => {
    expect(errorOf({ ...valid, ...change })).toEqual({
      code: "INVALID_TAG",
      field,
    });
  });

  it.each([
    ["customTags as a string", { customTags: "cute" }],
    ["a custom tag that is a number", { customTags: [1] }],
  ])("%s is INVALID_CUSTOM_TAG", (_name, change) => {
    expect(errorOf({ ...valid, ...change }).code).toBe("INVALID_CUSTOM_TAG");
  });

  it("refuses a title, author or year that is not the right type", () => {
    expect(errorOf({ ...valid, title: 5 }).code).toBe("TITLE_REQUIRED");
    expect(errorOf({ ...valid, author: [] }).code).toBe("AUTHOR_REQUIRED");
    expect(errorOf({ ...valid, year: true }).code).toBe("INVALID_YEAR");
  });

  it("stores a repeated genre or mood once", () => {
    const result = parse({
      ...valid,
      genres: ["fantasy", "fantasy"],
      moods: ["calm", "calm", "exciting"],
    });
    expect(result.success && result.data.genres).toEqual(["fantasy"]);
    expect(result.success && result.data.moods).toEqual(["calm", "exciting"]);
  });

  it("stores the title and author trimmed with spaces collapsed", () => {
    const result = parse({
      ...valid,
      title: "  The   Moon  Garden ",
      author: " A.   Writer ",
    });
    expect(result.success && result.data.title).toBe("The Moon Garden");
    expect(result.success && result.data.author).toBe("A. Writer");
  });

  it("stores a reading level trimmed, and treats a blank one as none", () => {
    const padded = parse({ ...valid, readingLevel: " 650L " });
    expect(padded.success && padded.data.readingLevel).toBe("650L");
    const blank = parse({ ...valid, readingLevel: "   " });
    expect(blank.success && blank.data).not.toHaveProperty("readingLevel");
  });

  it("refuses a reading level that is not text", () => {
    expect(errorOf({ ...valid, readingLevel: 650 }).code).toBe(
      "INVALID_READING_LEVEL",
    );
  });

  it("accepts the largest age the Catalog can store and refuses one above it", () => {
    expect(parse({ ...valid, ageMin: 0, ageMax: 2_147_483_647 }).success).toBe(
      true,
    );
    expect(errorOf({ ...valid, ageMax: 2_147_483_648 }).code).toBe(
      "INVALID_AGE",
    );
  });

  it("accepts a min age of 0", () => {
    expect(parse({ ...valid, ageMin: 0 }).success).toBe(true);
  });

  it("treats a whitespace-only ISBN with the box ticked as no ISBN", () => {
    const result = parse({ ...valid, isbn: "   ", noIsbn: true });
    expect(result.success && result.data).not.toHaveProperty("isbn");
  });

  it("counts the box only when it is exactly true", () => {
    expect(errorOf({ ...valid, isbn: "", noIsbn: "true" }).code).toBe(
      "ISBN_CHOICE_REQUIRED",
    );
  });

  it("measures the custom tag length after normalization", () => {
    expect(
      parse({ ...valid, customTags: [`  ${"a".repeat(30)}  `] }).success,
    ).toBe(true);
  });
});

describe("length is counted in characters, not UTF-16 units", () => {
  it("accepts 200 emoji and refuses 201 in a title, an author and a custom tag", () => {
    const emoji = (count: number) => "😀".repeat(count);
    expect(
      parse({ ...valid, title: emoji(200), author: emoji(200) }).success,
    ).toBe(true);
    expect(errorOf({ ...valid, title: emoji(201) }).code).toBe(
      "TITLE_TOO_LONG",
    );
    expect(errorOf({ ...valid, author: emoji(201) }).code).toBe(
      "AUTHOR_TOO_LONG",
    );
    expect(parse({ ...valid, customTags: [emoji(30)] }).success).toBe(true);
    expect(errorOf({ ...valid, customTags: [emoji(31)] }).code).toBe(
      "INVALID_CUSTOM_TAG",
    );
  });
});

describe("the year is checked in UTC", () => {
  it("accepts a new UTC year on its first instant, not the instant before", () => {
    const newYear = new Date("2027-01-01T00:00:00Z");
    expect(parse({ ...valid, year: 2027 }, newYear).success).toBe(true);
    expect(parse({ ...valid, year: 2028 }, newYear).success).toBe(false);
    const lastInstant = new Date("2026-12-31T23:59:59Z");
    expect(parse({ ...valid, year: 2027 }, lastInstant).success).toBe(false);
    expect(parse({ ...valid, year: 2026 }, lastInstant).success).toBe(true);
  });
});

describe("isReadingLevelValid, other scales", () => {
  it.each(["0", "1", "81", "9999", "1.0"])("accepts %s", (value) => {
    expect(isReadingLevelValid(value)).toBe(true);
  });
  it.each(["10000", "1.55", "14.0", "A1"])("refuses %s", (value) => {
    expect(isReadingLevelValid(value)).toBe(false);
  });
});
