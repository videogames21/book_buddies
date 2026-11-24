import { ObjectId } from "mongodb";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { insertConsentRecord } from "../../../tests/fixtures/family";
import { insertParent } from "../../../tests/fixtures/users";
import { resetDatabase } from "../../../tests/integration/db";
import { createDatabaseSession } from "@/server/identity-access/sessions";
import { resetClock, setClock } from "@/server/lib/clock";
import { getDb, withTransaction } from "@/server/lib/db";
import {
  getOnboardingStep,
  hashConfirmationToken,
  newConfirmationToken,
  removeExpiredUnconfirmedFamily,
} from "./families";

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

describe("admin boundary (DI-consent-record)", () => {
  it("no export returns a Consent Record's fields; reads answer a step or a result code", async () => {
    const families = await import("./families");
    // createFamily and resendConsentEmailFor return whether an email was sent;
    // confirmConsentByToken the family ID; getOnboardingStep a step name. None is reachable
    // from an admin page or action.
    expect(Object.keys(families).sort()).toEqual([
      "confirmConsentByToken",
      "createFamily",
      "getOnboardingStep",
      "hashConfirmationToken",
      "newConfirmationToken",
      "purgeExpiredUnconfirmed",
      "removeExpiredUnconfirmedFamily",
      "resendConsentEmailFor",
    ]);
  });
});

describe("newConfirmationToken", () => {
  it("returns a random token and only its SHA-256 hash to store", () => {
    const first = newConfirmationToken();
    const second = newConfirmationToken();
    expect(first.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(first.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(first.tokenHash).not.toContain(first.token);
    expect(first.tokenHash).toBe(hashConfirmationToken(first.token));
    expect(second.token).not.toBe(first.token);
  });
});

describe("removeExpiredUnconfirmedFamily", () => {
  beforeEach(resetDatabase);
  afterEach(resetClock);

  const remove = (familyId: string) =>
    withTransaction((tx) => removeExpiredUnconfirmedFamily(tx, familyId));

  /** A parent with a Consent Record, a session and a throttle row. */
  async function seed(confirmed: boolean) {
    const parent = await insertParent({ parentRole: "main" });
    await insertConsentRecord(parent, confirmed);
    await createDatabaseSession(parent.userId);
    const userId = new ObjectId(parent.userId);
    const user = await getDb().collection("users").findOne({ _id: userId });
    const accountKey = user?.email as string;
    await getDb()
      .collection("signInAttempts")
      .insertOne({
        accountKey,
        failures: 2,
        allowedAt: new Date("2026-10-01T12:00:00Z"),
        expiresAt: new Date("2030-01-01T00:00:00Z"),
      });
    return { ...parent, objectId: userId, accountKey };
  }

  async function remaining(family: Awaited<ReturnType<typeof seed>>) {
    const db = getDb();
    return {
      users: await db
        .collection("users")
        .countDocuments({ _id: family.objectId }),
      sessions: await db
        .collection("sessions")
        .countDocuments({ userId: family.objectId }),
      attempts: await db
        .collection("signInAttempts")
        .countDocuments({ accountKey: family.accountKey }),
      records: await db
        .collection("consentRecords")
        .countDocuments({ familyId: new ObjectId(family.familyId) }),
    };
  }
  const all = { users: 1, sessions: 1, attempts: 1, records: 1 };
  const none = { users: 0, sessions: 0, attempts: 0, records: 0 };

  it("deletes an expired family and appends one IDs-only audit entry", async () => {
    const family = await seed(false);
    const other = await seed(false);
    await getDb()
      .collection("consentRecords")
      .updateOne(
        { familyId: new ObjectId(other.familyId) },
        { $set: { confirmBy: new Date("2026-10-20T12:00:00Z") } },
      );
    at("2026-10-15T12:00:00Z");

    expect(await remove(family.familyId)).toBe(true);

    expect(await remaining(family)).toEqual(none);
    expect(await remaining(other)).toEqual(all);
    const audit = await getDb().collection("auditLog").find().toArray();
    expect(audit).toHaveLength(1);
    const { _id, ...entry } = audit[0] ?? {};
    expect(_id).toBeDefined();
    expect(entry).toEqual({
      actorRole: "system",
      event: "account.unconfirmed-purged",
      userId: family.objectId,
      familyId: new ObjectId(family.familyId),
      occurredAt: new Date("2026-10-15T12:00:00Z"),
    });
  });

  it("leaves a family before its deadline untouched", async () => {
    const family = await seed(false);
    at("2026-10-15T11:59:59Z");
    expect(await remove(family.familyId)).toBe(false);
    expect(await remaining(family)).toEqual(all);
    expect(await getDb().collection("auditLog").countDocuments()).toBe(0);
  });

  it("leaves a confirmed family untouched after the deadline", async () => {
    const family = await seed(true);
    at("2026-11-01T12:00:00Z");
    expect(await remove(family.familyId)).toBe(false);
    expect(await remaining(family)).toEqual(all);
    expect(await getDb().collection("auditLog").countDocuments()).toBe(0);
  });

  it("also deletes the parent's password reset record", async () => {
    const family = await seed(false);
    await getDb()
      .collection("passwordResets")
      .insertOne({
        userId: family.objectId,
        tokenHash: "a".repeat(64),
        issuedAt: new Date("2026-10-14T12:00:00Z"),
        expiresAt: new Date("2026-10-30T12:00:00Z"),
      });
    at("2026-10-15T12:00:00Z");
    expect(await remove(family.familyId)).toBe(true);
    expect(await getDb().collection("passwordResets").countDocuments()).toBe(0);
  });

  it("removes nothing when its transaction aborts", async () => {
    const family = await seed(false);
    at("2026-10-15T12:00:00Z");
    await expect(
      withTransaction(async (tx) => {
        await removeExpiredUnconfirmedFamily(tx, family.familyId);
        throw new Error("invented failure");
      }),
    ).rejects.toThrow("invented failure");
    expect(await remaining(family)).toEqual(all);
    expect(await getDb().collection("auditLog").countDocuments()).toBe(0);
  });
});
