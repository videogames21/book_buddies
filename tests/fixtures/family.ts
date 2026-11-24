import { createHash, randomBytes } from "node:crypto";
import { ObjectId } from "mongodb";
import { getDb } from "@/server/lib/db";
import { insertParent } from "./users";

// A Consent Record in the shape UC-PAR-onboarding writes (design/par.md, Data model).
// The token is random and thrown away: fixtures never confirm through the link.

export async function insertConsentRecord(
  parent: { userId: string; familyId: string },
  confirmed: boolean,
) {
  const acknowledgedAt = new Date("2026-10-01T12:00:00Z");
  await getDb()
    .collection("consentRecords")
    .insertOne({
      familyId: new ObjectId(parent.familyId),
      parentUserId: new ObjectId(parent.userId),
      noticeVersion: "test",
      method: "email-plus",
      acknowledgedAt,
      confirmBy: new Date("2026-10-15T12:00:00Z"),
      confirmationTokenHash: createHash("sha256")
        .update(randomBytes(32))
        .digest("hex"),
      ...(confirmed && { confirmedAt: acknowledgedAt }),
    });
}

/** A Main Parent whose family's consent is confirmed: the caller this use case expects. */
export async function insertConsentedMainParent() {
  const parent = await insertParent({ parentRole: "main" });
  await insertConsentRecord(parent, true);
  return parent;
}
