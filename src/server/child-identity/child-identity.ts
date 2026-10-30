import "server-only";
import type { Db, ObjectId } from "mongodb";
import { ensureCollection } from "@/server/lib/collections";
import { now } from "@/server/lib/clock";
import { getDb, type Tx } from "@/server/lib/db";

// The Child Identity Store: the only place a child's real name, age, grade and reading
// level are kept (KD-pii-segregation). This use case adds its write path only.

const COLLECTION = "childIdentities";

export type NewChildIdentity = {
  childId: ObjectId;
  realName: string;
  age: number;
  grade: string;
  readingLevel?: { scale: string; value: string };
};

/** Inserts inside the caller's transaction. The reading level is stored as entered, never converted. */
export async function insertChildIdentity(tx: Tx, identity: NewChildIdentity): Promise<void> {
  await getDb()
    .collection(COLLECTION)
    .insertOne(
      {
        childId: identity.childId,
        realName: identity.realName,
        age: identity.age,
        grade: identity.grade,
        ...(identity.readingLevel && {
          readingLevelScale: identity.readingLevel.scale,
          readingLevelValue: identity.readingLevel.value,
        }),
        createdAt: now(),
      },
      { session: tx },
    );
}

export async function ensureChildIdentityIndexes(db: Db): Promise<void> {
  await ensureCollection(db, COLLECTION, {
    bsonType: "object",
    required: ["childId", "realName", "age", "grade", "createdAt"],
    properties: {
      childId: { bsonType: "objectId" },
      realName: { bsonType: "string", minLength: 1 },
      age: { bsonType: "int" },
      grade: { bsonType: "string" },
      readingLevelScale: { bsonType: "string" },
      readingLevelValue: { bsonType: "string" },
      createdAt: { bsonType: "date" },
    },
  });
  await db.collection(COLLECTION).createIndex({ childId: 1 }, { name: "childId_unique", unique: true });
}
