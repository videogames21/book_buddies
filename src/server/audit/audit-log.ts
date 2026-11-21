import "server-only";
import { ObjectId, type Db } from "mongodb";
import { now } from "@/server/lib/clock";
import { getDb, type Tx } from "@/server/lib/db";
import { ensureCollection } from "@/server/lib/collections";

/** Append-only: IDs and event metadata, never note text or child details. */
export async function appendNoteFlagAudit(
  tx: Tx,
  actorId: string,
  childId: string,
  flagId: ObjectId,
): Promise<void> {
  await getDb()
    .collection("auditLog")
    .insertOne(
      {
        actorId: new ObjectId(actorId),
        actorRole: "parent",
        event: "parent-note-flagged",
        childId,
        recordId: flagId,
        occurredAt: now(),
      },
      { session: tx },
    );
}
export type AuditEntry = {
  event: "catalog.book_added";
  actorId: string;
  actorRole: "admin";
  /** The record the event is about: IDs only, never a title, name or text (�8.2.9). */
  recordId: string;
};

/** Appends one entry inside the caller's transaction, so it exists only if the change does. */
export async function appendAudit(tx: Tx, entry: AuditEntry): Promise<void> {
  await getDb()
    .collection("auditLog")
    .insertOne(
      {
        actorId: new ObjectId(entry.actorId),
        actorRole: entry.actorRole,
        event: entry.event,
        recordId: entry.recordId,
        occurredAt: now(),
      },
      { session: tx },
    );
}

export async function ensureAuditCollection(db: Db): Promise<void> {
  await ensureCollection(db, "auditLog", {
    bsonType: "object",
    required: ["actorId", "actorRole", "event", "recordId", "occurredAt"],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      actorId: { bsonType: "objectId" },
      actorRole: { enum: ["parent", "admin"] },
      event: { enum: ["parent-note-flagged", "catalog.book_added"] },
      childId: { bsonType: "string" },
      // An ObjectId for a note flag, the book's UUID string for a catalog entry.
      recordId: { bsonType: ["objectId", "string"] },
      occurredAt: { bsonType: "date" },
    },
  });
}
