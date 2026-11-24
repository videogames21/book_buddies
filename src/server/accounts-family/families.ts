import "server-only";
import { ObjectId, type Db } from "mongodb";
import { now } from "@/server/lib/clock";
import { ensureCollection } from "@/server/lib/collections";
import { getDb } from "@/server/lib/db";
import { familyHasChild } from "./child-accounts";

// Accounts & Family's families (UC-PAR-onboarding). A family is its `familyId`; there
// is no family collection. This module owns `consentRecords` (DI-consent-record).

export const CONSENT_RECORDS = "consentRecords";

/**
 * One Consent Record per family. "Awaiting confirmation" is a record with no
 * `confirmedAt`; `confirmBy` is the deadline every read compares with now()
 * (KD-time-rules-on-read). `childCreationVersion` and `revokedAt` are the contract
 * child-accounts.ts already relies on.
 */
export async function ensureConsentRecordIndexes(db: Db): Promise<void> {
  await ensureCollection(db, CONSENT_RECORDS, {
    bsonType: "object",
    required: [
      "familyId",
      "parentUserId",
      "noticeVersion",
      "method",
      "acknowledgedAt",
      "confirmBy",
      "confirmationTokenHash",
    ],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      familyId: { bsonType: "objectId" },
      parentUserId: { bsonType: "objectId" },
      noticeVersion: { bsonType: "string", minLength: 1 },
      method: { enum: ["email-plus"] },
      acknowledgedAt: { bsonType: "date" },
      confirmBy: { bsonType: "date" },
      confirmationTokenHash: { bsonType: "string", pattern: "^[0-9a-f]{64}$" },
      confirmedAt: { bsonType: "date" },
      revokedAt: { bsonType: "date" },
      childCreationVersion: { bsonType: ["int", "long"] },
    },
  });
  await db
    .collection(CONSENT_RECORDS)
    .createIndex({ familyId: 1 }, { name: "familyId_unique", unique: true });
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
