import "server-only";
import { ObjectId, type Db, type Filter } from "mongodb";
import { now } from "@/server/lib/clock";
import { ensureCollection } from "@/server/lib/collections";
import { getConfig } from "@/server/lib/config";
import { getDb, withTransaction, type Tx } from "@/server/lib/db";

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

const records = () =>
  getDb().collection<ChildSessionEndDocument>(CHILD_SESSION_ENDS);

/**
 * The one statement of when a child's session is still running (design/shlf.md, Key
 * decisions): the child did something less than the idle time ago, and midnight has not
 * passed or the visit is still open, meaning it was seen within the grace.
 */
function runningAt(at: Date): Filter<ChildSessionEndDocument> {
  const { CHILD_IDLE_MINUTES, CHILD_LEAVE_GRACE_SECONDS } = getConfig();
  const idleSince = new Date(at.getTime() - CHILD_IDLE_MINUTES * 60 * 1000);
  const seenSince = new Date(at.getTime() - CHILD_LEAVE_GRACE_SECONDS * 1000);
  return {
    lastActiveAt: { $gt: idleSince },
    $or: [{ endsAt: { $gt: at } }, { lastSeenAt: { $gte: seenSince } }],
  };
}

/** Written with the session document, in the sign-in transaction. */
export async function insertChildSessionEnd(
  sessionId: ObjectId,
  endsAt: Date,
  tx?: Tx,
): Promise<void> {
  const at = now();
  await records().insertOne(
    {
      _id: new ObjectId(),
      sessionId,
      endsAt,
      lastSeenAt: at,
      lastActiveAt: at,
    },
    tx ? { session: tx } : {},
  );
}

/**
 * Checks the session against now() on every read (§8.2.2). A running session is marked
 * as seen, and as used when `countsAsActivity`. One that is over, or has no record, is
 * deleted with its record, and `false` comes back.
 */
export async function continueChildSession(
  sessionId: ObjectId,
  countsAsActivity: boolean,
): Promise<boolean> {
  const at = now();
  const running = runningAt(at);
  // $max, so a request that arrives out of order cannot move a time backwards.
  const kept = await records().findOneAndUpdate(
    { sessionId, ...running },
    {
      $max: countsAsActivity
        ? { lastSeenAt: at, lastActiveAt: at }
        : { lastSeenAt: at },
    },
    { projection: { _id: 1 } },
  );
  if (kept) return true;
  await endUnlessRunning(sessionId, running);
  return false;
}

async function endUnlessRunning(
  sessionId: ObjectId,
  running: Filter<ChildSessionEndDocument>,
): Promise<boolean> {
  return withTransaction(async (tx) => {
    // Checked again in the transaction: a request that refreshed the record since the
    // check above keeps its session, and one doing so now conflicts with the delete.
    const refreshed = await records().findOne(
      { sessionId, ...running },
      { projection: { _id: 1 }, session: tx },
    );
    if (refreshed) return false;
    await records().deleteOne({ sessionId }, { session: tx });
    // The Auth.js session collection, which Identity & Access also writes (sessions.ts).
    await getDb()
      .collection("sessions")
      .deleteOne({ _id: sessionId }, { session: tx });
    return true;
  });
}

/**
 * Scheduled Cleanup: ends every session that is over, which a slid `expires` would
 * otherwise keep, and deletes each record whose session is already gone, so no activity
 * time outlives its session by more than a day. Returns how many records it removed.
 */
export async function purgeEndedChildSessions(): Promise<number> {
  const running = runningAt(now());
  let purged = 0;
  const over = records().find(
    { $nor: [running] },
    { projection: { sessionId: 1 } },
  );
  for await (const { sessionId } of over) {
    if (await endUnlessRunning(sessionId, running)) purged++;
  }

  const orphans = await records()
    .aggregate<{ _id: ObjectId }>([
      {
        $lookup: {
          from: "sessions",
          localField: "sessionId",
          foreignField: "_id",
          as: "session",
        },
      },
      { $match: { session: { $size: 0 } } },
      { $project: { _id: 1 } },
    ])
    .toArray();
  const { deletedCount } = await records().deleteMany({
    _id: { $in: orphans.map((orphan) => orphan._id) },
  });
  return purged + deletedCount;
}

/** For a session ended some other way, such as sign-out. */
export async function deleteChildSessionEnd(
  sessionId: ObjectId,
): Promise<void> {
  await records().deleteOne({ sessionId });
}
