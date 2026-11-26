import "server-only";
import type { Db } from "mongodb";
import { GRADES, type Grade } from "@/server/accounts-family/grades";
import { ensureCollection } from "@/server/lib/collections";
import { now } from "@/server/lib/clock";
import { getDb, type Tx } from "@/server/lib/db";

// The Child Identity Store: the only place a child's age, grade and reading
// level are kept (KD-pii-segregation). This use case adds its write path only.

const COLLECTION = "childIdentities";

export type NewChildIdentity = {
  childId: string;
  age: number;
  grade: string;
  readingLevel?: { scale: string; value: string };
};

/** Inserts inside the caller's transaction. The reading level is stored as entered, never converted. */
export async function insertChildIdentity(
  tx: Tx,
  identity: NewChildIdentity,
): Promise<void> {
  await getDb()
    .collection(COLLECTION)
    .insertOne(
      {
        childId: identity.childId,
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

type QuizIdentity = {
  age: number;
  grade: Grade;
  level?: { scale: "lexile" | "arAtos"; value: number };
};

/** Only the profile fields needed for rule ranking. Callers provide the session's child. */
export async function getRuleQuizProfile(
  childId: string,
  tx?: Tx,
): Promise<QuizIdentity | null> {
  const identity = await getDb()
    .collection<{
      age: number;
      grade: string;
      readingLevelScale?: string;
      readingLevelValue?: string;
    }>(COLLECTION)
    .findOne(
      { childId },
      {
        projection: {
          age: 1,
          grade: 1,
          readingLevelScale: 1,
          readingLevelValue: 1,
        },
        session: tx,
      },
    );
  if (!identity || !Number.isInteger(identity.age)) return null;

  const grade = GRADES.find((value) => value === identity.grade);
  if (!grade) return null;
  const profile: QuizIdentity = { age: identity.age, grade };
  const value = identity.readingLevelValue?.trim() ?? "";
  if (identity.readingLevelScale === "lexile" && /^\d{1,4}L?$/i.test(value)) {
    profile.level = {
      scale: "lexile",
      value: Number(value.replace(/L$/i, "")),
    };
  }
  if (
    identity.readingLevelScale === "atos" &&
    /^\d{1,2}(?:\.\d)?$/.test(value) &&
    Number(value) <= 13
  ) {
    profile.level = { scale: "arAtos", value: Number(value) };
  }
  return profile;
}

export async function ensureChildIdentityIndexes(db: Db): Promise<void> {
  await ensureCollection(db, COLLECTION, {
    bsonType: "object",
    required: ["childId", "age", "grade", "createdAt"],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      childId: { bsonType: "string" },
      age: { bsonType: "int" },
      grade: { bsonType: "string" },
      readingLevelScale: { bsonType: "string" },
      readingLevelValue: { bsonType: "string" },
      createdAt: { bsonType: "date" },
    },
  });
  await db
    .collection(COLLECTION)
    .createIndex({ childId: 1 }, { name: "childId_unique", unique: true });
}
