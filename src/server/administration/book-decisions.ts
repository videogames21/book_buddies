import "server-only";
import { MongoError } from "mongodb";
import {
  closeBookReportsInTx,
  discardOpenReportInTx,
  listOpenBookReports,
} from "@/server/accounts-family/book-reports";
import { deleteSuggestionsForBookInTx } from "@/server/accounts-family/suggestions";
import { appendAudit } from "@/server/audit/audit-log";
import { blockBookInTx, getBookForBlock } from "@/server/catalog/books";
import { parentRecipientExists } from "@/server/identity-access/parent-accounts";
import { createParentWarningInTx } from "@/server/notification/parent-warnings";
import type { AdminSession } from "@/server/identity-access/sessions";
import { fail, ok } from "@/server/lib/action-result";
import { withTransaction, type Tx } from "@/server/lib/db";
import { logUnexpectedError } from "@/server/lib/log";
import { removeBlockedBookFromBatchesInTx } from "@/server/recommendation/batches";
import {
  countShelfEntriesForBook,
  removeShelfEntriesForBookInTx,
} from "@/server/shelf/shelf-entries";
import type { BlockReason } from "@/shared/catalog/block-reasons";

const TRANSACTION_TIMEOUT_MS = 5_000;

const refusals = {
  REPORT_NOT_OPEN: "That report is no longer open.",
  REPORTER_UNAVAILABLE: "The reporting parent is no longer available.",
  BOOK_NOT_FOUND: "This book is no longer in the catalog.",
  NO_OPEN_REPORTS: "There are no open reports for this book.",
  BOOK_STATUS_CHANGED: "The book's status changed. Refresh before continuing.",
} as const;

class DecisionRefused extends Error {
  constructor(readonly code: keyof typeof refusals) {
    super(code);
  }
}

type Decision =
  | { kind: "block"; entry: "catalog" | "reports"; reason: BlockReason }
  | { kind: "close" | "discard"; entry: "reports" }
  | { kind: "warn"; entry: "reports"; reportId: string };

function audit(
  tx: Tx,
  admin: AdminSession,
  recordId: string,
  event:
    "catalog.book_blocked" | "report.discarded" | "report.closed_as_blocked",
) {
  return appendAudit(tx, {
    actorId: admin.userId,
    actorRole: "admin",
    event,
    recordId,
  });
}

export async function loadBookBlockPreview(bookId: string) {
  const book = await getBookForBlock(bookId);
  if (!book) return null;
  const count = await countShelfEntriesForBook(bookId);
  return {
    title: book.title,
    status: book.status,
    reason: book.blockReason,
    count,
  };
}

export async function loadReportedBookQueue() {
  const open = await listOpenBookReports();
  const groups = new Map<string, { count: number; reasons: Set<string> }>();
  for (const { bookId, reason } of open) {
    const group = groups.get(bookId) ?? {
      count: 0,
      reasons: new Set<string>(),
    };
    group.count++;
    group.reasons.add(reason);
    groups.set(bookId, group);
  }
  return Promise.all(
    Array.from(groups, async ([bookId, group]) => ({
      bookId,
      title: (await getBookForBlock(bookId))?.title ?? "Book unavailable",
      count: group.count,
      reasons: [...group.reasons],
    })),
  );
}

export async function decideReportedBook(
  admin: AdminSession,
  bookId: string,
  decision: Decision,
) {
  try {
    return await withTransaction(
      async (tx) => {
        const book = await getBookForBlock(bookId, tx);
        if (!book) throw new DecisionRefused("BOOK_NOT_FOUND");

        if (decision.kind === "warn") {
          const report = await discardOpenReportInTx(
            tx,
            bookId,
            decision.reportId,
          );
          if (!report) throw new DecisionRefused("REPORT_NOT_OPEN");
          if (!(await parentRecipientExists(tx, report.reportedByUserId))) {
            throw new DecisionRefused("REPORTER_UNAVAILABLE");
          }
          await createParentWarningInTx(tx, report.reportedByUserId);
          await appendAudit(tx, {
            event: "report.parent_warned",
            actorId: admin.userId,
            actorRole: "admin",
            recordId: report._id,
          });
          return ok({ outcome: "WARNED" as const });
        }

        if (decision.kind === "discard") {
          const closed = await closeBookReportsInTx(tx, bookId, "discarded");
          if (closed) await audit(tx, admin, bookId, "report.discarded");
          return ok({ outcome: "DISCARDED" as const });
        }

        if (book.status === "blocked") {
          if (decision.entry === "reports") {
            const closed = await closeBookReportsInTx(tx, bookId, "blocked");
            if (closed)
              await audit(tx, admin, bookId, "report.closed_as_blocked");
          }
          return ok({
            outcome: "ALREADY_BLOCKED" as const,
            reason: book.blockReason,
          });
        }

        if (decision.kind !== "block")
          throw new DecisionRefused("BOOK_STATUS_CHANGED");
        if (!(await blockBookInTx(tx, bookId, admin.userId, decision.reason))) {
          throw new DecisionRefused("BOOK_STATUS_CHANGED");
        }
        if (
          decision.entry === "reports" &&
          !(await closeBookReportsInTx(tx, bookId, "blocked"))
        ) {
          throw new DecisionRefused("NO_OPEN_REPORTS");
        }

        await removeShelfEntriesForBookInTx(tx, bookId);
        await removeBlockedBookFromBatchesInTx(tx, bookId);
        await deleteSuggestionsForBookInTx(tx, bookId);
        await audit(tx, admin, bookId, "catalog.book_blocked");
        return ok({ outcome: "BLOCKED" as const, reason: decision.reason });
      },
      { timeoutMS: TRANSACTION_TIMEOUT_MS },
    );
  } catch (error) {
    if (error instanceof DecisionRefused)
      return fail(error.code, refusals[error.code]);
    const errorId = logUnexpectedError("decideReportedBook", error);
    if (
      error instanceof MongoError &&
      error.hasErrorLabel("UnknownTransactionCommitResult")
    ) {
      return fail(
        "OUTCOME_UNKNOWN",
        "We couldn't confirm the decision. Refresh before trying again.",
        errorId,
      );
    }
    return fail(
      decision.kind === "discard" || decision.kind === "warn"
        ? "REPORT_DECISION_FAILED"
        : "BLOCK_FAILED",
      "The decision wasn't saved. Try again.",
      errorId,
    );
  }
}
