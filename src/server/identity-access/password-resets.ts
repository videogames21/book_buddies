import "server-only";
import { ObjectId } from "mongodb";
import { now } from "@/server/lib/clock";
import { getDb, type Tx } from "@/server/lib/db";
import { PASSWORD_RESETS } from "./password-reset-schema";

// Identity & Access's password reset records (OI-44, design/par.md). At most one per
// user; only the token's hash is stored, and the expiry is checked on read.

type PasswordReset = {
  userId: ObjectId;
  tokenHash: string;
  issuedAt: Date;
  expiresAt: Date;
};

const resets = () => getDb().collection<PasswordReset>(PASSWORD_RESETS);

/** Removes a user's reset record, with the rest of their account (6a purge). */
export async function deletePasswordResetOf(
  userId: string,
  tx: Tx,
): Promise<void> {
  await resets().deleteOne({ userId: new ObjectId(userId) }, { session: tx });
}

/** Scheduled Cleanup: deletes only records that have already expired. */
export async function purgeExpiredResets(): Promise<number> {
  const { deletedCount } = await resets().deleteMany({
    expiresAt: { $lte: now() },
  });
  return deletedCount;
}
