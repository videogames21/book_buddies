import "server-only";
import type { Db } from "mongodb";
import { now } from "@/server/lib/clock";
import { ensureCollection } from "@/server/lib/collections";
import { getDb, type Tx } from "@/server/lib/db";

// One record per successful child sign-in (DI-usage-records, design/shlf.md): the opaque
// child ID and the time. No IP address, device identifier or session length, which the
// validator refuses.

export const CHILD_SIGN_INS = "childSignIns";

type ChildSignInDocument = { childId: string; at: Date };

export async function ensureChildSignInIndexes(db: Db): Promise<void> {
  await ensureCollection(db, CHILD_SIGN_INS, {
    bsonType: "object",
    required: ["_id", "childId", "at"],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      childId: { bsonType: "string", minLength: 1 },
      at: { bsonType: "date" },
    },
  });
  await db
    .collection(CHILD_SIGN_INS)
    .createIndex({ childId: 1, at: 1 }, { name: "childId_at" });
}

/** Written in the sign-in transaction, so there is no session without its record (§8.2.8). */
export async function recordChildSignIn(
  tx: Tx,
  childId: string,
): Promise<void> {
  await getDb()
    .collection<ChildSignInDocument>(CHILD_SIGN_INS)
    .insertOne({ childId, at: now() }, { session: tx });
}

/** UC-PAR-delete-kid-account: every sign-in record of the child, in its transaction. */
export async function deleteChildSignInRecords(
  tx: Tx,
  childId: string,
): Promise<void> {
  await getDb()
    .collection<ChildSignInDocument>(CHILD_SIGN_INS)
    .deleteMany({ childId }, { session: tx });
}
