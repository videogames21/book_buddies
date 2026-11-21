import { describe, expect, it } from "vitest";
import {
  ageWarning,
  buildNewBookSchema,
  newBookErrorMessage,
  newBookErrorOf,
} from "./new-book-schema";
import { isReadingLevelValid, TAG_LISTS } from "./tags";

const NOW = new Date("2026-11-20T12:00:00Z");

const valid = {
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

function parse(input: Record<string, unknown>, tags = TAG_LISTS, now = NOW) {
  return buildNewBookSchema({ tags, now }).safeParse(input);
}

function errorOf(input: Record<string, unknown>) {
  const result = parse(input);
  if (result.success) throw new Error("expected a failure");
  return newBookErrorOf(result.error);
}

describe("buildNewBookSchema, main", () => {
  it("accepts a complete book and builds its match key", () => {
    const result = parse(valid);
    expect(result.success && result.data).toMatchObject({
      title: "The Moon Garden",
      author: "A. Writer",
      matchKey: "the moon garden\u001fa writer",
      year: 2001,
      isbn: "9780439023481",
      genres: ["fantasy"],
      customTags: ["cute"],
    });
  });

  it("leaves optional fields absent, including isbn itself", () => {
    const result = parse({
      ...valid,
      isbn: "",
      noIsbn: true,
      subjects: [],
      readingLevel: "",
      customTags: [],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      for (const key of ["isbn", "subjects", "readingLevel", "customTags"])
        expect(result.data).not.toHaveProperty(key);
    }
  });

  it("drops anything that is not a book field, including a status", () => {
    const result = parse({ ...valid, status: "active", admin: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("status");
      expect(result.data).not.toHaveProperty("admin");
    }
  });

  it("accepts numbers typed as text, as a form sends them", () => {
    const result = parse({ ...valid, year: "2001", ageMin: "6", ageMax: "8" });
    expect(result.success && result.data.year).toBe(2001);
  });
});

describe("4a required fields", () => {
  it.each([
    ["title", { title: "" }, "TITLE_REQUIRED"],
    ["author", { author: "  " }, "AUTHOR_REQUIRED"],
    ["year", { year: undefined }, "YEAR_REQUIRED"],
    ["genre", { genres: [] }, "TAG_REQUIRED"],
    ["mood", { moods: undefined }, "TAG_REQUIRED"],
    ["format", { format: "" }, "TAG_REQUIRED"],
    ["length", { length: undefined }, "TAG_REQUIRED"],
    ["age min", { ageMin: undefined }, "TAG_REQUIRED"],
    ["age max", { ageMax: "" }, "TAG_REQUIRED"],
    ["reading challenge", { readingChallenge: "" }, "TAG_REQUIRED"],
  ])("an empty %s is refused", (_name, change, code) => {
    expect(errorOf({ ...valid, ...change }).code).toBe(code);
  });

  it("counts a title or author that is only punctuation as empty", () => {
    expect(errorOf({ ...valid, title: " ?! " }).code).toBe("TITLE_REQUIRED");
    expect(errorOf({ ...valid, author: "..." }).code).toBe("AUTHOR_REQUIRED");
  });

  it("names the field that is missing", () => {
    const { code, field } = errorOf({ ...valid, moods: [] });
    expect(newBookErrorMessage(code, field)).toContain("mood");
  });

  it("returns the first failing field in form order", () => {
    const everythingWrong = {
      title: "",
      author: "",
      year: 1,
      isbn: "x",
      genres: [],
    };
    expect(errorOf(everythingWrong).field).toBe("title");
    expect(errorOf({ ...everythingWrong, title: "T" }).field).toBe("author");
    expect(errorOf({ ...everythingWrong, title: "T", author: "A" }).field).toBe(
      "year",
    );
    expect(errorOf({ ...valid, genres: [], moods: [], format: "" }).field).toBe(
      "genres",
    );
    expect(errorOf({ ...valid, moods: [], format: "" }).field).toBe("moods");
  });
});

describe("title and author length", () => {
  it("accepts 200 characters and refuses 201 with a message that says too long", () => {
    expect(parse({ ...valid, title: "a".repeat(200) }).success).toBe(true);
    const title = errorOf({ ...valid, title: "a".repeat(201) });
    expect(title.code).toBe("TITLE_TOO_LONG");
    expect(newBookErrorMessage(title.code, title.field)).toMatch(/too long/);
    const author = errorOf({ ...valid, author: "a".repeat(201) });
    expect(author.code).toBe("AUTHOR_TOO_LONG");
    expect(newBookErrorMessage(author.code, author.field)).toMatch(/too long/);
  });
});

describe("4b approved lists", () => {
  it.each([
    ["genres", { genres: ["fantasy", "romance"] }],
    ["subjects", { subjects: ["cooking"] }],
    ["moods", { moods: ["sad"] }],
    ["format", { format: "magazine" }],
    ["length", { length: "epic" }],
    ["readingChallenge", { readingChallenge: "hard" }],
  ])(
    "a %s value off its list is INVALID_TAG naming the list",
    (field, change) => {
      const error = errorOf({ ...valid, ...change });
      expect(error).toEqual({ code: "INVALID_TAG", field });
    },
  );

  it("does not check a custom tag against any list", () => {
    expect(parse({ ...valid, customTags: ["romance"] }).success).toBe(true);
  });

  it("accepts a value added to a list with no other change", () => {
    const withNewGenre = {
      ...TAG_LISTS,
      genres: [...TAG_LISTS.genres, "poetry"],
    };
    expect(errorOf({ ...valid, genres: ["poetry"] }).code).toBe("INVALID_TAG");
    expect(parse({ ...valid, genres: ["poetry"] }, withNewGenre).success).toBe(
      true,
    );
  });
});

describe("4c year, ages and reading level", () => {
  it.each([[999], [12345], [1399], [2027], ["20x1"], [2001.5]])(
    "year %s is INVALID_YEAR",
    (year) => {
      expect(errorOf({ ...valid, year }).code).toBe("INVALID_YEAR");
    },
  );

  it("accepts the earliest year and this year", () => {
    expect(parse({ ...valid, year: 1400 }).success).toBe(true);
    expect(parse({ ...valid, year: 2026 }).success).toBe(true);
  });

  it("checks the year against the date it is given, not the real clock", () => {
    expect(parse({ ...valid, year: 2026 }, TAG_LISTS, NOW).success).toBe(true);
    expect(
      parse(
        { ...valid, year: 2026 },
        TAG_LISTS,
        new Date("2025-06-01T00:00:00Z"),
      ).success,
    ).toBe(false);
  });

  it("refuses an age min above the age max, and accepts equal ages", () => {
    expect(errorOf({ ...valid, ageMin: 9, ageMax: 8 }).code).toBe(
      "INVALID_AGE_RANGE",
    );
    expect(parse({ ...valid, ageMin: 8, ageMax: 8 }).success).toBe(true);
  });

  it("refuses an age that is negative or not whole", () => {
    expect(errorOf({ ...valid, ageMin: -1 }).code).toBe("INVALID_AGE");
    expect(errorOf({ ...valid, ageMax: 8.5 }).code).toBe("INVALID_AGE");
  });

  it("refuses a reading level that is on no accepted scale", () => {
    expect(errorOf({ ...valid, readingLevel: "very hard" }).code).toBe(
      "INVALID_READING_LEVEL",
    );
  });
});

describe("isReadingLevelValid", () => {
  it.each([
    "650",
    "650L",
    "650l",
    "BR120",
    "ad500",
    "GN300",
    "NC800",
    "0.0",
    "3.5",
    "13.0",
    "12",
    "80",
    "A",
    "z",
    "2-4",
    "K-2",
    "k–2",
    "kindergarten-1",
    "pre-school-1",
    "3-3",
    "11 - 12",
  ])("accepts %s", (value) => {
    expect(isReadingLevelValid(value)).toBe(true);
  });

  it.each([
    "BR120L", // a prefix never takes the L
    "XX120",
    "13.1",
    "AB",
    "4-2", // first grade above the second
    "2-13",
    "2-",
    "-2",
    "L650",
    "",
  ])("refuses %s", (value) => {
    expect(isReadingLevelValid(value)).toBe(false);
  });
});

describe("4d, 4e, 4g custom tags", () => {
  it("stores Friend, ' friend ' and FRIEND as one tag", () => {
    const result = parse({
      ...valid,
      customTags: ["Friend", " friend ", "FRIEND"],
    });
    expect(result.success && result.data.customTags).toEqual(["friend"]);
  });

  it("refuses an empty custom tag and one of 31 characters; accepts 30", () => {
    expect(errorOf({ ...valid, customTags: [" "] }).code).toBe(
      "INVALID_CUSTOM_TAG",
    );
    expect(errorOf({ ...valid, customTags: ["a".repeat(31)] }).code).toBe(
      "INVALID_CUSTOM_TAG",
    );
    expect(parse({ ...valid, customTags: ["a".repeat(30)] }).success).toBe(
      true,
    );
  });

  const tags = (count: number) =>
    Array.from({ length: count }, (_, i) => `tag ${String(i)}`);

  it("accepts ten distinct tags and refuses eleven", () => {
    expect(parse({ ...valid, customTags: tags(10) }).success).toBe(true);
    expect(errorOf({ ...valid, customTags: tags(11) }).code).toBe(
      "TOO_MANY_CUSTOM_TAGS",
    );
  });

  it("counts after normalization: twelve entries that make ten tags pass", () => {
    const entries = [...tags(10), "TAG 0", " tag 1 "];
    const result = parse({ ...valid, customTags: entries });
    expect(result.success && result.data.customTags).toHaveLength(10);
  });
});

describe("4f, 4h ISBN", () => {
  it("stores a hyphenated ISBN-13, an ISBN-10 and an ISBN-10 ending in X as ISBN-13", () => {
    for (const [isbn, stored] of [
      ["978-0-439-02348-1", "9780439023481"],
      ["0439023483", "9780439023481"],
      ["080442957X", "9780804429573"],
    ]) {
      const result = parse({ ...valid, isbn });
      expect(result.success && result.data.isbn).toBe(stored);
    }
  });

  it("refuses a wrong check digit or length", () => {
    expect(errorOf({ ...valid, isbn: "9780439023482" }).code).toBe(
      "INVALID_ISBN",
    );
    expect(errorOf({ ...valid, isbn: "12345" }).code).toBe("INVALID_ISBN");
  });

  it("requires the choice: an ISBN or the box, never both and never neither", () => {
    expect(errorOf({ ...valid, isbn: "", noIsbn: false }).code).toBe(
      "ISBN_CHOICE_REQUIRED",
    );
    expect(errorOf({ ...valid, isbn: undefined, noIsbn: undefined }).code).toBe(
      "ISBN_CHOICE_REQUIRED",
    );
    expect(errorOf({ ...valid, isbn: valid.isbn, noIsbn: true }).code).toBe(
      "ISBN_CHOICE_REQUIRED",
    );
    expect(parse({ ...valid, isbn: "", noIsbn: true }).success).toBe(true);
  });
});

describe("4i ageWarning", () => {
  it("warns for an age above 21 or a min below 0, and never refuses", () => {
    expect(ageWarning(6, 25)).toMatch(/outside 0 to 21/);
    expect(ageWarning(-1, 5)).toMatch(/outside 0 to 21/);
    expect(parse({ ...valid, ageMin: 6, ageMax: 25 }).success).toBe(true);
  });

  it("gives no warning inside 0 to 21", () => {
    expect(ageWarning(0, 21)).toBeNull();
    expect(ageWarning(6, 8)).toBeNull();
  });

  it("still refuses an age min above the max", () => {
    expect(errorOf({ ...valid, ageMin: 30, ageMax: 25 }).code).toBe(
      "INVALID_AGE_RANGE",
    );
  });
});
