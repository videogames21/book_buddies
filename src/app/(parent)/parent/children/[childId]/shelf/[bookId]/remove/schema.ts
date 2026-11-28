import { z } from "zod";

// The removeBookFromShelf action's input (UC-SHLF-parent-remove-book step 4; architecture
// §8.2.5). Each issue's message is the error code design/shlf.md's API contract names.

export type RemoveBookInputErrorCode = "INVALID_INPUT" | "NOT_CONFIRMED";

/** `confirmed` must be the literal `true`: the server does not trust the page's step 3. */
export const removeBookSchema = z.object({
  childId: z.string({ error: "INVALID_INPUT" }).min(1, "INVALID_INPUT"),
  bookId: z.string({ error: "INVALID_INPUT" }).min(1, "INVALID_INPUT"),
  confirmed: z.literal(true, { error: "NOT_CONFIRMED" }),
});

export const REMOVE_BOOK_INPUT_MESSAGES: Record<
  RemoveBookInputErrorCode,
  string
> = {
  INVALID_INPUT: "Something went wrong. Nothing was removed.",
  NOT_CONFIRMED: "Please confirm the removal first.",
};

/**
 * `NOT_CONFIRMED` only when the confirmation is the one thing wrong; a malformed request
 * (a missing ID, or not an object at all) is `INVALID_INPUT`.
 */
export function firstErrorCode(error: z.ZodError): RemoveBookInputErrorCode {
  const codes = error.issues.map((issue) => issue.message);
  return codes.length > 0 && codes.every((code) => code === "NOT_CONFIRMED")
    ? "NOT_CONFIRMED"
    : "INVALID_INPUT";
}
