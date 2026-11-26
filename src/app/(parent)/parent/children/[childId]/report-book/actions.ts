"use server";

import {
  reportBook as saveBookReport,
  type ReportBookErrorCode,
} from "@/server/accounts-family/book-reports";
import {
  requireParent,
  type SessionErrorCode,
} from "@/server/identity-access/sessions";
import { fail, type ActionResult } from "@/server/lib/action-result";
import { logUnexpectedError } from "@/server/lib/log";
import {
  firstErrorCode,
  REPORT_BOOK_INPUT_MESSAGES,
  reportBookSchema,
  type ReportBookInputErrorCode,
} from "./schema";

export type ReportBookCode =
  SessionErrorCode | ReportBookInputErrorCode | ReportBookErrorCode;

/**
 * UC-PAR-report-book steps 6 to 8, shared by the shelf and batch entry points. Session
 * first, then validation, then Accounts & Family (§8.2.3). The family comes from the
 * session, never the request: any family ID the caller sends is not read.
 */
export async function reportBook(
  input: unknown,
): Promise<ActionResult<{ removedFromShelf: boolean }, ReportBookCode>> {
  try {
    const session = await requireParent();
    if (!session.ok) return session;

    const parsed = reportBookSchema.safeParse(input);
    if (!parsed.success) {
      const code = firstErrorCode(parsed.error);
      return fail(code, REPORT_BOOK_INPUT_MESSAGES[code]);
    }

    const { childId, bookId, reason, comment } = parsed.data;
    return await saveBookReport(session.data, {
      childId,
      bookId,
      reason,
      ...(comment ? { comment } : {}),
    });
  } catch (err) {
    return fail(
      "SAVE_FAILED",
      "We couldn't send the report. Nothing was saved, and the book is where it was. Please try again.",
      logUnexpectedError("reportBookAction", err),
    );
  }
}
