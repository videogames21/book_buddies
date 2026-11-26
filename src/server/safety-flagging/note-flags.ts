import "server-only";
import { ObjectId, type Db } from "mongodb";
import { now } from "@/server/lib/clock";
import { getDb, type Tx } from "@/server/lib/db";
import { ensureCollection } from "@/server/lib/collections";
import type { ScreenResult } from "./screen-note";

export async function insertNoteFlag(
  tx: Tx,
  noteId: ObjectId,
  childId: string,
  result: ScreenResult,
): Promise<ObjectId> {
  const _id = new ObjectId();
  await getDb()
    .collection("noteFlags")
    .insertOne(
      {
        _id,
        noteId,
        childId,
        categories: [...new Set(result.passages.map((p) => p.category))],
        passages: result.passages,
        detectorMethod: "word-list",
        detectorVersion: result.version,
        status: "open",
        flaggedAt: now(),
      },
      { session: tx },
    );
  return _id;
}

/**
 * UC-PAR-delete-kid-account 5a: the child's note flags, whatever their status. Earlier
 * `parent-note-flagged` audit entries stay (§8.2.9). Dangerous content list entries for
 * the child are added here when UC-ADM-flag-review builds the list.
 */
export async function deleteChildRecords(
  tx: Tx,
  childId: string,
): Promise<void> {
  await getDb()
    .collection("noteFlags")
    .deleteMany({ childId }, { session: tx });
}

export async function ensureNoteFlagIndexes(db: Db): Promise<void> {
  await ensureCollection(db, "noteFlags", {
    bsonType: "object",
    required: [
      "noteId",
      "childId",
      "categories",
      "passages",
      "detectorMethod",
      "detectorVersion",
      "status",
      "flaggedAt",
    ],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      noteId: { bsonType: "objectId" },
      childId: { bsonType: "string" },
      categories: {
        bsonType: "array",
        minItems: 1,
        items: { bsonType: "string" },
      },
      passages: {
        bsonType: "array",
        minItems: 1,
        items: {
          bsonType: "object",
          required: ["start", "end", "category"],
          properties: {
            start: { bsonType: "int" },
            end: { bsonType: "int" },
            category: { bsonType: "string" },
          },
        },
      },
      detectorMethod: { enum: ["word-list"] },
      detectorVersion: { bsonType: "string" },
      status: { enum: ["open"] },
      flaggedAt: { bsonType: "date" },
    },
  });
  await db.collection("noteFlags").createIndex({ noteId: 1 }, { unique: true });
  await db
    .collection("noteFlags")
    .createIndex({ childId: 1 }, { name: "childId" });
}
