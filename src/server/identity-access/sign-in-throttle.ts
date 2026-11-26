import "server-only";
import type { Db } from "mongodb";
import { now } from "@/server/lib/clock";
import { ensureCollection } from "@/server/lib/collections";
import { getDb, type Tx } from "@/server/lib/db";

// Sign-in throttling per account key, the lowercased email (SEC-signin-throttling,
// design/par-field-values.md). A growing delay and never a lockout. The key is an email,
// so it is never logged (§8.2.7). A count restarts 24 hours after its last wait ends, and
// the daily cleanup deletes rows past that time (KD-time-rules-on-read).
//
// Every password entry point goes through checkPasswordAttempt, which claims the attempt,
// runs the check and records its outcome, so no caller sequences those steps itself
// (design/par.md, Child-data review dependencies). `pending` counts claimed attempts
// whose check has not finished, so a correct password clears only the failures that
// have settled and keeps one that is still in flight (§8.2.8).

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
  /** Claimed attempts whose check has not finished. Absent on rows from before it. */
  pending?: number;
  allowedAt: Date;
  expiresAt: Date;
};

export type AttemptClaim =
  { allowed: true } | { allowed: false; waitSeconds: number };

export type PasswordAttempt =
  | { outcome: "matched" }
  | { outcome: "refused" }
  | { outcome: "wait"; waitSeconds: number };

export async function ensureSignInAttemptIndexes(db: Db): Promise<void> {
  await ensureCollection(db, SIGN_IN_ATTEMPTS, {
    bsonType: "object",
    required: ["accountKey", "failures", "allowedAt", "expiresAt"],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      accountKey: { bsonType: "string", minLength: 1 },
      failures: { bsonType: ["int", "long"], minimum: 0 },
      pending: { bsonType: ["int", "long"], minimum: 0 },
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
 * The one way to check a password (SEC-signin-throttling). Claims the attempt first, so
 * a waiting account never runs `verify` (no scrypt), then records the outcome whether
 * `verify` resolves true, false or throws. A throw counts as a wrong password and is
 * rethrown.
 */
export async function checkPasswordAttempt(
  accountKey: string,
  verify: () => Promise<boolean>,
): Promise<PasswordAttempt> {
  const claim = await claimSignInAttempt(accountKey);
  if (!claim.allowed) {
    return { outcome: "wait", waitSeconds: claim.waitSeconds };
  }
  let matched = false;
  try {
    matched = await verify();
  } finally {
    await settleAttempt(accountKey, matched);
  }
  return matched ? { outcome: "matched" } : { outcome: "refused" };
}

/**
 * Counts this attempt as a failure, and as pending, before the password is checked, in
 * one conditional update, so parallel guesses cannot all pass the check (§8.2.8).
 * Callers outside this module use checkPasswordAttempt.
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
        pending: 0,
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
          pending: {
            $cond: [
              { $gte: [at, "$expiresAt"] },
              1,
              { $add: [{ $ifNull: ["$pending", 0] }, 1] },
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

/**
 * Records how a claimed attempt ended, in one update on the account's row, so it
 * composes with claims and outcomes running at the same time. A wrong password leaves
 * its failure counted and is no longer pending. A correct password sets the failures to
 * the attempts still pending: those were counted when claimed and have not settled, so
 * a wrong one finishing later is not lost. The row goes once nothing is counted.
 */
async function settleAttempt(
  accountKey: string,
  matched: boolean,
): Promise<void> {
  const attempts = getDb().collection<SignInAttempt>(SIGN_IN_ATTEMPTS);
  if (!matched) {
    await attempts.updateOne(
      { accountKey, pending: { $gt: 0 } },
      { $inc: { pending: -1 } },
    );
    return;
  }
  const at = now();
  await attempts.updateOne({ accountKey }, [
    {
      $set: {
        pending: {
          $max: [0, { $subtract: [{ $ifNull: ["$pending", 0] }, 1] }],
        },
      },
    },
    { $set: { failures: "$pending" } },
    {
      $set: {
        allowedAt: {
          $cond: [
            { $lt: ["$failures", FAILURES_BEFORE_DELAY] },
            at,
            "$allowedAt",
          ],
        },
      },
    },
  ]);
  await attempts.deleteOne({ accountKey, pending: 0, failures: 0 });
}

/**
 * Deletes the count outright, whatever is in flight: for a password reset and an
 * account's deletion, not for a successful check. Pass `tx` when the count must clear
 * together with another change.
 */
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
