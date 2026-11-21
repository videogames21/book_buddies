// The approved catalog values and limits (UC-ADM-add-content steps 2 and 4).
// TEAM-EDITABLE. Source: design/adm-field-values.md, agreed 2026-11-17 (client
// confirmation: OI-42). One value per line, so adding a value later is a one-line
// change plus a test row, with no migration. No server imports: the browser, the
// action and the import script all read this file.

export const GENRES = [
  "realistic fiction",
  "fantasy",
  "animal story",
  "mystery",
  "adventure",
  "non-fiction",
] as const;

export const SUBJECTS = [
  "animals",
  "school",
  "magic & mythical creatures",
  "science & technology",
  "food",
  "space",
  "dinosaurs",
  "history & biography",
  "vehicles",
  "sports",
] as const;

export const MOODS = [
  "funny/silly",
  "exciting",
  "heartwarming",
  "spooky-but-safe",
  "fascinating",
  "calm",
  "inspiring",
] as const;

export const FORMATS = [
  "comic/graphic novel",
  "chapter book",
  "picture book",
  "early reader",
] as const;

export const LENGTHS = ["quick read", "longer story"] as const;

export const READING_CHALLENGES = [
  "reading independently",
  "reading with some help",
  "read aloud together",
] as const;

/** The six lists the schema checks standard tags against (4b). */
export type TagLists = {
  genres: readonly string[];
  subjects: readonly string[];
  moods: readonly string[];
  format: readonly string[];
  length: readonly string[];
  readingChallenge: readonly string[];
};

export const TAG_LISTS: TagLists = {
  genres: GENRES,
  subjects: SUBJECTS,
  moods: MOODS,
  format: FORMATS,
  length: LENGTHS,
  readingChallenge: READING_CHALLENGES,
};

export const LIMITS = {
  titleMaxLength: 200,
  authorMaxLength: 200,
  earliestYear: 1400,
  customTagMaxLength: 30,
  customTagsPerBook: 10,
  /** Outside this range the form warns; the server never rejects an age for it (4i). */
  usualAgeRange: { min: 0, max: 21 },
  /** The Catalog stores ages as 32-bit integers; this is a storage bound, not a policy. */
  ageStorageMax: 2_147_483_647,
} as const;

// The grades a grade-level range may name, lowest first. "K" is a short form of
// kindergarten (developer, 2026-11-20).
const GRADE_ORDER = [
  "pre-school",
  "kindergarten",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
];

function gradeIndex(text: string): number {
  const grade = text.trim().toLowerCase();
  return GRADE_ORDER.indexOf(grade === "k" ? "kindergarten" : grade);
}

/** "2-4", "K-2" or "pre-school-1": two grades joined by a hyphen or en dash, first not above second. */
function isGradeRange(value: string): boolean {
  // "pre-school" holds a hyphen, so try every hyphen as the split point.
  for (let i = 0; i < value.length; i++) {
    if (value[i] !== "-" && value[i] !== "–") continue;
    const from = gradeIndex(value.slice(0, i));
    const to = gradeIndex(value.slice(i + 1));
    if (from !== -1 && to !== -1 && from <= to) return true;
  }
  return false;
}

/**
 * Whether `value` is on an accepted reading-level scale (4c): Lexile (a number, optional
 * L after it, or a BR, AD, GN or NC prefix and a number with no L), AR/ATOS (0.0 to
 * 13.0), DRA (A to Z; its numbers are digits and fall under the Lexile pattern), Guided
 * Reading Level (one letter) or a grade-level range.
 */
export function isReadingLevelValid(value: string): boolean {
  const text = value.trim();
  if (/^(?:(?:BR|AD|GN|NC)\d{1,4}|\d{1,4}L?)$/iu.test(text)) return true;
  if (/^\d{1,2}\.\d$/u.test(text) && Number(text) <= 13) return true;
  if (/^[A-Z]$/iu.test(text)) return true;
  return isGradeRange(text);
}
