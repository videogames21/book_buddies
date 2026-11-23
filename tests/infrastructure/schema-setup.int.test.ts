import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { expect, it } from "vitest";

it("runs the deployment setup command twice without duplicate-index failures", async () => {
  const run = promisify(execFile);
  for (let attempt = 0; attempt < 2; attempt++) {
    const { stdout } = await run(
      process.execPath,
      ["--conditions=react-server", "scripts/ensure-indexes.mjs"],
      { env: process.env },
    );
    expect(stdout).toContain("collections and indexes are ready");
  }
});

it("creates readingProfiles with a unique childId index and a validator", async () => {
  const { getDb } = await import("@/server/lib/db");
  const { ensureIndexes } = await import("@/server/setup/ensure-indexes");
  await ensureIndexes(getDb());
  const profiles = getDb().collection("readingProfiles");
  const indexes = await profiles.indexes();
  expect(
    indexes.find((index) => index.name === "childId_unique"),
  ).toMatchObject({ key: { childId: 1 }, unique: true });
  // The backstop rejects a document that stores a child detail (KD-pii-segregation).
  await expect(
    profiles.insertOne({
      childId: "c",
      interests: [],
      favoriteBookIds: [],
      onboardingComplete: true,
      savedAt: new Date(),
      age: 8,
    }),
  ).rejects.toThrow();
  await profiles.deleteMany({});
});

it("makes users.email unique where set, so 4a is race-free (UC-PAR-onboarding)", async () => {
  const { getDb } = await import("@/server/lib/db");
  const { ensureIndexes } = await import("@/server/setup/ensure-indexes");
  await ensureIndexes(getDb());
  const users = getDb().collection("users");
  await users.insertOne({ role: "parent", email: "taken@example.test" });
  await expect(
    users.insertOne({ role: "parent", email: "taken@example.test" }),
  ).rejects.toThrow(/duplicate key/);
  // Children have no email, so many users without one are allowed.
  await users.insertMany([{ role: "child" }, { role: "child" }]);
  await users.deleteMany({});
});

it("makes signInAttempts unique per account key and indexes its expiry", async () => {
  const { getDb } = await import("@/server/lib/db");
  const { ensureIndexes } = await import("@/server/setup/ensure-indexes");
  await ensureIndexes(getDb());
  const attempts = getDb().collection("signInAttempts");
  const indexes = await attempts.indexes();
  expect(
    indexes.find((index) => index.name === "accountKey_unique"),
  ).toMatchObject({ key: { accountKey: 1 }, unique: true });
  expect(indexes.find((index) => index.name === "expiresAt")).toMatchObject({
    key: { expiresAt: 1 },
  });
  const row = {
    accountKey: "invented@example.test",
    failures: 0,
    allowedAt: new Date(),
    expiresAt: new Date(),
  };
  await attempts.insertOne({ ...row });
  await expect(attempts.insertOne({ ...row })).rejects.toThrow(/duplicate key/);
  await attempts.deleteMany({});
});

it("creates consentRecords with a unique familyId and a validator (DI-consent-record)", async () => {
  const { ObjectId } = await import("mongodb");
  const { getDb } = await import("@/server/lib/db");
  const { ensureIndexes } = await import("@/server/setup/ensure-indexes");
  await ensureIndexes(getDb());
  const records = getDb().collection("consentRecords");
  const familyId = new ObjectId();
  const record = {
    familyId,
    parentUserId: new ObjectId(),
    noticeVersion: "v1",
    method: "email-plus",
    acknowledgedAt: new Date(),
    confirmBy: new Date(),
    confirmationTokenHash: "a".repeat(64),
  };
  await records.insertOne({ ...record });
  await expect(records.insertOne({ ...record })).rejects.toThrow(
    /duplicate key/,
  );
  // A record missing the acknowledgment fields, or storing the plaintext token, is refused.
  await expect(
    records.insertOne({ familyId: new ObjectId(), confirmedAt: new Date() }),
  ).rejects.toThrow();
  await expect(
    records.insertOne({
      ...record,
      familyId: new ObjectId(),
      confirmationToken: "plaintext",
    }),
  ).rejects.toThrow();
  await records.deleteMany({});
});

it("accepts exactly the audit shapes §8.2.9 allows, IDs only", async () => {
  const { ObjectId } = await import("mongodb");
  const { getDb } = await import("@/server/lib/db");
  const { ensureIndexes } = await import("@/server/setup/ensure-indexes");
  await ensureIndexes(getDb());
  const audit = getDb().collection("auditLog");
  const occurredAt = new Date();
  await audit.insertOne({
    actorRole: "system",
    event: "account.unconfirmed-purged",
    userId: new ObjectId(),
    familyId: new ObjectId(),
    occurredAt,
  });
  await audit.insertOne({
    actorId: new ObjectId(),
    actorRole: "parent",
    event: "account.password-reset",
    userId: new ObjectId(),
    occurredAt,
  });
  // No email or name may ride along on a purge entry.
  await expect(
    audit.insertOne({
      actorRole: "system",
      event: "account.unconfirmed-purged",
      userId: new ObjectId(),
      familyId: new ObjectId(),
      email: "someone@example.test",
      occurredAt,
    }),
  ).rejects.toThrow();
  // A purge cannot claim a parent actor.
  await expect(
    audit.insertOne({
      actorRole: "parent",
      event: "account.unconfirmed-purged",
      userId: new ObjectId(),
      familyId: new ObjectId(),
      occurredAt,
    }),
  ).rejects.toThrow();
  await audit.deleteMany({});
});
