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

/** UC-PAR-onboarding 6a: an unconfirmed account was deleted. IDs only, no actor account. */
export async function appendUnconfirmedPurgeAudit(
  tx: Tx,
  userId: string,
  familyId: string,
): Promise<void> {
  await getDb()
    .collection("auditLog")
    .insertOne(
      {
        actorRole: "system",
        event: "account.unconfirmed-purged",
        userId: new ObjectId(userId),
        familyId: new ObjectId(familyId),
        occurredAt: now(),
      },
      { session: tx },
    );
}

/** A parent reset their own password (OI-44). The user ID only. */
export async function appendPasswordResetAudit(
  tx: Tx,
  userId: string,
): Promise<void> {
  await getDb()
    .collection("auditLog")
    .insertOne(
      {
        actorId: new ObjectId(userId),
        actorRole: "parent",
        event: "account.password-reset",
        userId: new ObjectId(userId),
        occurredAt: now(),
      },
      { session: tx },
    );
}

/** UC-PAR-delete-kid-account POST-5: the Main Parent and the deleted child's ID only. */
export async function appendChildDeletedAudit(
  tx: Tx,
  parentUserId: string,
  childId: string,
): Promise<void> {
  await getDb()
    .collection("auditLog")
    .insertOne(
      {
        actorId: new ObjectId(parentUserId),
        actorRole: "parent",
        event: "child-account-deleted",
        childId,
        occurredAt: now(),
      },
      { session: tx },
    );
}

// One member per event, matching its validator branch below. `recordId` is the record the
// event is about: IDs only, never a title, name, reason or text (§8.2.9).
export type AuditEntry =
  | {
      event: "child-data-viewed" | "child-data-exported";
      actorId: string;
      actorRole: "parent";
      childId: string;
      recordId: string;
    }
  | {
      event: "catalog.book_added";
      actorId: string;
      actorRole: "admin";
      /** The book's UUID. */
      recordId: string;
    }
  | {
      event: "book.reported";
      actorId: string;
      actorRole: "parent";
      childId: string;
      /** The report's ID. */
      recordId: ObjectId;
    }
  | {
      event: "shelf.parent-removed";
      actorId: string;
      actorRole: "parent";
      childId: string;
      /** The deleted shelf entry's ID. */
      recordId: ObjectId;
      /** So the deleted entry can still be identified. */
      bookId: string;
    };

/** Appends one entry inside the caller's transaction, so it exists only if the change does. */
export async function appendAudit(tx: Tx, entry: AuditEntry): Promise<void> {
  await getDb()
    .collection("auditLog")
    .insertOne(
      { ...entry, actorId: new ObjectId(entry.actorId), occurredAt: now() },
      { session: tx },
    );
}

// One shape per event, IDs only (§8.2.9). A new sign-up or the cron removes an expired
// account, so it has no actor: `system` (UC-PAR-onboarding 6a). A password reset is the parent's
// own act on their own account (OI-44).
// A catalog entry names a book and an admin, and has no child. A book report and a
// parent's shelf removal name the parent, the child and the record (UC-PAR-report-book).
// A child deletion names the Main Parent and the deleted child, and has no record of its
// own (UC-PAR-delete-kid-account).
export async function ensureAuditCollection(db: Db): Promise<void> {
  await ensureCollection(db, "auditLog", {
    bsonType: "object",
    oneOf: [
      {
        required: [
          "actorId",
          "actorRole",
          "event",
          "childId",
          "recordId",
          "occurredAt",
        ],
        additionalProperties: false,
        properties: {
          _id: { bsonType: "objectId" },
          actorId: { bsonType: "objectId" },
          actorRole: { enum: ["parent"] },
          event: { enum: ["child-data-viewed", "child-data-exported"] },
          childId: { bsonType: "string" },
          recordId: { bsonType: "string" },
          occurredAt: { bsonType: "date" },
        },
      },

      {
        required: [
          "actorId",
          "actorRole",
          "event",
          "childId",
          "recordId",
          "occurredAt",
        ],
        additionalProperties: false,
        properties: {
          _id: { bsonType: "objectId" },
          actorId: { bsonType: "objectId" },
          actorRole: { enum: ["parent"] },
          event: { enum: ["parent-note-flagged"] },
          childId: { bsonType: "string" },
          recordId: { bsonType: "objectId" },
          occurredAt: { bsonType: "date" },
        },
      },
      {
        required: ["actorRole", "event", "userId", "familyId", "occurredAt"],
        additionalProperties: false,
        properties: {
          _id: { bsonType: "objectId" },
          actorRole: { enum: ["system"] },
          event: { enum: ["account.unconfirmed-purged"] },
          userId: { bsonType: "objectId" },
          familyId: { bsonType: "objectId" },
          occurredAt: { bsonType: "date" },
        },
      },
      {
        required: ["actorId", "actorRole", "event", "userId", "occurredAt"],
        additionalProperties: false,
        properties: {
          _id: { bsonType: "objectId" },
          actorId: { bsonType: "objectId" },
          actorRole: { enum: ["parent"] },
          event: { enum: ["account.password-reset"] },
          userId: { bsonType: "objectId" },
          occurredAt: { bsonType: "date" },
        },
      },
      {
        required: ["actorId", "actorRole", "event", "recordId", "occurredAt"],
        additionalProperties: false,
        properties: {
          _id: { bsonType: "objectId" },
          actorId: { bsonType: "objectId" },
          actorRole: { enum: ["admin"] },
          event: { enum: ["catalog.book_added"] },
          // The book's UUID string.
          recordId: { bsonType: "string" },
          occurredAt: { bsonType: "date" },
        },
      },
      // UC-PAR-delete-kid-account POST-5: the Main Parent and the deleted child's ID only.
      {
        required: ["actorId", "actorRole", "event", "childId", "occurredAt"],
        additionalProperties: false,
        properties: {
          _id: { bsonType: "objectId" },
          actorId: { bsonType: "objectId" },
          actorRole: { enum: ["parent"] },
          event: { enum: ["child-account-deleted"] },
          childId: { bsonType: "string" },
          occurredAt: { bsonType: "date" },
        },
      },
      // UC-PAR-report-book: the report's ID. No reason, comment or nickname.
      {
        required: [
          "actorId",
          "actorRole",
          "event",
          "childId",
          "recordId",
          "occurredAt",
        ],
        additionalProperties: false,
        properties: {
          _id: { bsonType: "objectId" },
          actorId: { bsonType: "objectId" },
          actorRole: { enum: ["parent"] },
          event: { enum: ["book.reported"] },
          childId: { bsonType: "string" },
          recordId: { bsonType: "objectId" },
          occurredAt: { bsonType: "date" },
        },
      },
      // A parent's shelf removal (UC-PAR-report-book; reused by UC-SHLF-parent-remove-book):
      // the deleted entry's ID, and the book ID so the entry can still be named after the delete.
      {
        required: [
          "actorId",
          "actorRole",
          "event",
          "childId",
          "recordId",
          "bookId",
          "occurredAt",
        ],
        additionalProperties: false,
        properties: {
          _id: { bsonType: "objectId" },
          actorId: { bsonType: "objectId" },
          actorRole: { enum: ["parent"] },
          event: { enum: ["shelf.parent-removed"] },
          childId: { bsonType: "string" },
          recordId: { bsonType: "objectId" },
          bookId: { bsonType: "string" },
          occurredAt: { bsonType: "date" },
        },
      },
    ],
  });
}
