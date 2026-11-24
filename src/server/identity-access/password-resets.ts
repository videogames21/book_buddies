import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { ObjectId } from "mongodb";
import { now } from "@/server/lib/clock";
import { getDb, type Tx } from "@/server/lib/db";
import { PASSWORD_RESETS } from "./password-reset-schema";

// Identity & Access's password reset records (OI-44, design/par.md). At most one per
// user; only the token's hash is stored, and the expiry is checked on read. Values are
// the password reset table in design/par-field-values.md.

export const RESET_LIFETIME_MS = 60 * 60 * 1000;
export const RESET_SPACING_MS = 5 * 60 * 1000;

type PasswordReset = {
  userId: ObjectId;
  tokenHash: string;
  issuedAt: Date;
  expiresAt: Date;
};

const resets = () => getDb().collection<PasswordReset>(PASSWORD_RESETS);

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Stores a new token's hash in place of any earlier one, unless one was issued within
 * the minimum spacing. The spacing is in the filter, and the unique `userId` index turns
 * a too-early request into a refused insert, so two requests at once cannot both send.
 * Returns the token for the email, or null when nothing may be sent.
 */
export async function issueResetToken(
  userId: string,
): Promise<{ token: string; expiresAt: Date } | null> {
  const at = now();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(at.getTime() + RESET_LIFETIME_MS);
  try {
    await resets().updateOne(
      {
        userId: new ObjectId(userId),
        issuedAt: { $lte: new Date(at.getTime() - RESET_SPACING_MS) },
      },
      { $set: { tokenHash: hashResetToken(token), issuedAt: at, expiresAt } },
      { upsert: true },
    );
  } catch (err) {
    if ((err as { code?: unknown }).code === 11000) return null;
    throw err;
  }
  return { token, expiresAt };
}

/** The user a still-valid token belongs to, without using it up. */
export async function findResetUser(token: string): Promise<string | null> {
  const reset = await resets().findOne(
    { tokenHash: hashResetToken(token), expiresAt: { $gt: now() } },
    { projection: { userId: 1 } },
  );
  return reset?.userId.toHexString() ?? null;
}

/** Single use: deletes a still-valid token inside the reset transaction. */
export async function consumeResetToken(
  tx: Tx,
  token: string,
): Promise<string | null> {
  const reset = await resets().findOneAndDelete(
    { tokenHash: hashResetToken(token), expiresAt: { $gt: now() } },
    { projection: { userId: 1 }, session: tx },
  );
  return reset?.userId.toHexString() ?? null;
}

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
