import "server-only";
import { ObjectId, type Db } from "mongodb";
import { now } from "@/server/lib/clock";
import { getDb, type Tx } from "@/server/lib/db";
import { ensureCollection } from "@/server/lib/collections";
import {
  catalogKeysForInterest,
  INTEREST_OPTIONS,
} from "@/server/recommendation/interests";
import { GENRES, SUBJECTS } from "@/shared/catalog/tags";

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

/** UC-PAR-delete-kid-account: the child's parent notes, flagged or not (5a). */
export async function deleteChildRecords(
  tx: Tx,
  childId: string,
): Promise<void> {
  await getDb()
    .collection("parentNotes")
    .deleteMany({ childId }, { session: tx });
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

const noteKeys = new Map<string, readonly string[]>([
  ...[...GENRES, ...SUBJECTS].map((key) => [key, [key]] as const),
  ...INTEREST_OPTIONS.map(
    ({ key, label }) =>
      [label.toLowerCase(), catalogKeysForInterest(key)] as const,
  ),
]);

const notePhrases = [...noteKeys.keys()]
  .sort((first, second) => second.length - first.length)
  .map((phrase) => phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");

const notePattern = new RegExp(
  `(?<![\\p{L}\\p{N}])(?:${notePhrases})(?![\\p{L}\\p{N}])`,
  "giu",
);

/** Projects only known interest keys from the latest retained note (OI-2). */
export async function listLatestNoteInterestKeys(
  childId: string,
  tx?: Tx,
): Promise<string[]> {
  const note = await getDb()
    .collection<{ text: string }>("parentNotes")
    .findOne(
      { childId },
      { sort: { savedAt: -1, _id: 1 }, projection: { text: 1 }, session: tx },
    );
  if (!note) return [];

  const keys = new Set<string>();
  for (const match of note.text.matchAll(notePattern)) {
    for (const key of noteKeys.get(match[0].toLowerCase()) ?? []) {
      keys.add(key);
      if (keys.size === 3) return [...keys];
    }
  }
  return [...keys];
}
