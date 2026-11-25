import "server-only";
import type { Db } from "mongodb";
import { ensureCollection } from "@/server/lib/collections";

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
      // The catalog's book IDs are UUID strings.
      bookId: { bsonType: "string", minLength: 1 },
      createdAt: { bsonType: "date" },
      seenAt: { bsonType: "date" },
    },
  });
  await db
    .collection(CHILD_NOTICES)
    .createIndex({ childId: 1, seenAt: 1 }, { name: "childId_seenAt" });
}
