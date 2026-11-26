import "server-only";
import { MongoError, MongoErrorLabel } from "mongodb";
import { appendChildDeletedAudit } from "@/server/audit/audit-log";
import { deleteChildRecords as deleteChildIdentity } from "@/server/child-identity/child-identity";
import { deleteChildSignIn } from "@/server/identity-access/child-credentials";
import type { ParentSession } from "@/server/identity-access/sessions";
import { fail, ok, type ActionResult } from "@/server/lib/action-result";
import { withTransaction, type Tx } from "@/server/lib/db";
import { logUnexpectedError } from "@/server/lib/log";
import { deleteChildRecords as deleteReadingProfile } from "@/server/recommendation/reading-profiles";
import { deleteChildRecords as deleteNoteFlags } from "@/server/safety-flagging/note-flags";
import { deleteChildRecords as deleteShelfRecords } from "@/server/shelf/shelf-collections";
import { deleteChildForFamily, getChildForFamily } from "./child-accounts";
import { markChildRemoved } from "./families";
import { deleteChildRecords as deleteParentNotes } from "./parent-notes";

// UC-PAR-delete-kid-account step 5: one transaction deletes the child account and every
// record any component holds for the child (architecture §8.2.8, FR-DATA-removal). Each
// component deletes only its own collections (§8.2.4). This list is the only place they
// are all called: a component that starts storing records keyed by the child ID adds
// its deleteChildRecords here, and the completeness test fails until it does.
const DELETE_CHILD_RECORDS: readonly ((
  tx: Tx,
  childId: string,
) => Promise<void>)[] = [
  deleteChildSignIn, // Identity & Access: credential, sessions, throttle rows (POST-1)
  deleteChildIdentity, // Child Identity Store
  deleteParentNotes, // Accounts & Family
  deleteNoteFlags, // Safety Flagging, a flag of any status (5a)
  deleteReadingProfile, // Recommendation
  deleteShelfRecords, // Shelf
];

class ChildNotFoundError extends Error {}

export type DeleteChildCode =
  | "NOT_MAIN_PARENT"
  | "CHILD_NOT_FOUND"
  | "DELETE_FAILED"
  | "DELETE_UNCONFIRMED";

const DELETE_FAILED_MESSAGE =
  "We couldn't delete the account. Nothing was deleted; please try again.";

/**
 * Deletes one child of the session's family and everything held about them, all or
 * nothing (5b). Only the Main Parent may (1a). Consent need not be active
 * (UC-PAR-revoke-consent 2a). The child account goes first, conditionally on its family,
 * so a double submit or a foreign child finds nothing and gets CHILD_NOT_FOUND.
 * Callers have checked the password and nickname (step 3); this function does not.
 */
export async function deleteChild(
  parent: ParentSession,
  childId: string,
): Promise<ActionResult<null, DeleteChildCode>> {
  if (parent.parentRole !== "main") {
    return fail(
      "NOT_MAIN_PARENT",
      "Only the Main Parent can delete a child's account.",
    );
  }
  try {
    await withTransaction(async (tx) => {
      if (!(await deleteChildForFamily(tx, parent.familyId, childId))) {
        throw new ChildNotFoundError();
      }
      for (const deleteRecords of DELETE_CHILD_RECORDS) {
        await deleteRecords(tx, childId);
      }
      await markChildRemoved(tx, parent.familyId, childId); // POST-4
      await appendChildDeletedAudit(tx, parent.userId, childId); // POST-5
      // Step 6: a notice for each Sub Parent. No Sub Parent accounts or in-app notices
      // exist yet (UC-PAR-create-sub-parent-account), so there is no one to notify.
    });
    return ok(null);
  } catch (err) {
    if (err instanceof ChildNotFoundError) {
      return fail("CHILD_NOT_FOUND", "We couldn't find that child.");
    }
    const errorId = logUnexpectedError("deleteChild", err);
    if (
      err instanceof MongoError &&
      err.hasErrorLabel(MongoErrorLabel.UnknownTransactionCommitResult)
    ) {
      return confirmOutcome(parent.familyId, childId, errorId);
    }
    return fail("DELETE_FAILED", DELETE_FAILED_MESSAGE, errorId);
  }
}

/**
 * 5b, when MongoDB cannot say whether the commit happened (the driver has already
 * retried it). The transaction is all or nothing, so the child account tells which:
 * gone means the deletion committed, present means nothing was deleted. If even that
 * read fails, the result says the outcome is unknown rather than claim a rollback.
 */
async function confirmOutcome(
  familyId: string,
  childId: string,
  errorId: string,
): Promise<ActionResult<null, DeleteChildCode>> {
  try {
    if (!(await getChildForFamily(familyId, childId))) return ok(null);
    return fail("DELETE_FAILED", DELETE_FAILED_MESSAGE, errorId);
  } catch (readErr) {
    logUnexpectedError("deleteChild.confirmOutcome", readErr);
    return fail(
      "DELETE_UNCONFIRMED",
      "We couldn't confirm whether the account was deleted. Reload the page to check before trying again.",
      errorId,
    );
  }
}
