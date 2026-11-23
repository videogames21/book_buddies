import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
