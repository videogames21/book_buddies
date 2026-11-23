import "server-only";
import { ObjectId } from "mongodb";
import { now } from "@/server/lib/clock";
import { getDb } from "@/server/lib/db";
import { familyHasChild } from "./child-accounts";
import { CONSENT_RECORDS } from "./consent-record-schema";

// Accounts & Family's families (UC-PAR-onboarding). A family is its `familyId`; there
// is no family collection. This module owns `consentRecords` (DI-consent-record).

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
