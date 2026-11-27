import "server-only";
import { ObjectId } from "mongodb";
import { getDb, type Tx } from "@/server/lib/db";
import type { ReportReason } from "@/shared/accounts-family/book-report";
import { BOOK_REPORTS } from "./book-report-schema";

type AdminBookReport = {
  _id: ObjectId;
  childId: string;
  bookId: string;
  reportedByUserId: ObjectId;
  reason: ReportReason;
  comment?: string;
  status: "open" | "blocked" | "discarded";
  reportedAt: Date;
};

const reports = () => getDb().collection<AdminBookReport>(BOOK_REPORTS);

export async function listOpenBookReports(bookId?: string) {
  const rows = await reports()
    .find(
      { status: "open", ...(bookId ? { bookId } : {}) },
      {
        projection: {
          bookId: 1,
          reason: 1,
          reportedAt: 1,
          reportedByUserId: 1,
        },
      },
    )
    .sort({ reportedAt: -1, _id: 1 })
    .toArray();
  return rows.map(({ _id, bookId, reason, reportedAt, reportedByUserId }) => ({
    id: _id.toHexString(),
    accountRef: reportedByUserId.toHexString(),
    bookId,
    reason,
    reportedAt,
  }));
}

export async function closeBookReportsInTx(
  tx: Tx,
  bookId: string,
  status: "blocked" | "discarded",
): Promise<number> {
  const result = await reports().updateMany(
    { bookId, status: "open" },
    { $set: { status } },
    { session: tx },
  );
  return result.modifiedCount;
}

export async function discardOpenReportInTx(
  tx: Tx,
  bookId: string,
  reportId: string,
) {
  return reports().findOneAndUpdate(
    { _id: new ObjectId(reportId), bookId, status: "open" },
    { $set: { status: "discarded" } },
    { session: tx, projection: { reportedByUserId: 1 } },
  );
}
