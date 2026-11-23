import { ObjectId } from "mongodb";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { insertConsentRecord } from "../../../tests/fixtures/family";
import { insertParent } from "../../../tests/fixtures/users";
import { resetDatabase } from "../../../tests/integration/db";
import { resetClock, setClock } from "@/server/lib/clock";
import { getDb } from "@/server/lib/db";
import { getOnboardingStep } from "./families";

// The fixture's unconfirmed record has confirmBy 2026-10-15T12:00:00Z.
const at = (iso: string) => {
  setClock(() => new Date(iso));
};
type ChildRow = { _id: string; [field: string]: unknown };

describe("getOnboardingStep", () => {
  beforeEach(resetDatabase);
  afterEach(resetClock);

  it("is awaiting before the deadline and expired from the deadline on", async () => {
    const parent = await insertParent({ parentRole: "main" });
    await insertConsentRecord(parent, false);
    at("2026-10-15T11:59:59Z");
    expect(await getOnboardingStep(parent.familyId)).toBe("awaiting");
    at("2026-10-15T12:00:00Z");
    expect(await getOnboardingStep(parent.familyId)).toBe("expired");
  });

  it("needs a first child once confirmed, then is complete", async () => {
    const parent = await insertParent({ parentRole: "main" });
    await insertConsentRecord(parent, true);
    expect(await getOnboardingStep(parent.familyId)).toBe("needs-first-child");
    await getDb()
      .collection<ChildRow>("children")
      .insertOne({
        _id: "11111111-1111-4111-8111-111111111111",
        familyId: new ObjectId(parent.familyId),
        nickname: "Otter",
        avatar: "1",
        createdAt: new Date(),
      });
    expect(await getOnboardingStep(parent.familyId)).toBe("complete");
  });

  it("does not count another family's child", async () => {
    const parent = await insertParent({ parentRole: "main" });
    await insertConsentRecord(parent, true);
    await getDb().collection<ChildRow>("children").insertOne({
      _id: "22222222-2222-4222-8222-222222222222",
      familyId: new ObjectId(),
      nickname: "Maple",
      avatar: "1",
      createdAt: new Date(),
    });
    expect(await getOnboardingStep(parent.familyId)).toBe("needs-first-child");
  });

  it("treats a missing or revoked record as not confirmed", async () => {
    const parent = await insertParent({ parentRole: "main" });
    expect(await getOnboardingStep(parent.familyId)).toBe("awaiting");
    await insertConsentRecord(parent, true);
    await getDb()
      .collection("consentRecords")
      .updateOne(
        { familyId: new ObjectId(parent.familyId) },
        { $set: { revokedAt: new Date() } },
      );
    expect(await getOnboardingStep(parent.familyId)).toBe("awaiting");
  });
});
