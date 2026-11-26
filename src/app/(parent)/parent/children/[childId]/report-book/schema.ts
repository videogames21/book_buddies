import { z } from "zod";
import {
  REPORT_COMMENT_MAX_LENGTH,
  REPORT_REASONS,
} from "@/shared/accounts-family/book-report";

// The one schema for the report form and the reportBook action (UC-PAR-report-book
// steps 3 and 6; architecture §8.2.5). Each issue's message is the error code the API
// contract names (design/par.md). Not `server-only`: the form's state module reads it.

export type ReportBookInputErrorCode =
  | "CHILD_NOT_FOUND"
  | "BOOK_NOT_FOUND"
  | "REASON_REQUIRED"
  | "INVALID_REASON"
  | "COMMENT_TOO_LONG"
  | "NOT_CONFIRMED"
  | "INVALID_INPUT";

/** The comment as the parent typed it: trimmed once, and blank means no comment. */
const comment = z
  .string({ error: "INVALID_INPUT" })
  .nullish()
  .transform((value) => value?.trim() || undefined)
  .refine(
    (value) =>
      value === undefined ||
      // Code points, not graphemes: the `bookReports` validator's maxLength counts them.
      // eslint-disable-next-line @typescript-eslint/no-misused-spread -- see above
      [...value].length <= REPORT_COMMENT_MAX_LENGTH,
    "COMMENT_TOO_LONG",
  );

const reason = z.enum(REPORT_REASONS, {
  error: (issue) =>
    issue.input === undefined || issue.input === null || issue.input === ""
      ? "REASON_REQUIRED"
      : "INVALID_REASON",
});

/** What the form checks before "Continue" (3a and the comment limit). */
export const reportFormSchema = z.object({ reason, comment });

/**
 * The action's input. A missing or malformed child or book ID gets the code the server
 * gives an unknown one, so the answer reveals nothing more. `confirmed` must be the
 * literal `true` (step 6): the server does not trust the page's confirmation screen.
 */
export const reportBookSchema = z.object({
  childId: z.string({ error: "CHILD_NOT_FOUND" }).min(1, "CHILD_NOT_FOUND"),
  bookId: z.string({ error: "BOOK_NOT_FOUND" }).min(1, "BOOK_NOT_FOUND"),
  reason,
  comment,
  confirmed: z.literal(true, { error: "NOT_CONFIRMED" }),
});

export type ReportBookFormInput = z.infer<typeof reportBookSchema>;

export const REPORT_BOOK_INPUT_MESSAGES: Record<
  ReportBookInputErrorCode,
  string
> = {
  CHILD_NOT_FOUND: "We couldn't find this child.",
  BOOK_NOT_FOUND: "We couldn't find this book. Nothing was reported.",
  REASON_REQUIRED: "Please choose a reason.",
  INVALID_REASON: "Please choose a reason from the list.",
  COMMENT_TOO_LONG: `Please keep the comment to ${String(REPORT_COMMENT_MAX_LENGTH)} characters or fewer.`,
  NOT_CONFIRMED: "Please confirm the report before sending it.",
  INVALID_INPUT: "Check the report and try again.",
};

/** The first issue's code, or `INVALID_INPUT` for anything unexpected. */
export function firstErrorCode(error: z.ZodError): ReportBookInputErrorCode {
  const message = error.issues.at(0)?.message;
  return message && message in REPORT_BOOK_INPUT_MESSAGES
    ? (message as ReportBookInputErrorCode)
    : "INVALID_INPUT";
}
