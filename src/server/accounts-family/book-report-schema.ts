import "server-only";
import type { Db } from "mongodb";
import { ensureCollection } from "@/server/lib/collections";
import {
  REPORT_COMMENT_MAX_LENGTH,
  REPORT_REASONS,
} from "@/shared/accounts-family/book-report";

// The schemas of Accounts & Family's `bookReports` and `childBookExclusions`
// (UC-PAR-report-book; design/par.md, Data model). Kept apart from book-reports.ts so the
// index setup script, which runs outside Next.js, does not load the session code that
// module depends on (as consent-record-schema.ts does).

export const BOOK_REPORTS = "bookReports";
export const CHILD_BOOK_EXCLUSIONS = "childBookExclusions";

/** The unique index that makes "already reported" race-free (7c). */
export const EXCLUSION_UNIQUE_INDEX = "childId_bookId_unique";

/** Every status the use case's data table names; this use case writes only `open`. */
export const REPORT_STATUSES = ["open", "blocked", "discarded"] as const;

export async function ensureBookReportIndexes(db: Db): Promise<void> {
  // `childId` and `comment` are optional: UC-PAR-delete-kid-account keeps the report and
  // removes both when the child is deleted, because the comment is free text about the child.
  await ensureCollection(db, BOOK_REPORTS, {
    bsonType: "object",
    required: [
      "_id",
      "bookId",
      "reportedByUserId",
      "reason",
      "status",
      "reportedAt",
    ],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      childId: { bsonType: "string", minLength: 1 },
      bookId: { bsonType: "string", minLength: 1 },
      reportedByUserId: { bsonType: "objectId" },
      reason: { enum: [...REPORT_REASONS] },
      comment: {
        bsonType: "string",
        minLength: 1,
        maxLength: REPORT_COMMENT_MAX_LENGTH,
      },
      status: { enum: [...REPORT_STATUSES] },
      reportedAt: { bsonType: "date" },
    },
  });
  const reports = db.collection(BOOK_REPORTS);
  // The admin's list of open reports, oldest first.
  await reports.createIndex(
    { status: 1, reportedAt: 1 },
    { name: "status_reportedAt" },
  );
  // UC-ADM-block-content finds and closes a book's open reports.
  await reports.createIndex(
    { bookId: 1, status: 1 },
    { name: "bookId_status" },
  );
  // The data-rights use cases find a child's reports.
  await reports.createIndex({ childId: 1 }, { name: "childId" });

  await ensureCollection(db, CHILD_BOOK_EXCLUSIONS, {
    bsonType: "object",
    required: ["_id", "childId", "bookId", "reportId", "createdAt"],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      childId: { bsonType: "string", minLength: 1 },
      bookId: { bsonType: "string", minLength: 1 },
      reportId: { bsonType: "objectId" },
      createdAt: { bsonType: "date" },
    },
  });
  await db
    .collection(CHILD_BOOK_EXCLUSIONS)
    .createIndex(
      { childId: 1, bookId: 1 },
      { unique: true, name: EXCLUSION_UNIQUE_INDEX },
    );
}
