import "server-only";
import type { Db, ObjectId } from "mongodb";
import { now } from "@/server/lib/clock";
import { ensureCollection } from "@/server/lib/collections";
import { getDb, type Tx } from "@/server/lib/db";

// Notification's in-app notices to a child (`childNotices`, architecture §5.2). The shape
// is design/shlf.md's (Data model, "Additions for the child's shelf"): the opaque child ID
// and, for a removal, the book's ID. Never a name, a reason or the parent (§8.2.11).
// A notice has no expiry: it stays until the child sees it (UC-PAR-report-book 7e).

export const CHILD_NOTICES = "childNotices";

/** The kinds written so far; `finish-declined` joins with UC-SHLF-par-finish-book. */
export const CHILD_NOTICE_KINDS = ["book-removed"] as const;

export async function ensureChildNoticeIndexes(db: Db): Promise<void> {
  await ensureCollection(db, CHILD_NOTICES, {
    bsonType: "object",
    required: ["_id", "childId", "kind", "bookId", "createdAt"],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      childId: { bsonType: "string", minLength: 1 },
      kind: { enum: [...CHILD_NOTICE_KINDS] },
      // The catalog's book IDs are UUID strings. bookId is required only because
      // book-removed is the only kind so far; finish-declined (no book) will need a
      // per-kind rule.
      bookId: { bsonType: "string", minLength: 1 },
      createdAt: { bsonType: "date" },
      seenAt: { bsonType: "date" },
    },
  });
  await db
    .collection(CHILD_NOTICES)
    .createIndex({ childId: 1, seenAt: 1 }, { name: "childId_seenAt" });
}

type ChildNoticeDocument = {
  _id: ObjectId;
  childId: string;
  kind: (typeof CHILD_NOTICE_KINDS)[number];
  bookId: string;
  createdAt: Date;
  seenAt?: Date;
};

/**
 * The child's notice that a book left their shelf, written inside the caller's
 * transaction. It holds the book ID only: no reason and no parent, so a report and a
 * plain removal look the same to the child (UC-PAR-report-book POST-4, §8.2.11).
 */
export async function createRemovalNoticeInTx(
  tx: Tx,
  childId: string,
  bookId: string,
): Promise<void> {
  await getDb()
    .collection<Omit<ChildNoticeDocument, "_id">>(CHILD_NOTICES)
    .insertOne(
      { childId, kind: "book-removed", bookId, createdAt: now() },
      { session: tx },
    );
}
