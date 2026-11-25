import "server-only";
import type { Db } from "mongodb";
import { ensureCollection } from "@/server/lib/collections";

// The schema of Identity & Access's `passwordResets` (OI-44, design/par.md, Data model).
// Kept apart from password-resets.ts so the index setup script, which runs outside
// Next.js, loads no session code.

export const PASSWORD_RESETS = "passwordResets";

/**
 * At most one per user. Only the token's SHA-256 hash is stored; `expiresAt` is checked
 * on read (KD-time-rules-on-read) and the daily cleanup deletes rows past it.
 */
export async function ensurePasswordResetIndexes(db: Db): Promise<void> {
  await ensureCollection(db, PASSWORD_RESETS, {
    bsonType: "object",
    required: ["userId", "tokenHash", "issuedAt", "expiresAt"],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      userId: { bsonType: "objectId" },
      tokenHash: { bsonType: "string", pattern: "^[0-9a-f]{64}$" },
      issuedAt: { bsonType: "date" },
      expiresAt: { bsonType: "date" },
    },
  });
  const resets = db.collection(PASSWORD_RESETS);
  await resets.createIndex(
    { userId: 1 },
    { name: "userId_unique", unique: true },
  );
  await resets.createIndex(
    { tokenHash: 1 },
    { name: "tokenHash_unique", unique: true },
  );
  await resets.createIndex({ expiresAt: 1 }, { name: "expiresAt" });
}
