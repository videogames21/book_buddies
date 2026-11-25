import { ObjectId } from "mongodb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
    expect(await response.json()).toEqual({ ok: true, data: { purged: 1 } });
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
    expect(await response.json()).toEqual({ ok: true, data: { purged: 1 } });

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
      data: { purged: 1 },
    });
    expect(
      await getDb()
        .collection("passwordResets")
        .countDocuments({ tokenHash: "f".repeat(64) }),
    ).toBe(1);
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
