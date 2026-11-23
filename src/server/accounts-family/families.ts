import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { ObjectId } from "mongodb";
import { appendUnconfirmedPurgeAudit } from "@/server/audit/audit-log";
import { deleteParentAccount } from "@/server/identity-access/parent-accounts";
import { now } from "@/server/lib/clock";
import { getDb, type Tx } from "@/server/lib/db";
import { familyHasChild } from "./child-accounts";
import { CONSENT_RECORDS } from "./consent-record-schema";

// Accounts & Family's families (UC-PAR-onboarding). A family is its `familyId`; there
// is no family collection. This module owns `consentRecords` (DI-consent-record).

/** The SHA-256 hash stored in place of a confirmation token (design/par.md). */
export function hashConfirmationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** 32 random bytes for the emailed link; only the hash is ever stored. */
export function newConfirmationToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashConfirmationToken(token) };
}

/**
 * 6a: removes a family whose consent deadline has passed unconfirmed: its Consent
 * Record, the parent's name, email and hash, sessions and throttle row, plus an
 * IDs-only audit entry (§8.2.9). The deadline is part of the delete's own filter, so a
 * confirmed or unexpired family is never touched. No child data can exist before
 * confirmation. Returns whether a family was removed.
 */
export async function removeExpiredUnconfirmedFamily(
  tx: Tx,
  familyId: string,
): Promise<boolean> {
  const record = await getDb()
    .collection<{
      familyId: ObjectId;
      parentUserId: ObjectId;
      confirmBy: Date;
    }>(CONSENT_RECORDS)
    .findOneAndDelete(
      {
        familyId: new ObjectId(familyId),
        confirmedAt: { $exists: false },
        confirmBy: { $lte: now() },
      },
      { projection: { parentUserId: 1 }, session: tx },
    );
  if (!record) return false;
  const userId = record.parentUserId.toHexString();
  await deleteParentAccount(tx, userId);
  await appendUnconfirmedPurgeAudit(tx, userId, familyId);
  return true;
}

export type OnboardingStep =
  "awaiting" | "expired" | "needs-first-child" | "complete";

/**
 * Where a Main Parent is in onboarding, read from the Consent Record and the family's
 * children (UC-PAR-onboarding 8a). The deadline is checked here, on read. A missing or
 * revoked record is not confirmed, the same answer isConsentConfirmed gives.
 */
export async function getOnboardingStep(
  familyId: string,
): Promise<OnboardingStep> {
  const record = await getDb()
    .collection<{ confirmBy: Date; confirmedAt?: Date; revokedAt?: Date }>(
      CONSENT_RECORDS,
    )
    .findOne(
      { familyId: new ObjectId(familyId) },
      { projection: { confirmBy: 1, confirmedAt: 1, revokedAt: 1 } },
    );
  if (!record || record.revokedAt) return "awaiting";
  if (!record.confirmedAt) {
    return record.confirmBy > now() ? "awaiting" : "expired";
  }
  return (await familyHasChild(familyId)) ? "complete" : "needs-first-child";
}
