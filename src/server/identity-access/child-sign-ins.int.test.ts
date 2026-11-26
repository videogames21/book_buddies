import { ObjectId } from "mongodb";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetDatabase } from "../../../tests/integration/db";

const { recordChildSignIn, ensureChildSignInIndexes } =
  await import("./child-sign-ins");
const { ensureChildSessionIndexes } = await import("./child-sessions");
const { getDb, withTransaction } = await import("@/server/lib/db");
const { setClock, resetClock } = await import("@/server/lib/clock");

const AT = new Date("2026-11-20T15:00:00Z");
const signIns = () => getDb().collection("childSignIns");

beforeEach(async () => {
  await resetDatabase();
  setClock(() => AT);
});
afterEach(() => {
  resetClock();
});

describe("childSignIns (DI-usage-records)", () => {
  it("records the child ID and the time, and nothing else", async () => {
    await withTransaction((tx) => recordChildSignIn(tx, "invented-child"));
    const records = await signIns()
      .find({}, { projection: { _id: 0 } })
      .toArray();
    expect(records).toEqual([{ childId: "invented-child", at: AT }]);
  });

  it("leaves no record when its transaction aborts", async () => {
    await expect(
      withTransaction(async (tx) => {
        await recordChildSignIn(tx, "invented-child");
        throw new Error("abort");
      }),
    ).rejects.toThrow("abort");
    expect(await signIns().countDocuments()).toBe(0);
  });

  it.each([
    ["an IP address", { ip: "203.0.113.5" }],
    ["a device ID", { deviceId: "invented-device" }],
    ["a session length", { seconds: 60 }],
  ])("refuses %s", async (_label, extra) => {
    await expect(
      signIns().insertOne({ childId: "invented-child", at: AT, ...extra }),
    ).rejects.toThrow("Document failed validation");
  });

  it("is indexed by child and time, and setup can run twice", async () => {
    await ensureChildSignInIndexes(getDb());
    const indexes = await signIns().indexes();
    expect(indexes).toContainEqual(
      expect.objectContaining({
        name: "childId_at",
        key: { childId: 1, at: 1 },
      }),
    );
  });
});

describe("childSessionEnds", () => {
  const record = () => ({
    sessionId: new ObjectId(),
    endsAt: AT,
    lastSeenAt: AT,
    lastActiveAt: AT,
  });
  const ends = () => getDb().collection("childSessionEnds");

  it("keeps one record per session, and setup can run twice", async () => {
    await ensureChildSessionIndexes(getDb());
    const first = record();
    await ends().insertOne({ ...first });
    await expect(ends().insertOne({ ...first })).rejects.toThrow("E11000");
  });

  it("refuses a name, a username or a child ID", async () => {
    for (const extra of [
      { nickname: "Starfish" },
      { username: "moon_reader_01" },
      { childId: "invented-child" },
    ]) {
      await expect(ends().insertOne({ ...record(), ...extra })).rejects.toThrow(
        "Document failed validation",
      );
    }
  });
});
