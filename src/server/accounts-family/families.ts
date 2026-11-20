import "server-only";
import type { Db } from "mongodb";
import { ensureCollection } from "@/server/lib/collections";

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
