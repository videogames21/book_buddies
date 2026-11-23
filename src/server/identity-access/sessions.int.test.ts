import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { ObjectId } from "mongodb";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  insertParent,
  insertUserWithRole,
} from "../../../tests/fixtures/users";
import { resetDatabase } from "../../../tests/integration/db";

vi.mock("./auth", () => ({ auth: vi.fn() }));
const cookieJar = { set: vi.fn() };
vi.mock("next/headers", () => ({ cookies: () => Promise.resolve(cookieJar) }));

const { auth } = await import("./auth");
const { requireParent, createDatabaseSession, setSessionCookie } =
  await import("./sessions");
const { sessionCookieFor } = await import("./session-cookie");

// next-auth's own cookie rule, loaded from its package (the path is not exported).
const requireFromHere = createRequire(import.meta.url);
const { defaultCookies } = requireFromHere(
  join(dirname(requireFromHere.resolve("next-auth")), "core/lib/cookie.js"),
) as {
  defaultCookies: (secure: boolean) => { sessionToken: { name: string } };
};
const { getDb, getMongoClient, withTransaction } =
  await import("@/server/lib/db");
const { setClock, resetClock } = await import("@/server/lib/clock");
const mockedAuth = vi.mocked(
  auth as unknown as () => Promise<{ user: { id: string } } | null>,
);

function signInAs(userId: string | null) {
  mockedAuth.mockResolvedValue(userId ? { user: { id: userId } } : null);
}

describe("requireParent", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("returns the Main Parent's user, family and role from the session", async () => {
    const parent = await insertParent({ parentRole: "main" });
    signInAs(parent.userId);
    expect(await requireParent()).toEqual({
      ok: true,
      data: {
        userId: parent.userId,
        familyId: parent.familyId,
        parentRole: "main",
      },
    });
  });

  it("returns a Sub Parent with the sub role", async () => {
    const parent = await insertParent({ parentRole: "sub" });
    signInAs(parent.userId);
    const result = await requireParent();
    expect(result.ok && result.data.parentRole).toBe("sub");
  });

  it("refuses a request with no session", async () => {
    signInAs(null);
    expect(await requireParent()).toMatchObject({
      ok: false,
      error: { code: "NOT_SIGNED_IN" },
    });
  });

  it.each(["child", "admin"] as const)("refuses a %s session", async (role) => {
    const user = await insertUserWithRole(role);
    signInAs(user.userId);
    expect(await requireParent()).toMatchObject({
      ok: false,
      error: { code: "NOT_A_PARENT" },
    });
  });
});

describe("createDatabaseSession (design/par.md, refinement of KD-auth-sessions)", () => {
  beforeEach(async () => {
    await resetDatabase();
    cookieJar.set.mockClear();
  });
  afterEach(() => {
    resetClock();
  });

  it("writes a session the Auth.js adapter reads back, as auth() does", async () => {
    const parent = await insertParent({ parentRole: "main" });
    setClock(() => new Date("2026-11-20T12:00:00Z"));
    const session = await createDatabaseSession(parent.userId);
    expect(session.expires).toEqual(new Date("2026-12-20T12:00:00Z"));

    // getServerSession() looks the cookie's token up with exactly this call.
    const adapter = MongoDBAdapter(() => getMongoClient(), {
      databaseName: process.env.MONGODB_DB,
    });
    const found = await adapter.getSessionAndUser?.(session.sessionToken);
    expect(found?.user.id).toBe(parent.userId);
    expect(found?.session.expires).toEqual(session.expires);
  });

  it("leaves no session when its transaction aborts", async () => {
    const parent = await insertParent({ parentRole: "main" });
    await expect(
      withTransaction(async (tx) => {
        await createDatabaseSession(parent.userId, tx);
        throw new Error("abort");
      }),
    ).rejects.toThrow("abort");
    expect(
      await getDb()
        .collection("sessions")
        .countDocuments({ userId: new ObjectId(parent.userId) }),
    ).toBe(0);
  });

  it.each([
    ["http://localhost:3100", false],
    ["https://bookbuddies.example.test", true],
  ])("names the cookie as next-auth does on %s", (appUrl, secure) => {
    expect(sessionCookieFor(appUrl)).toEqual({
      name: defaultCookies(secure).sessionToken.name,
      secure,
    });
  });

  it("sets the cookie httpOnly, SameSite=Lax and only as long as the session", async () => {
    const session = {
      sessionToken: "a".repeat(64),
      expires: new Date("2026-12-20T12:00:00Z"),
    };
    await setSessionCookie(session);
    expect(cookieJar.set).toHaveBeenCalledWith(
      defaultCookies(false).sessionToken.name,
      session.sessionToken,
      {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        path: "/",
        expires: session.expires,
      },
    );
  });
});
