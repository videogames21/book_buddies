import "server-only";
import { MongoServerError, ObjectId } from "mongodb";
import { appendAudit } from "@/server/audit/audit-log";
import { findActiveBookIds } from "@/server/catalog/books";
import type { ParentSession } from "@/server/identity-access/sessions";
import { fail, ok, type ActionResult } from "@/server/lib/action-result";
import { now } from "@/server/lib/clock";
import { getDb, withTransaction, type Tx } from "@/server/lib/db";
import { logUnexpectedError } from "@/server/lib/log";
import { createRemovalNoticeInTx } from "@/server/notification/child-notices";
import { removeShelfEntryInTx } from "@/server/shelf/shelf-entries";
import type { ReportReason } from "@/shared/accounts-family/book-report";
import { BOOK_REPORTS, CHILD_BOOK_EXCLUSIONS } from "./book-report-schema";
import { getChildForFamily, lockChildForWrite } from "./child-accounts";
import { lockConsentForWrite } from "./families";

// Accounts & Family's Book Reports and Per-Child Exclusions (UC-PAR-report-book;
// design/par.md). Nothing here deletes an exclusion or changes a report's status (POST-7):
// UC-ADM-block-content owns the status, and UC-PAR-delete-kid-account adds its own
// deleteChildRecords when it is built.

type BookReportDocument = {
  _id: ObjectId;
  childId: string;
  bookId: string;
  reportedByUserId: ObjectId;
  reason: ReportReason;
  comment?: string;
  status: "open";
  reportedAt: Date;
};

type ExclusionDocument = {
  _id: ObjectId;
  childId: string;
  bookId: string;
  reportId: ObjectId;
  createdAt: Date;
};

export type ReportBookInput = {
  childId: string;
  bookId: string;
  reason: ReportReason;
  /** Already trimmed; absent when the parent gave none. */
  comment?: string;
};

export type ReportBookErrorCode =
  | "BOOK_NOT_FOUND"
  | "CHILD_NOT_FOUND"
  | "CONSENT_NOT_CONFIRMED"
  | "NOT_ON_SHELF_OR_BATCH"
  | "ALREADY_REPORTED"
  | "SAVE_FAILED";

type RefusalCode = Exclude<ReportBookErrorCode, "SAVE_FAILED">;

const MESSAGES: Record<ReportBookErrorCode, string> = {
  BOOK_NOT_FOUND: "We couldn't find this book. Nothing was reported.",
  CHILD_NOT_FOUND: "We couldn't find this child.",
  CONSENT_NOT_CONFIRMED:
    "Your family's consent must be confirmed before you can report a book.",
  NOT_ON_SHELF_OR_BATCH:
    "This book is no longer on your child's shelf, so it was not reported. Nothing was saved.",
  ALREADY_REPORTED: "This book has already been reported for this child.",
  SAVE_FAILED:
    "We couldn't send the report. Nothing was saved, and the book is where it was. Please try again.",
};

/** Ends the transaction with a refusal; it is not transient, so the driver does not rerun it. */
class ReportRefused extends Error {
  constructor(readonly code: RefusalCode) {
    super(code);
  }
}

/**
 * Only a duplicate on the exclusions' unique index (EXCLUSION_UNIQUE_INDEX) is 7c; any
 * other error is 7a. It reads the error's keyPattern, not its message, whose wording the
 * server may change. No other unique index in this transaction is on { childId, bookId }.
 */
function isAlreadyReported(err: unknown): boolean {
  if (!(err instanceof MongoServerError) || err.code !== 11000) return false;
  const keys = Object.keys((err.keyPattern ?? {}) as Record<string, unknown>);
  return (
    keys.length === 2 && keys.includes("childId") && keys.includes("bookId")
  );
}

/**
 * Steps 7 and 8. One transaction inserts the exclusion first (so a book already reported
 * is 7c, before PRE-3), then the report, deletes the shelf entry, and writes the child's
 * notice and the audit entries (§8.2.8, §8.2.9). The family comes from the session. The
 * server enforces PRE-3 with the removal's own result: if nothing was removed, nothing is
 * kept (`NOT_ON_SHELF_OR_BATCH`, which refuses 7b until `OI-54` is answered). The callback
 * may run more than once on a transient conflict, so it creates its IDs and times inside.
 */
export async function reportBook(
  session: ParentSession,
  input: ReportBookInput,
): Promise<ActionResult<{ removedFromShelf: boolean }, ReportBookErrorCode>> {
  const { childId, bookId } = input;
  try {
    const active = await findActiveBookIds([bookId]);
    if (active.length === 0) {
      return fail("BOOK_NOT_FOUND", MESSAGES.BOOK_NOT_FOUND);
    }

    const removedFromShelf = await withTransaction(async (tx) => {
      const child = await getChildForFamily(session.familyId, childId, tx);
      if (!child) throw new ReportRefused("CHILD_NOT_FOUND");
      if (!(await lockChildForWrite(tx, childId))) {
        throw new ReportRefused("CHILD_NOT_FOUND");
      }
      if (!(await lockConsentForWrite(tx, session.familyId))) {
        throw new ReportRefused("CONSENT_NOT_CONFIRMED");
      }

      const db = getDb();
      const reportId = new ObjectId();
      const at = now();
      await db
        .collection<Omit<ExclusionDocument, "_id">>(CHILD_BOOK_EXCLUSIONS)
        .insertOne(
          { childId, bookId, reportId, createdAt: at },
          { session: tx },
        );
      await db.collection<BookReportDocument>(BOOK_REPORTS).insertOne(
        {
          _id: reportId,
          childId,
          bookId,
          reportedByUserId: new ObjectId(session.userId),
          reason: input.reason,
          ...(input.comment ? { comment: input.comment } : {}),
          status: "open",
          reportedAt: at,
        },
        { session: tx },
      );

      const removedEntryId = await removeShelfEntryInTx(tx, childId, bookId);
      // 7d: UC-REC-parent-review adds removeFromPendingBatchInTx here, and its answer
      // joins this PRE-3 check ("removed from neither"). Until then only the shelf counts.
      if (!removedEntryId) {
        throw new ReportRefused("NOT_ON_SHELF_OR_BATCH");
      }

      // A shelf entry was deleted (POST-4): the notice and the removal's audit entry.
      // When the batch step joins, these two run only if `removedEntryId` is set (7d).
      await createRemovalNoticeInTx(tx, childId, bookId);
      await appendAudit(tx, {
        event: "shelf.parent-removed",
        actorId: session.userId,
        actorRole: "parent",
        childId,
        recordId: removedEntryId,
        bookId,
      });
      await appendAudit(tx, {
        event: "book.reported",
        actorId: session.userId,
        actorRole: "parent",
        childId,
        recordId: reportId,
      });
      // Always true until 7d: a report from a pending batch alone will return false.
      return true;
    });
    return ok({ removedFromShelf });
  } catch (err) {
    if (err instanceof ReportRefused) return fail(err.code, MESSAGES[err.code]);
    if (isAlreadyReported(err)) {
      return fail("ALREADY_REPORTED", MESSAGES.ALREADY_REPORTED);
    }
    return fail(
      "SAVE_FAILED",
      MESSAGES.SAVE_FAILED,
      logUnexpectedError("reportBook", err),
    );
  }
}

/** PRE-4 for the report page. Callers check the child's family first. */
export async function isExcluded(
  childId: string,
  bookId: string,
): Promise<boolean> {
  const exclusion = await getDb()
    .collection<ExclusionDocument>(CHILD_BOOK_EXCLUSIONS)
    .findOne({ childId, bookId }, { projection: { _id: 1 } });
  return exclusion !== null;
}

/**
 * The child's excluded book IDs: the one read Recommendation and manual search use to
 * apply `KD-book-exclusion`, as a `$nin` beside the blocked-book filter. No caller yet.
 * Callers check the child's family first.
 */
export async function listExcludedBookIds(childId: string): Promise<string[]> {
  const exclusions = await getDb()
    .collection<ExclusionDocument>(CHILD_BOOK_EXCLUSIONS)
    .find({ childId }, { projection: { bookId: 1 } })
    .toArray();
  return exclusions.map((exclusion) => exclusion.bookId);
}

/**
 * UC-PAR-delete-kid-account (design/par.md, Components): the child's exclusions are
 * deleted, and each report made for the child is kept with only its book, its reason and
 * the reporting parent's reference. Its `childId` and its comment, free text about the
 * child, are removed. The `bookReports` validator allows that shape.
 */
export async function deleteChildRecords(
  tx: Tx,
  childId: string,
): Promise<void> {
  await getDb()
    .collection(CHILD_BOOK_EXCLUSIONS)
    .deleteMany({ childId }, { session: tx });
  await getDb()
    .collection(BOOK_REPORTS)
    .updateMany(
      { childId },
      { $unset: { childId: "", comment: "" } },
      { session: tx },
    );
}
