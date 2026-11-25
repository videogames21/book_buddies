import "server-only";
import type { Db } from "mongodb";
import { now } from "@/server/lib/clock";
import { ensureCollection } from "@/server/lib/collections";
import { getDb, type Tx } from "@/server/lib/db";

// Sign-in throttling per account key, the lowercased email (SEC-signin-throttling,
// design/par-field-values.md). A growing delay and never a lockout. The key is an email,
// so it is never logged (§8.2.7). A count restarts 24 hours after its last wait ends, and
// the daily cleanup deletes rows past that time (KD-time-rules-on-read).

const SIGN_IN_ATTEMPTS = "signInAttempts";
const FAILURES_BEFORE_DELAY = 5;
const FIRST_DELAY_SECONDS = 30;
const MAX_DELAY_SECONDS = 15 * 60;
// 30 seconds doubled this many times passes the cap, so the exponent can stop here.
const MAX_DOUBLINGS = 5;
const RETENTION_HOURS = 24;

type SignInAttempt = {
  accountKey: string;
  failures: number;
  allowedAt: Date;
  expiresAt: Date;
};

export type AttemptClaim =
  { allowed: true } | { allowed: false; waitSeconds: number };

export async function ensureSignInAttemptIndexes(db: Db): Promise<void> {
  await ensureCollection(db, SIGN_IN_ATTEMPTS, {
    bsonType: "object",
    required: ["accountKey", "failures", "allowedAt", "expiresAt"],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      accountKey: { bsonType: "string", minLength: 1 },
      failures: { bsonType: ["int", "long"], minimum: 0 },
      allowedAt: { bsonType: "date" },
      expiresAt: { bsonType: "date" },
    },
  });
  await db
    .collection(SIGN_IN_ATTEMPTS)
    .createIndex(
      { accountKey: 1 },
      { name: "accountKey_unique", unique: true },
    );
  await db
    .collection(SIGN_IN_ATTEMPTS)
    .createIndex({ expiresAt: 1 }, { name: "expiresAt" });
}

/**
 * Counts this attempt as a failure before the password is checked, in one conditional
 * update, so parallel guesses cannot all pass the check (§8.2.8). A correct password
 * then clears the count.
 */
export async function claimSignInAttempt(
  accountKey: string,
): Promise<AttemptClaim> {
  const at = now();
  const attempts = getDb().collection<SignInAttempt>(SIGN_IN_ATTEMPTS);
  await attempts.updateOne(
    { accountKey },
    {
      $setOnInsert: {
        failures: 0,
        allowedAt: at,
        expiresAt: new Date(at.getTime() + RETENTION_HOURS * 60 * 60 * 1000),
      },
    },
    { upsert: true },
  );
  const claimed = await attempts.findOneAndUpdate(
    { accountKey, allowedAt: { $lte: at } },
    [
      {
        $set: {
          failures: {
            $cond: [
              { $gte: [at, "$expiresAt"] },
              1,
              { $add: ["$failures", 1] },
            ],
          },
        },
      },
      {
        $set: {
          allowedAt: {
            $cond: [
              { $gte: ["$failures", FAILURES_BEFORE_DELAY] },
              {
                $dateAdd: {
                  startDate: at,
                  unit: "second",
                  amount: {
                    $min: [
                      MAX_DELAY_SECONDS,
                      {
                        $multiply: [
                          FIRST_DELAY_SECONDS,
                          {
                            $pow: [
                              2,
                              {
                                $min: [
                                  {
                                    $subtract: [
                                      "$failures",
                                      FAILURES_BEFORE_DELAY,
                                    ],
                                  },
                                  MAX_DOUBLINGS,
                                ],
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                },
              },
              at,
            ],
          },
        },
      },
      {
        $set: {
          expiresAt: {
            $dateAdd: {
              startDate: "$allowedAt",
              unit: "hour",
              amount: RETENTION_HOURS,
            },
          },
        },
      },
    ],
    { projection: { _id: 1 } },
  );
  if (claimed) return { allowed: true };

  const current = await attempts.findOne(
    { accountKey },
    { projection: { allowedAt: 1 } },
  );
  const waitMs = (current?.allowedAt.getTime() ?? at.getTime()) - at.getTime();
  return { allowed: false, waitSeconds: Math.max(1, Math.ceil(waitMs / 1000)) };
}

/** Pass `tx` when the count must clear together with another change. */
export async function clearSignInAttempts(
  accountKey: string,
  tx?: Tx,
): Promise<void> {
  await getDb()
    .collection<SignInAttempt>(SIGN_IN_ATTEMPTS)
    .deleteOne({ accountKey }, tx ? { session: tx } : {});
}

/** Scheduled Cleanup: deletes only counts that have already expired. */
export async function purgeExpiredSignInAttempts(): Promise<number> {
  const { deletedCount } = await getDb()
    .collection<SignInAttempt>(SIGN_IN_ATTEMPTS)
    .deleteMany({ expiresAt: { $lte: now() } });
  return deletedCount;
}
