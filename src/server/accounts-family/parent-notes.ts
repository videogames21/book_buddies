import "server-only";
import { ObjectId, type Db } from "mongodb";
import { now } from "@/server/lib/clock";
import { getDb, type Tx } from "@/server/lib/db";
import { ensureCollection } from "@/server/lib/collections";

export type NoteState = "none" | "flagged" | "check_not_run";
export async function insertParentNote(
  tx: Tx,
  childId: string,
  text: string,
  flag: NoteState,
): Promise<ObjectId> {
  const _id = new ObjectId();
  await getDb()
    .collection("parentNotes")
    .insertOne({ _id, childId, text, flag, savedAt: now() }, { session: tx });
  return _id;
}

export async function ensureParentNoteIndexes(db: Db): Promise<void> {
  await ensureCollection(db, "parentNotes", {
    bsonType: "object",
    required: ["childId", "text", "flag", "savedAt"],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      childId: { bsonType: "string" },
      text: { bsonType: "string", minLength: 1, maxLength: 250 },
      flag: { enum: ["none", "flagged", "check_not_run"] },
      savedAt: { bsonType: "date" },
    },
  });
  await db.collection("parentNotes").createIndex({ childId: 1 });
}
