import { z } from "zod";
import { SUGGESTION_NOTE_MAX_LENGTH } from "@/shared/accounts-family/suggestion";

// The schema of the suggestBook action (UC-PAR-suggest-book steps 3-4, 3b; §8.2.5;
// design/par.md, Components & classes). Each issue's message is the error code the API
// contract names. A child ID or book ID in the wrong format gets the same code as an
// unknown one, so the format check says nothing about which IDs exist.

export type SuggestBookSchemaCode =
  "CHILD_NOT_FOUND" | "INVALID_BOOK" | "NOTE_TOO_LONG" | "INVALID_INPUT";

export const suggestBookSchema = z.object(
  {
    childId: z.uuid({ error: "CHILD_NOT_FOUND" }),
    bookId: z
      .string({ error: "INVALID_BOOK" })
      .min(1, "INVALID_BOOK")
      .max(100, "INVALID_BOOK"),
    // Trimmed once here; a blank note is no note (3b).
    note: z
      .string({ error: "INVALID_INPUT" })
      .trim()
      .max(SUGGESTION_NOTE_MAX_LENGTH, "NOTE_TOO_LONG")
      .nullish()
      .transform((note) => (note ? note : undefined)),
    suggestAnyway: z.boolean({ error: "INVALID_INPUT" }).default(false),
  },
  { error: "INVALID_INPUT" },
);

export type SuggestBookInput = z.infer<typeof suggestBookSchema>;

export const SUGGEST_BOOK_SCHEMA_MESSAGES: Record<
  SuggestBookSchemaCode,
  string
> = {
  CHILD_NOT_FOUND: "We couldn't find this child.",
  INVALID_BOOK: "We couldn't find this book. Nothing was suggested.",
  NOTE_TOO_LONG: `Please keep the note to ${String(SUGGESTION_NOTE_MAX_LENGTH)} characters or fewer.`,
  INVALID_INPUT: "Something went wrong. Reload the page and try again.",
};

/** The first issue's code, or `INVALID_INPUT` for anything unexpected. */
export function firstErrorCode(error: z.ZodError): SuggestBookSchemaCode {
  const message = error.issues.at(0)?.message;
  return message && message in SUGGEST_BOOK_SCHEMA_MESSAGES
    ? (message as SuggestBookSchemaCode)
    : "INVALID_INPUT";
}
