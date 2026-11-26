import { ObjectId } from "mongodb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FIXTURE_DEADLINE,
  insertBatch,
} from "../../../../../tests/fixtures/batches";
import { insertConsentRecord } from "../../../../../tests/fixtures/family";
import { insertParent } from "../../../../../tests/fixtures/users";
import { resetDatabase } from "../../../../../tests/integration/db";

const SECRET = "invented-cron-secret-of-32-characters";
vi.mock("@/server/lib/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/lib/config")>();
  return {
    ...actual,
    getConfig: () => ({
      ...actual.getConfig(),
      CRON_SECRET: "invented-cron-secret-of-32-characters",
    }),
  };
});

const { GET } = await import("./route");
const { getDb } = await import("@/server/lib/db");
const { createDatabaseSession } =
  await import("@/server/identity-access/sessions");
const { setClock, resetClock } = await import("@/server/lib/clock");

const NOW = new Date("2026-11-20T12:00:00Z");
const call = (authorization?: string) =>
  GET(
    new Request("http://localhost/api/cron/cleanup", {
      headers: authorization ? { authorization } : {},
    }),
  );
const insertAttempts = () =>
  getDb()
    .collection("signInAttempts")
    .insertMany([
      {
        accountKey: "expired@example.test",
        failures: 1,
        allowedAt: NOW,
        expiresAt: NOW,
      },
      {
        accountKey: "current@example.test",
        failures: 1,
        allowedAt: NOW,
        expiresAt: new Date(NOW.getTime() + 1000),
      },
    ]);

describe("GET /api/cron/cleanup", () => {
  beforeEach(async () => {
    await resetDatabase();
    setClock(() => NOW);
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    resetClock();
    vi.restoreAllMocks();
  });

  it.each([undefined, "Bearer wrong", SECRET])(
    "refuses authorization %s and deletes nothing",
    async (authorization) => {
      await insertAttempts();
      const response = await call(authorization);
      expect(response.status).toBe(401);
      expect(await response.json()).toMatchObject({
        ok: false,
        error: { code: "UNAUTHORIZED" },
      });
      expect(await getDb().collection("signInAttempts").countDocuments()).toBe(
        2,
      );
    },
  );

  it("purges expired sign-in attempts and keeps current ones", async () => {
    await insertAttempts();
    const response = await call(`Bearer ${SECRET}`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      data: { purged: 1, released: 0 },
    });
    const left = await getDb()
      .collection<{ accountKey: string }>("signInAttempts")
      .find()
      .toArray();
    expect(left.map((row) => row.accountKey)).toEqual(["current@example.test"]);
  });

  it("6a: deletes each expired unconfirmed account and keeps confirmed and unexpired ones", async () => {
    // The fixture's unconfirmed record has confirmBy 2026-10-15T12:00:00Z, before NOW.
    const expired = await insertParent({ parentRole: "main" });
    await insertConsentRecord(expired, false);
    await createDatabaseSession(expired.userId);
    await getDb()
      .collection("passwordResets")
      .insertOne({
        userId: new ObjectId(expired.userId),
        tokenHash: "d".repeat(64),
        issuedAt: NOW,
        expiresAt: new Date(NOW.getTime() + 60 * 60 * 1000),
      });
    const confirmed = await insertParent({ parentRole: "main" });
    await insertConsentRecord(confirmed, true);
    const waiting = await insertParent({ parentRole: "main" });
    await insertConsentRecord(waiting, false);
    await getDb()
      .collection("consentRecords")
      .updateOne(
        { familyId: new ObjectId(waiting.familyId) },
        { $set: { confirmBy: new Date(NOW.getTime() + 1000) } },
      );

    const response = await call(`Bearer ${SECRET}`);
    expect(await response.json()).toEqual({
      ok: true,
      data: { purged: 1, released: 0 },
    });

    const users = getDb().collection("users");
    expect(
      await users.countDocuments({ _id: new ObjectId(expired.userId) }),
    ).toBe(0);
    expect(await getDb().collection("sessions").countDocuments()).toBe(0);
    expect(await getDb().collection("passwordResets").countDocuments()).toBe(0);
    expect(await getDb().collection("consentRecords").countDocuments()).toBe(2);
    expect(await users.countDocuments()).toBe(2);
    const audit = await getDb()
      .collection("auditLog")
      .find({}, { projection: { _id: 0 } })
      .toArray();
    expect(audit).toEqual([
      {
        actorRole: "system",
        event: "account.unconfirmed-purged",
        userId: new ObjectId(expired.userId),
        familyId: new ObjectId(expired.familyId),
        occurredAt: NOW,
      },
    ]);
  });

  it("deletes password reset records past their expiry and keeps current ones", async () => {
    await getDb()
      .collection("passwordResets")
      .insertMany([
        {
          userId: new ObjectId(),
          tokenHash: "e".repeat(64),
          issuedAt: NOW,
          expiresAt: NOW,
        },
        {
          userId: new ObjectId(),
          tokenHash: "f".repeat(64),
          issuedAt: NOW,
          expiresAt: new Date(NOW.getTime() + 1000),
        },
      ]);
    expect(await (await call(`Bearer ${SECRET}`)).json()).toEqual({
      ok: true,
      data: { purged: 1, released: 0 },
    });
    expect(
      await getDb()
        .collection("passwordResets")
        .countDocuments({ tokenHash: "f".repeat(64) }),
    ).toBe(1);
  });

  it("2a, no page opened: records each batch past handoffDeadline as released or empty at that deadline, and a second run changes nothing", async () => {
    setClock(() => FIXTURE_DEADLINE);
    const batches = getDb().collection<{ bookIds: string[] }>(
      "recommendationBatches",
    );
    const expired = await insertBatch({ childId: "c1", bookIds: ["b1", "b2"] });
    // The parent removed every book and never confirmed (4a, then 2a).
    const emptied = await insertBatch({
      childId: "c2",
      bookIds: [],
      removedBookIds: ["b1"],
    });
    const live = await insertBatch({
      childId: "c3",
      bookIds: ["b1"],
      handoffDeadline: new Date(FIXTURE_DEADLINE.getTime() + 1),
    });
    const before = await batches.find().sort({ childId: 1 }).toArray();

    const response = await call(`Bearer ${SECRET}`);
    expect(await response.json()).toEqual({
      ok: true,
      data: { purged: 0, released: 2 },
    });
    const byId = async (id: string) =>
      batches.findOne({ _id: new ObjectId(id) });
    expect(await byId(expired)).toMatchObject({
      status: "released",
      releasedAt: FIXTURE_DEADLINE,
      bookIds: ["b1", "b2"],
    });
    expect(await byId(emptied)).toMatchObject({
      status: "empty",
      releasedAt: FIXTURE_DEADLINE,
    });
    expect(await byId(live)).toMatchObject({ status: "pending" });
    expect(await byId(live)).not.toHaveProperty("releasedAt");

    const after = await batches.find().sort({ childId: 1 }).toArray();
    expect(after.map((batch) => batch.bookIds)).toEqual(
      before.map((batch) => batch.bookIds),
    );
    // The child's one pending slot is free: a new pending batch can be stored.
    await expect(
      insertBatch({
        childId: "c1",
        bookIds: ["b3"],
        createdAt: FIXTURE_DEADLINE,
        handoffDeadline: new Date(FIXTURE_DEADLINE.getTime() + 86_400_000),
      }),
    ).resolves.toEqual(expect.any(String));

    const second = await call(`Bearer ${SECRET}`);
    expect(await second.json()).toEqual({
      ok: true,
      data: { purged: 0, released: 0 },
    });
  });

  it("refuses to release batches without the cron secret", async () => {
    setClock(() => FIXTURE_DEADLINE);
    const id = await insertBatch({ childId: "c1", bookIds: ["b1"] });
    const response = await call("Bearer wrong");
    expect(response.status).toBe(401);
    expect(
      await getDb()
        .collection("recommendationBatches")
        .findOne({ _id: new ObjectId(id) }),
    ).toMatchObject({ status: "pending" });
  });

  it("ends child sessions that are over, and removes records whose session is gone", async () => {
    const past = new Date(NOW.getTime() - 1000);
    const longAgo = new Date(NOW.getTime() - 60 * 60 * 1000);
    const nextYear = new Date("2027-06-01T00:00:00Z");
    const childSession = async (endsAt: Date) => {
      const userId = new ObjectId().toHexString();
      const session = await createDatabaseSession(userId, undefined, endsAt);
      return session.sessionToken;
    };
    const ends = getDb().collection("childSessionEnds");
    const setTimes = async (sessionToken: string, times: object) => {
      const found = await getDb()
        .collection("sessions")
        .findOneAndUpdate({ sessionToken }, { $set: { expires: nextYear } });
      await ends.updateOne({ sessionId: found?._id }, { $set: times });
    };
    const running = await childSession(new Date(NOW.getTime() + 1000));
    const stillOpen = await childSession(past);
    // Past midnight with the visit over, although `expires` was slid forward.
    await setTimes(await childSession(past), { lastSeenAt: longAgo });
    // Idle before midnight.
    await setTimes(await childSession(nextYear), { lastActiveAt: longAgo });
    const parent = await insertParent({ parentRole: "main" });
    const parents = await createDatabaseSession(parent.userId);
    await ends.insertOne({
      sessionId: new ObjectId(),
      endsAt: nextYear,
      lastSeenAt: NOW,
      lastActiveAt: NOW,
    });

    expect(await (await call(`Bearer ${SECRET}`)).json()).toEqual({
      ok: true,
      data: { purged: 3, released: 0 },
    });
    const left = await getDb().collection("sessions").find().toArray();
    expect(left.map((s) => s.sessionToken as string).sort()).toEqual(
      [running, stillOpen, parents.sessionToken].sort(),
    );
    expect(await ends.countDocuments()).toBe(2);
  });

  it("runs the other purges when one fails, then reports the failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await insertAttempts();
    const resets = getDb().collection("passwordResets");
    vi.spyOn(resets.constructor.prototype, "deleteMany").mockRejectedValueOnce(
      new Error("invented failure"),
    );
    const response = await call(`Bearer ${SECRET}`);
    expect(response.status).toBe(500);
    expect(await getDb().collection("signInAttempts").countDocuments()).toBe(1);
  });

  it("logs no email, name or token when it purges", async () => {
    const lines: string[] = [];
    for (const method of ["log", "info", "warn", "error"] as const) {
      vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
        lines.push(args.map(String).join(" "));
      });
    }
    const expired = await insertParent({ parentRole: "main" });
    await insertConsentRecord(expired, false);
    await call(`Bearer ${SECRET}`);
    expect(lines.join("\n")).not.toContain("@example.test");
  });

  it("returns an error ID and no exception text when the purge fails", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(
      getDb().collection("x").constructor.prototype,
      "deleteMany",
    ).mockRejectedValueOnce(new Error("failed for invented@example.test"));
    const response = await call(`Bearer ${SECRET}`);
    const text = await response.text();
    expect(response.status).toBe(500);
    expect(text).toContain("CLEANUP_FAILED");
    expect(text).toContain("errorId");
    expect(text).not.toContain("invented@example.test");
    expect(logged.mock.calls.flat().join(" ")).not.toContain(
      "invented@example.test",
    );
  });
});
