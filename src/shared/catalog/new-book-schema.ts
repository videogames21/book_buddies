import { z } from "zod";
import {
  buildMatchKey,
  normalizeCustomTag,
  normalizeIsbn,
  normalizeText,
} from "./normalize";
import { isReadingLevelValid, LIMITS, type TagLists } from "./tags";

// The one schema for the Add Book form and the addCatalogBook action (§8.2.5, design/adm.md).
// Pure: the action passes the server's now() and the browser passes its own date for an
// early check only. The server's check is the one that counts.
//
// The schema reads the request field by field in form order and stops at the first
// failure, so the code it returns is always the first failing field in form order. It
// builds its output from the known fields only, so anything else in the request, including
// a `status`, is dropped.

export type NewBookField =
  | "title"
  | "author"
  | "year"
  | "isbn"
  | "genres"
  | "subjects"
  | "moods"
  | "format"
  | "length"
  | "ageMin"
  | "ageMax"
  | "readingChallenge"
  | "readingLevel"
  | "customTags";

export type NewBookErrorCode =
  | "TITLE_REQUIRED"
  | "TITLE_TOO_LONG"
  | "AUTHOR_REQUIRED"
  | "AUTHOR_TOO_LONG"
  | "YEAR_REQUIRED"
  | "INVALID_YEAR"
  | "ISBN_CHOICE_REQUIRED"
  | "INVALID_ISBN"
  | "TAG_REQUIRED"
  | "INVALID_TAG"
  | "INVALID_AGE"
  | "INVALID_AGE_RANGE"
  | "INVALID_READING_LEVEL"
  | "INVALID_CUSTOM_TAG"
  | "TOO_MANY_CUSTOM_TAGS";

/** What the action saves: validated, normalized, with optional fields absent. */
export type NewBook = {
  title: string;
  author: string;
  matchKey: string;
  year: number;
  isbn?: string;
  genres: string[];
  subjects?: string[];
  moods: string[];
  format: string;
  length: string;
  ageMin: number;
  ageMax: number;
  readingChallenge: string;
  readingLevel?: string;
  customTags?: string[];
};

class Invalid extends Error {
  constructor(
    readonly code: NewBookErrorCode,
    readonly field: NewBookField,
  ) {
    super(code);
  }
}

const isEmpty = (value: unknown) =>
  value === undefined || value === null || value === "";

function readText(
  value: unknown,
  field: "title" | "author",
  maxLength: number,
): string {
  const required = field === "title" ? "TITLE_REQUIRED" : "AUTHOR_REQUIRED";
  const tooLong = field === "title" ? "TITLE_TOO_LONG" : "AUTHOR_TOO_LONG";
  if (typeof value !== "string") throw new Invalid(required, field);
  const text = value.trim().replace(/\s+/gu, " ");
  // A title or author that is empty once normalized (only punctuation) counts as empty.
  if (normalizeText(text) === "") throw new Invalid(required, field);
  if (Array.from(text).length > maxLength) throw new Invalid(tooLong, field);
  return text;
}

function readWholeNumber(value: unknown): number | null {
  if (typeof value === "number")
    return Number.isInteger(value) && value >= 0 ? value : null;
  if (typeof value === "string" && /^\d+$/u.test(value.trim()))
    return Number(value.trim());
  return null;
}

function readYear(value: unknown, now: Date): number {
  if (isEmpty(value)) throw new Invalid("YEAR_REQUIRED", "year");
  const year = readWholeNumber(value);
  const isFourDigits = year !== null && year >= 1000 && year <= 9999;
  if (
    !isFourDigits ||
    year < LIMITS.earliestYear ||
    year > now.getUTCFullYear()
  )
    throw new Invalid("INVALID_YEAR", "year");
  return year;
}

function readIsbn(isbn: unknown, noIsbn: unknown): string | undefined {
  const typed = typeof isbn === "string" ? isbn.trim() : "";
  const hasNone = noIsbn === true;
  // Exactly one of "an ISBN is typed" and "the box is ticked" must hold (4h).
  if ((typed === "") === !hasNone)
    throw new Invalid("ISBN_CHOICE_REQUIRED", "isbn");
  if (typed === "") return undefined;
  const normalized = normalizeIsbn(typed);
  if (normalized === null) throw new Invalid("INVALID_ISBN", "isbn");
  return normalized;
}

/** Optional: none gives undefined; otherwise each value must be on its approved list. */
function readTagList(
  value: unknown,
  field: NewBookField,
  list: readonly string[],
): string[] | undefined {
  if (isEmpty(value) || (Array.isArray(value) && value.length === 0))
    return undefined;
  if (!Array.isArray(value)) throw new Invalid("INVALID_TAG", field);
  for (const entry of value) {
    if (typeof entry !== "string" || !list.includes(entry))
      throw new Invalid("INVALID_TAG", field);
  }
  return [...new Set(value as string[])];
}

/** Required: at least one value, each on its approved list. */
function readRequiredTagList(
  value: unknown,
  field: NewBookField,
  list: readonly string[],
): string[] {
  const values = readTagList(value, field, list);
  if (values === undefined) throw new Invalid("TAG_REQUIRED", field);
  return values;
}

function readSingleTag(
  value: unknown,
  field: NewBookField,
  list: readonly string[],
): string {
  if (isEmpty(value)) throw new Invalid("TAG_REQUIRED", field);
  if (typeof value !== "string" || !list.includes(value))
    throw new Invalid("INVALID_TAG", field);
  return value;
}

function readAge(value: unknown, field: "ageMin" | "ageMax"): number {
  if (isEmpty(value)) throw new Invalid("TAG_REQUIRED", field);
  const age = readWholeNumber(value);
  if (age === null || age > LIMITS.ageStorageMax)
    throw new Invalid("INVALID_AGE", field);
  return age;
}

function readReadingLevel(value: unknown): string | undefined {
  if (isEmpty(value) || (typeof value === "string" && value.trim() === ""))
    return undefined;
  if (typeof value !== "string" || !isReadingLevelValid(value))
    throw new Invalid("INVALID_READING_LEVEL", "readingLevel");
  return value.trim();
}

function readCustomTags(value: unknown): string[] | undefined {
  if (isEmpty(value) || (Array.isArray(value) && value.length === 0))
    return undefined;
  if (!Array.isArray(value))
    throw new Invalid("INVALID_CUSTOM_TAG", "customTags");
  const tags = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== "string")
      throw new Invalid("INVALID_CUSTOM_TAG", "customTags");
    tags.add(normalizeCustomTag(entry));
  }
  // Normalize, remove duplicates, then check length, then count (design/adm.md).
  for (const tag of tags) {
    if (tag === "" || Array.from(tag).length > LIMITS.customTagMaxLength)
      throw new Invalid("INVALID_CUSTOM_TAG", "customTags");
  }
  if (tags.size > LIMITS.customTagsPerBook)
    throw new Invalid("TOO_MANY_CUSTOM_TAGS", "customTags");
  return [...tags];
}

function parseNewBook(raw: unknown, tags: TagLists, now: Date): NewBook {
  const input = (typeof raw === "object" && raw !== null ? raw : {}) as Record<
    string,
    unknown
  >;
  const title = readText(input.title, "title", LIMITS.titleMaxLength);
  const author = readText(input.author, "author", LIMITS.authorMaxLength);
  const year = readYear(input.year, now);
  const isbn = readIsbn(input.isbn, input.noIsbn);
  const genres = readRequiredTagList(input.genres, "genres", tags.genres);
  const subjects = readTagList(input.subjects, "subjects", tags.subjects);
  const moods = readRequiredTagList(input.moods, "moods", tags.moods);
  const format = readSingleTag(input.format, "format", tags.format);
  const length = readSingleTag(input.length, "length", tags.length);
  const ageMin = readAge(input.ageMin, "ageMin");
  const ageMax = readAge(input.ageMax, "ageMax");
  if (ageMin > ageMax) throw new Invalid("INVALID_AGE_RANGE", "ageMax");
  const readingChallenge = readSingleTag(
    input.readingChallenge,
    "readingChallenge",
    tags.readingChallenge,
  );
  const readingLevel = readReadingLevel(input.readingLevel);
  const customTags = readCustomTags(input.customTags);

  return {
    title,
    author,
    matchKey: buildMatchKey(title, author),
    year,
    ...(isbn !== undefined && { isbn }),
    genres,
    ...(subjects && { subjects }),
    moods,
    format,
    length,
    ageMin,
    ageMax,
    readingChallenge,
    ...(readingLevel !== undefined && { readingLevel }),
    ...(customTags && { customTags }),
  };
}

/**
 * The schema for the Add Book request. `tags` are the approved value lists and `now` is
 * the date the year may not pass. On failure the one issue's message is the error code and
 * its path names the field; read them with `newBookErrorOf`.
 */
export function buildNewBookSchema(options: { tags: TagLists; now: Date }) {
  return z.unknown().transform((raw, ctx): NewBook => {
    try {
      return parseNewBook(raw, options.tags, options.now);
    } catch (error) {
      if (!(error instanceof Invalid)) throw error;
      ctx.issues.push({
        code: "custom",
        message: error.code,
        path: [error.field],
        input: raw,
      });
      return z.NEVER;
    }
  });
}

/** The first (and only) failure of a rejected parse: its code and the field it names. */
export function newBookErrorOf(error: z.ZodError): {
  code: NewBookErrorCode;
  field: NewBookField;
} {
  const issue = error.issues[0];
  return {
    code: issue.message as NewBookErrorCode,
    field: issue.path[0] as NewBookField,
  };
}

const FIELD_LABELS: Record<NewBookField, string> = {
  title: "title",
  author: "author",
  year: "year",
  isbn: "ISBN",
  genres: "genre",
  subjects: "subjects",
  moods: "mood",
  format: "format",
  length: "length",
  ageMin: "suggested age min",
  ageMax: "suggested age max",
  readingChallenge: "reading challenge",
  readingLevel: "reading level",
  customTags: "custom tags",
};

/** The message the form and the action show for a validation failure. */
export function newBookErrorMessage(
  code: NewBookErrorCode,
  field: NewBookField,
): string {
  const label = FIELD_LABELS[field];
  switch (code) {
    case "TITLE_REQUIRED":
      return "Enter the book's title.";
    case "TITLE_TOO_LONG":
      return `The title is too long. Keep it to ${String(LIMITS.titleMaxLength)} characters or fewer.`;
    case "AUTHOR_REQUIRED":
      return "Enter the book's author.";
    case "AUTHOR_TOO_LONG":
      return `The author is too long. Keep it to ${String(LIMITS.authorMaxLength)} characters or fewer.`;
    case "YEAR_REQUIRED":
      return "Enter the year the book came out.";
    case "INVALID_YEAR":
      return `Enter a four-digit year from ${String(LIMITS.earliestYear)} up to this year.`;
    case "ISBN_CHOICE_REQUIRED":
      return 'Enter the ISBN, or tick "This book has no ISBN", but not both.';
    case "INVALID_ISBN":
      return "Enter a valid ISBN-10 or ISBN-13.";
    case "TAG_REQUIRED":
      return `Choose a value for ${label}.`;
    case "INVALID_TAG":
      return `That value is not on the approved ${label} list.`;
    case "INVALID_AGE":
      return `Enter ${label} as a whole number, zero or more.`;
    case "INVALID_AGE_RANGE":
      return "The suggested age min cannot be above the suggested age max.";
    case "INVALID_READING_LEVEL":
      return "Enter a reading level as Lexile (such as 650L or BR120), AR/ATOS (0.0 to 13.0), DRA (1 to 80 or A to Z), Guided Reading (A to Z) or a grade range (such as 2-4 or K-2), or leave it blank.";
    case "INVALID_CUSTOM_TAG":
      return `Each custom tag must be 1 to ${String(LIMITS.customTagMaxLength)} characters.`;
    case "TOO_MANY_CUSTOM_TAGS":
      return `Use at most ${String(LIMITS.customTagsPerBook)} custom tags.`;
  }
}

/** A suggested age outside 0 to 21 is a warning, never an error (4i). Returns the warning, if any. */
export function ageWarning(ageMin: number, ageMax: number): string | null {
  const { min, max } = LIMITS.usualAgeRange;
  const outside = [ageMin, ageMax].some((age) => age < min || age > max);
  return outside
    ? `A suggested age is outside ${String(min)} to ${String(max)}. You can still save the book.`
    : null;
}
