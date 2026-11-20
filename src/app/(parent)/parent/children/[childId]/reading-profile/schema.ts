import { z } from "zod";
import { INTEREST_KEYS } from "@/server/recommendation/interests";

// The one schema for the reading-profile form and the saveReadingProfile action
// (architecture §8.2.5). Each issue's message is the error code the API contract names
// (design/rec.md). No free-text field exists (BR-child-structured-responses).

/** The most favorite books a parent may pick; proposed in OI-38 (design/rec-field-values.md). */
export const MAX_FAVORITE_BOOKS = 10;

// Guards the work done before duplicates are removed; far above anything a form sends.
const MAX_RAW_BOOKS = 200;

export type ReadingProfileErrorCode =
  "INVALID_INTEREST" | "INVALID_BOOK" | "TOO_MANY_BOOKS" | "INVALID_INPUT";

const unique = <T>(values: T[]): T[] => [...new Set(values)];

export const readingProfileSchema = z.object({
  childId: z.string({ error: "INVALID_INPUT" }).min(1, "INVALID_INPUT"),
  interests: z
    .array(z.enum(INTEREST_KEYS, { error: "INVALID_INTEREST" }), {
      error: "INVALID_INTEREST",
    })
    .transform(unique),
  favoriteBookIds: z
    .array(z.string({ error: "INVALID_BOOK" }).min(1, "INVALID_BOOK"), {
      error: "INVALID_BOOK",
    })
    .max(MAX_RAW_BOOKS, "TOO_MANY_BOOKS")
    .transform(unique)
    .refine((ids) => ids.length <= MAX_FAVORITE_BOOKS, "TOO_MANY_BOOKS"),
});

export type ReadingProfileInput = z.infer<typeof readingProfileSchema>;

export const READING_PROFILE_MESSAGES: Record<ReadingProfileErrorCode, string> =
  {
    INVALID_INTEREST: "Please choose interests from the list.",
    INVALID_BOOK: "Please choose books from the list.",
    TOO_MANY_BOOKS: `Please choose no more than ${String(MAX_FAVORITE_BOOKS)} favorite books.`,
    INVALID_INPUT: "Check the reading profile and try again.",
  };

/** The first issue's code, or `INVALID_INPUT` for anything unexpected. */
export function firstErrorCode(error: z.ZodError): ReadingProfileErrorCode {
  const message = error.issues.at(0)?.message;
  return message && message in READING_PROFILE_MESSAGES
    ? (message as ReadingProfileErrorCode)
    : "INVALID_INPUT";
}
