import "server-only";
import { ObjectId, type Db } from "mongodb";
import { now } from "@/server/lib/clock";
import { ensureCollection } from "@/server/lib/collections";
import { getDb, type Tx } from "@/server/lib/db";

// Notification's in-app notices to a child (`childNotices`, architecture §5.2). The shape
// is design/shlf.md's (Data model, "Additions for the child's shelf"): the opaque child ID
// and, for a removal, the book's ID. Never a name, a reason or the parent (§8.2.11).
// A notice has no expiry: it stays until the child sees it (UC-PAR-report-book 7e).

export const CHILD_NOTICES = "childNotices";

/** `finish-declined` is written by UC-SHLF-par-finish-book, which is not built yet. */
export const CHILD_NOTICE_KINDS = ["book-removed", "finish-declined"] as const;

export async function ensureChildNoticeIndexes(db: Db): Promise<void> {
  await ensureCollection(db, CHILD_NOTICES, {
    bsonType: "object",
    required: ["_id", "childId", "kind", "createdAt"],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      childId: { bsonType: "string", minLength: 1 },
      kind: { enum: [...CHILD_NOTICE_KINDS] },
      // The catalog's book IDs are UUID strings.
      bookId: { bsonType: "string", minLength: 1 },
      createdAt: { bsonType: "date" },
      seenAt: { bsonType: "date" },
    },
    // A removal names its book; a declined finish names none (fixed wording).
    oneOf: [
      {
        properties: { kind: { enum: ["book-removed"] } },
        required: ["bookId"],
      },
      {
        properties: { kind: { enum: ["finish-declined"] } },
        not: { required: ["bookId"] },
      },
    ],
  });
  await db
    .collection(CHILD_NOTICES)
    .createIndex({ childId: 1, seenAt: 1 }, { name: "childId_seenAt" });
}

export type ChildNoticeKind = (typeof CHILD_NOTICE_KINDS)[number];

type ChildNoticeDocument = {
  _id: ObjectId;
  childId: string;
  kind: ChildNoticeKind;
  /** For `book-removed` only. */
  bookId?: string;
  createdAt: Date;
  seenAt?: Date;
};

/** UC-PAR-delete-kid-account: every notice to the child, seen or not (design/par.md). */
export async function deleteChildRecords(
  tx: Tx,
  childId: string,
): Promise<void> {
  await getDb()
    .collection(CHILD_NOTICES)
    .deleteMany({ childId }, { session: tx });
}

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

/** The child's notices they have not tapped OK on, oldest first. Reading marks nothing. */
export async function peekUnseenChildNotices(
  childId: string,
): Promise<{ id: string; kind: ChildNoticeKind; bookId?: string }[]> {
  const notices = await getDb()
    .collection<ChildNoticeDocument>(CHILD_NOTICES)
    .find(
      { childId, seenAt: { $exists: false } },
      { projection: { kind: 1, bookId: 1 } },
    )
    .sort({ createdAt: 1, _id: 1 })
    .toArray();
  return notices.map(({ _id, kind, bookId }) => ({
    id: _id.toHexString(),
    kind,
    ...(bookId && { bookId }),
  }));
}

/**
 * The child tapped OK. One conditional update on that child's own unseen notice, so a
 * second tap, another tab or another child's notice ID changes nothing. Returns whether
 * this call marked it. `noticeId` must be a 24-character hexadecimal ID.
 */
export async function markNoticeSeen(
  childId: string,
  noticeId: string,
): Promise<boolean> {
  const { modifiedCount } = await getDb()
    .collection<ChildNoticeDocument>(CHILD_NOTICES)
    .updateOne(
      { _id: new ObjectId(noticeId), childId, seenAt: { $exists: false } },
      { $set: { seenAt: now() } },
    );
  return modifiedCount === 1;
}
