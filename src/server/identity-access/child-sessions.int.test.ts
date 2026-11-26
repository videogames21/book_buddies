import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { ObjectId } from "mongodb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  insertParent,
  insertUserWithRole,
} from "../../../tests/fixtures/users";
import { resetDatabase } from "../../../tests/integration/db";

// Child sessions (design/shlf.md, "The session ends at the next midnight" and
// "A child is also signed out after 30 minutes of inactivity"), under a fixed clock.

vi.mock("./auth", () => ({ auth: vi.fn() }));
const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: () =>
    Promise.resolve({
      get: (name: string) => {
        const value = jar.get(name);
        return value === undefined ? undefined : { name, value };
      },
      set: (name: string, value: string) => jar.set(name, value),
      delete: (name: string) => jar.delete(name),
    }),
}));

const { auth } = await import("./auth");
const {
  createDatabaseSession,
  endCurrentSession,
  requireChild,
  requireParent,
  setSessionCookie,
} = await import("./sessions");
const { nextMidnight } = await import("./next-midnight");
const { getDb, getMongoClient, withTransaction } =
  await import("@/server/lib/db");
const { setClock, resetClock } = await import("@/server/lib/clock");
const mockedAuth = vi.mocked(
  auth as unknown as () => Promise<{ user: { id: string } } | null>,
);

const ZONE = "America/Chicago";
/** A time on the evening of 20 November 2026 in Chicago, or the small hours after it. */
const evening = (time: string) => new Date(`2026-11-20T${time}-06:00`);
const nightAfter = (time: string) => new Date(`2026-11-21T${time}-06:00`);
const MIDNIGHT = nightAfter("00:00:00");

let currentTime: Date;
const at = (time: Date) => {
  currentTime = time;
};
const advance = (seconds: number) => {
  currentTime = new Date(currentTime.getTime() + seconds * 1000);
};

const sessions = () => getDb().collection("sessions");
const ends = () => getDb().collection("childSessionEnds");
const keepAlive = () => requireChild({ countsAsActivity: false });
const codeOf = async (result: ReturnType<typeof requireChild>) => {
  const done = await result;
  return done.ok ? "ok" : done.error.code;
};

async function insertChildUser(childId = "invented-child") {
  const _id = new ObjectId();
  await getDb()
    .collection("users")
    .insertOne({ _id, role: "child", childId, username: `reader_${childId}` });
  return _id.toHexString();
}

/** Signs a child in as the sign-in action will: one transaction, then the cookie. */
async function startChildSession(childId?: string) {
  const userId = await insertChildUser(childId);
  const endsAt = nextMidnight(currentTime, ZONE);
  const session = await withTransaction((tx) =>
    createDatabaseSession(userId, tx, endsAt),
  );
  await setSessionCookie(session);
  mockedAuth.mockResolvedValue({ user: { id: userId } });
  return { userId, session, endsAt };
}

const record = async () => {
  const found = await ends().findOne();
  if (!found) throw new Error("no childSessionEnds record");
  return found as unknown as {
    sessionId: ObjectId;
    endsAt: Date;
    lastSeenAt: Date;
    lastActiveAt: Date;
  };
};

/** Sends a keep-alive every 30 seconds until `until`, reporting activity or not. */
async function stayOpenUntil(until: Date, active: boolean) {
  while (currentTime < until) {
    advance(30);
    const result = await requireChild({ countsAsActivity: active });
    expect(result.ok, `refused at ${currentTime.toISOString()}`).toBe(true);
  }
}

beforeEach(async () => {
  await resetDatabase();
  jar.clear();
  mockedAuth.mockReset();
  at(evening("15:00:00"));
  setClock(() => currentTime);
});
afterEach(() => {
  resetClock();
});

describe("requireChild: who is let in", () => {
  it("returns the child from the session, and requireParent refuses it", async () => {
    const { userId } = await startChildSession();
    const result = await requireChild();
    expect(result).toEqual({
      ok: true,
      data: {
        userId,
        childId: "invented-child",
        sessionId: (await record()).sessionId,
      },
    });
    expect(await requireParent()).toMatchObject({
      ok: false,
      error: { code: "NOT_A_PARENT" },
    });
  });

  it("refuses a request with no session", async () => {
    mockedAuth.mockResolvedValue(null);
    expect(await codeOf(requireChild())).toBe("NOT_SIGNED_IN");
  });

  it("refuses a parent and an admin", async () => {
    const parent = await insertParent({ parentRole: "main" });
    const admin = await insertUserWithRole("admin");
    for (const userId of [parent.userId, admin.userId]) {
      mockedAuth.mockResolvedValue({ user: { id: userId } });
      expect(await codeOf(requireChild())).toBe("NOT_A_CHILD");
    }
  });

  it("refuses a child session that has no end record, and deletes it", async () => {
    await startChildSession();
    await ends().deleteMany({});
    expect(await codeOf(requireChild())).toBe("NOT_SIGNED_IN");
    expect(await sessions().countDocuments()).toBe(0);
  });

  it("refuses a cookie that names no session of this user, touching nothing", async () => {
    const first = await startChildSession("first-child");
    const second = await startChildSession("second-child");
    // The cookie is now the second child's; auth() claims the first.
    mockedAuth.mockResolvedValue({ user: { id: first.userId } });
    expect(await codeOf(requireChild())).toBe("NOT_SIGNED_IN");
    jar.clear();
    mockedAuth.mockResolvedValue({ user: { id: second.userId } });
    expect(await codeOf(requireChild())).toBe("NOT_SIGNED_IN");
    expect(await sessions().countDocuments()).toBe(2);
    expect(await ends().countDocuments()).toBe(2);
  });
});

describe("Sign-in, expiry: the next midnight", () => {
  it("stores the next midnight as endsAt and keeps the usual lifetime as expires", async () => {
    const { session } = await startChildSession();
    expect(await record()).toMatchObject({
      endsAt: MIDNIGHT,
      lastSeenAt: evening("15:00:00"),
      lastActiveAt: evening("15:00:00"),
    });
    expect(session.expires).toEqual(new Date("2026-12-20T21:00:00Z"));
    expect((await sessions().findOne())?.expires).toEqual(session.expires);
  });

  it("ends a session made at 23:59 a minute later", async () => {
    at(evening("23:59:00"));
    await startChildSession();
    expect((await record()).endsAt).toEqual(MIDNIGHT);
  });

  it("refuses it after midnight and the grace, although the session document is still there", async () => {
    at(evening("23:50:00"));
    await startChildSession();
    at(nightAfter("00:00:01"));
    expect(await sessions().countDocuments()).toBe(1);
    expect(await codeOf(requireChild())).toBe("NOT_SIGNED_IN");
  });

  it("never changes endsAt, even when expires has been slid forward", async () => {
    const { session } = await startChildSession();
    const slid = new Date("2027-06-01T00:00:00Z");
    await sessions().updateOne(
      { sessionToken: session.sessionToken },
      { $set: { expires: slid } },
    );
    await requireChild();
    await keepAlive();
    expect((await record()).endsAt).toEqual(MIDNIGHT);
    at(nightAfter("08:00:00"));
    expect(await codeOf(requireChild())).toBe("NOT_SIGNED_IN");
  });

  it("leaves neither a session nor an end record when the transaction aborts", async () => {
    const userId = await insertChildUser();
    await expect(
      withTransaction(async (tx) => {
        await createDatabaseSession(userId, tx, MIDNIGHT);
        throw new Error("abort");
      }),
    ).rejects.toThrow("abort");
    expect(await sessions().countDocuments()).toBe(0);
    expect(await ends().countDocuments()).toBe(0);
  });
});

describe("Sign-in, midnight, still open", () => {
  it("keeps full access past midnight for as long as the keep-alives arrive", async () => {
    at(evening("23:50:00"));
    await startChildSession();
    await stayOpenUntil(nightAfter("01:30:00"), true);
    expect(await codeOf(requireChild())).toBe("ok");
    expect(await record()).toMatchObject({
      endsAt: MIDNIGHT,
      lastSeenAt: nightAfter("01:30:00"),
    });
  });

  it("lets keep-alives that report nothing hold the visit open until the idle time", async () => {
    at(evening("23:50:00"));
    await startChildSession();
    await stayOpenUntil(nightAfter("00:19:30"), false);
    expect((await record()).lastSeenAt).toEqual(nightAfter("00:19:30"));
  });

  it("moves lastSeenAt on each accepted request after midnight", async () => {
    at(evening("23:55:00"));
    await startChildSession();
    at(nightAfter("00:04:00"));
    await requireChild();
    expect((await record()).lastSeenAt).toEqual(nightAfter("00:04:00"));
    // Nine more minutes is within the grace of that request, not of the sign-in.
    at(nightAfter("00:13:00"));
    expect(await codeOf(requireChild())).toBe("ok");
  });
});

describe("Sign-in, midnight, left", () => {
  async function closeThePageAt2355() {
    at(evening("23:50:00"));
    await startChildSession();
    at(evening("23:55:00"));
    await keepAlive();
  }

  it.each([
    ["00:05:00, the end of the grace", "00:05:00", "ok"],
    ["00:05:01", "00:05:01", "NOT_SIGNED_IN"],
    ["00:15:00", "00:15:00", "NOT_SIGNED_IN"],
  ])("a child back at %s", async (_label, time, expected) => {
    await closeThePageAt2355();
    at(nightAfter(time));
    expect(await codeOf(requireChild())).toBe(expected);
  });

  it("does not apply the grace before midnight", async () => {
    await startChildSession();
    at(evening("15:20:00"));
    expect(await codeOf(requireChild())).toBe("ok");
  });
});

describe("Sign-in, inactivity", () => {
  it.each([
    ["before midnight", evening("15:00:00")],
    ["after midnight", evening("23:50:00")],
  ])(
    "refuses a child 30 minutes after the last activity, %s",
    async (_label, signedInAt) => {
      at(signedInAt);
      await startChildSession();
      // 29 minutes 30 seconds of keep-alives that report nothing.
      for (let sent = 0; sent < 59; sent++) {
        advance(30);
        expect(await codeOf(keepAlive())).toBe("ok");
      }
      advance(30);
      expect(await codeOf(keepAlive())).toBe("NOT_SIGNED_IN");
      expect(await sessions().countDocuments()).toBe(0);
    },
  );

  it("refuses an idle session on a page request too", async () => {
    await startChildSession();
    advance(30 * 60);
    expect(await codeOf(requireChild())).toBe("NOT_SIGNED_IN");
  });

  it.each([
    ["a page request or an action", true],
    ["a keep-alive", false],
  ])("moves the 30 minutes only for activity: %s", async (_label, counts) => {
    await startChildSession();
    advance(20 * 60);
    await requireChild({ countsAsActivity: counts });
    expect((await record()).lastActiveAt).toEqual(
      counts ? evening("15:20:00") : evening("15:00:00"),
    );
    advance(20 * 60);
    expect(await codeOf(keepAlive())).toBe(counts ? "ok" : "NOT_SIGNED_IN");
  });

  it("does not move a time backwards for a request that arrives late", async () => {
    await startChildSession();
    at(evening("15:10:00"));
    await requireChild();
    at(evening("15:09:00"));
    await requireChild();
    expect(await record()).toMatchObject({
      lastSeenAt: evening("15:10:00"),
      lastActiveAt: evening("15:10:00"),
    });
  });
});

describe("Sign-in, expires", () => {
  it("is still readable by Auth.js after midnight while the visit is open", async () => {
    at(evening("23:55:00"));
    const { session } = await startChildSession();
    at(nightAfter("00:03:00"));
    expect(await codeOf(keepAlive())).toBe("ok");
    // getServerSession() looks the cookie's token up with exactly this call, and
    // deletes a session only once `expires` has passed.
    const adapter = MongoDBAdapter(() => getMongoClient(), {
      databaseName: process.env.MONGODB_DB,
    });
    const found = await adapter.getSessionAndUser?.(session.sessionToken);
    expect(found?.session.expires).toEqual(session.expires);
    expect(session.expires > nightAfter("00:03:00")).toBe(true);
  });
});

describe("Sign-in, activity times deleted", () => {
  it.each([
    ["an idle refusal", evening("16:00:00")],
    ["a refusal after midnight and the grace", nightAfter("00:30:00")],
  ])("leaves nothing after %s", async (_label, later) => {
    await startChildSession();
    at(later);
    await requireChild();
    expect(await sessions().countDocuments()).toBe(0);
    expect(await ends().countDocuments()).toBe(0);
  });

  it("leaves nothing after sign-out", async () => {
    await startChildSession();
    await endCurrentSession();
    expect(await sessions().countDocuments()).toBe(0);
    expect(await ends().countDocuments()).toBe(0);
    expect(jar.size).toBe(0);
  });

  it("ends only the session that is over, and keeps one still running", async () => {
    const first = await startChildSession("first-child");
    const firstCookie = new Map(jar);
    at(evening("15:25:00"));
    await startChildSession("second-child");
    // The first child has now been idle for 31 minutes.
    at(evening("15:31:00"));
    jar.clear();
    for (const [name, value] of firstCookie) jar.set(name, value);
    mockedAuth.mockResolvedValue({ user: { id: first.userId } });
    expect(await codeOf(requireChild())).toBe("NOT_SIGNED_IN");
    expect(await sessions().countDocuments()).toBe(1);
    expect(await ends().countDocuments()).toBe(1);
  });

  it("answers every one of several requests that find the session over", async () => {
    await startChildSession();
    advance(60 * 60);
    const results = await Promise.all(
      Array.from({ length: 5 }, () => codeOf(requireChild())),
    );
    expect(results).toEqual(Array(5).fill("NOT_SIGNED_IN"));
    expect(await sessions().countDocuments()).toBe(0);
  });
});

describe("Sign-in, parent sessions unchanged", () => {
  it("writes no end record for a parent, and never refuses a parent for being idle", async () => {
    const parent = await insertParent({ parentRole: "main" });
    const session = await createDatabaseSession(parent.userId);
    await setSessionCookie(session);
    mockedAuth.mockResolvedValue({ user: { id: parent.userId } });
    expect(await ends().countDocuments()).toBe(0);
    expect(session.expires).toEqual(new Date("2026-12-20T21:00:00Z"));
    at(nightAfter("12:00:00"));
    expect(await codeOf(requireChild())).toBe("NOT_A_CHILD");
    expect((await requireParent()).ok).toBe(true);
    expect(await sessions().countDocuments()).toBe(1);
  });
});
