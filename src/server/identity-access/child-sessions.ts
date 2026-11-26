import "server-only";
import type { Db, ObjectId } from "mongodb";
import { ensureCollection } from "@/server/lib/collections";

// Identity & Access's end times for a child's session (design/shlf.md, Data model). Kept
// apart from the Auth.js session document, so nothing Auth.js does to that document can
// move `endsAt`. It holds no name, username or child ID, and is deleted with the session.

export const CHILD_SESSION_ENDS = "childSessionEnds";

export type ChildSessionEndDocument = {
  _id: ObjectId;
  /** The `_id` of the session document, never its token. */
  sessionId: ObjectId;
  /** The next midnight after sign-in: after it the session cannot start a new visit. */
  endsAt: Date;
  /** The last keep-alive or accepted request. */
  lastSeenAt: Date;
  /** The last time the child did something. A keep-alive alone does not count. */
  lastActiveAt: Date;
};

export async function ensureChildSessionIndexes(db: Db): Promise<void> {
  await ensureCollection(db, CHILD_SESSION_ENDS, {
    bsonType: "object",
    required: ["_id", "sessionId", "endsAt", "lastSeenAt", "lastActiveAt"],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      sessionId: { bsonType: "objectId" },
      endsAt: { bsonType: "date" },
      lastSeenAt: { bsonType: "date" },
      lastActiveAt: { bsonType: "date" },
    },
  });
  await db
    .collection(CHILD_SESSION_ENDS)
    .createIndex({ sessionId: 1 }, { name: "sessionId_unique", unique: true });
}
