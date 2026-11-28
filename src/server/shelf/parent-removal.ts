import "server-only";
import { MongoError } from "mongodb";
import {
  getChildForFamily,
  lockChildForWrite,
} from "@/server/accounts-family/child-accounts";
import { lockConsentForWrite } from "@/server/accounts-family/families";
import { appendAudit } from "@/server/audit/audit-log";
import type { ParentSession } from "@/server/identity-access/sessions";
import { fail, ok, type ActionResult } from "@/server/lib/action-result";
import { withTransaction } from "@/server/lib/db";
import { logUnexpectedError } from "@/server/lib/log";
import { createRemovalNoticeInTx } from "@/server/notification/child-notices";
import { removeShelfEntryInTx } from "./shelf-entries";

// UC-SHLF-parent-remove-book steps 5 and 6 (design/shlf.md). Every write is the one
// UC-PAR-report-book makes for a shelf removal, so the child cannot tell the two apart.
// No exclusion and no report are written (OI-72), and the rating and finish confirmation
// are not touched (5c).

export type RemoveBookInput = { childId: string; bookId: string };

export type RemoveBookErrorCode =
  | "CHILD_NOT_FOUND"
  | "CONSENT_NOT_CONFIRMED"
  | "ALREADY_OFF_SHELF"
  | "SAVE_FAILED"
  | "OUTCOME_UNKNOWN";

type RefusalCode = Exclude<
  RemoveBookErrorCode,
  "SAVE_FAILED" | "OUTCOME_UNKNOWN"
>;

const MESSAGES: Record<RemoveBookErrorCode, string> = {
  CHILD_NOT_FOUND: "We couldn't find this child.",
  CONSENT_NOT_CONFIRMED:
    "This book can't be removed while your family's consent is not active. Nothing was changed.",
  ALREADY_OFF_SHELF: "This book is already off the shelf.",
  SAVE_FAILED: "Nothing was saved. Please try again.",
  OUTCOME_UNKNOWN:
    "We could not confirm the removal. It may have been saved, so check the shelf before trying again.",
};

/** Ends the transaction with a refusal; it is not transient, so the driver does not rerun it. */
class RemovalRefused extends Error {
  constructor(readonly code: RefusalCode) {
    super(code);
  }
}

/** The driver could not learn whether the commit applied (5a, save not confirmed). */
function isOutcomeUnknown(err: unknown): boolean {
  return (
    err instanceof MongoError &&
    err.hasErrorLabel("UnknownTransactionCommitResult")
  );
}

/**
 * One transaction, in the design's order: the family check, the child lock (§8.2.8), the
 * consent lock (5d), the delete that alone decides 3b, the child's notice, and the audit
 * entry (§8.2.9). The family comes from the session. The callback holds no state outside
 * the transaction, so a rerun after a conflict is harmless.
 */
export async function removeBookForParent(
  session: ParentSession,
  { childId, bookId }: RemoveBookInput,
): Promise<ActionResult<null, RemoveBookErrorCode>> {
  try {
    await withTransaction(async (tx) => {
      if (!(await getChildForFamily(session.familyId, childId, tx))) {
        throw new RemovalRefused("CHILD_NOT_FOUND");
      }
      if (!(await lockChildForWrite(tx, childId))) {
        throw new RemovalRefused("CHILD_NOT_FOUND");
      }
      if (!(await lockConsentForWrite(tx, session.familyId))) {
        throw new RemovalRefused("CONSENT_NOT_CONFIRMED");
      }
      const removedEntryId = await removeShelfEntryInTx(tx, childId, bookId);
      if (!removedEntryId) throw new RemovalRefused("ALREADY_OFF_SHELF");

      await createRemovalNoticeInTx(tx, childId, bookId);
      await appendAudit(tx, {
        event: "shelf.parent-removed",
        actorId: session.userId,
        actorRole: "parent",
        childId,
        recordId: removedEntryId,
        bookId,
      });
    });
    return ok(null);
  } catch (err) {
    if (err instanceof RemovalRefused) {
      return fail(err.code, MESSAGES[err.code]);
    }
    const errorId = logUnexpectedError("removeBookForParent", err);
    return isOutcomeUnknown(err)
      ? fail("OUTCOME_UNKNOWN", MESSAGES.OUTCOME_UNKNOWN, errorId)
      : fail("SAVE_FAILED", MESSAGES.SAVE_FAILED, errorId);
  }
}
