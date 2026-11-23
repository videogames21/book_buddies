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

// One shape per event, IDs only (§8.2.9). The purge is run by the cron, so it has no
// actor account: `system` (UC-PAR-onboarding 6a). A password reset is the parent's
// own act on their own account (OI-44).
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
    ],
  });
}
