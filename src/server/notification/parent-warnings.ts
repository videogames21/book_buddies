import "server-only";
import { ObjectId, type Db } from "mongodb";
import type { ParentSession } from "@/server/identity-access/sessions";
import { now } from "@/server/lib/clock";
import { ensureCollection } from "@/server/lib/collections";
import { getDb, type Tx } from "@/server/lib/db";

const COLLECTION = "parentWarnings";

export async function ensureParentWarningIndexes(db: Db) {
  await ensureCollection(db, COLLECTION, {
    bsonType: "object",
    required: ["recipientId", "createdAt"],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      recipientId: { bsonType: "objectId" },
      createdAt: { bsonType: "date" },
    },
  });
  await db
    .collection(COLLECTION)
    .createIndex({ recipientId: 1, createdAt: -1 });
}

export async function createParentWarningInTx(tx: Tx, recipientId: ObjectId) {
  await getDb()
    .collection(COLLECTION)
    .insertOne({ recipientId, createdAt: now() }, { session: tx });
}

export async function listParentWarnings(parent: ParentSession) {
  return getDb()
    .collection<{ createdAt: Date }>(COLLECTION)
    .find(
      { recipientId: new ObjectId(parent.userId) },
      { projection: { createdAt: 1 }, sort: { createdAt: -1 } },
    )
    .toArray();
}
