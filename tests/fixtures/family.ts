import { ObjectId } from "mongodb";
import { getDb } from "@/server/lib/db";
import { insertParent } from "./users";

// A family as UC-PAR-onboarding is assumed to leave it (design/par.md, Open questions).

export async function insertConsentRecord(familyId: string, confirmed: boolean) {
  await getDb()
    .collection("consentRecords")
    .insertOne({ familyId: new ObjectId(familyId), ...(confirmed && { confirmedAt: new Date("2026-10-01T12:00:00Z") }) });
}

/** A Main Parent whose family's consent is confirmed: the caller this use case expects. */
export async function insertConsentedMainParent() {
  const parent = await insertParent({ parentRole: "main" });
  await insertConsentRecord(parent.familyId, true);
  return parent;
}
