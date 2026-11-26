import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { insertParent } from "../../../tests/fixtures/users";
import { resetDatabase } from "../../../tests/integration/db";

// auth() needs a real Next.js request, so the session comes from a mock here and the
// Auth.js adapter checks whether a token still works, as auth() would.
vi.mock("@/server/identity-access/auth", () => ({ auth: vi.fn() }));
const jar = vi.hoisted(() => new Map<string, string>());
vi.mock("next/headers", () => ({
  cookies: () =>
    Promise.resolve({
      get: (name: string) =>
        jar.has(name) ? { name, value: jar.get(name) } : undefined,
      delete: (name: string) => jar.delete(name),
    }),
}));

const { signOutParent } = await import("./actions");
const { auth } = await import("@/server/identity-access/auth");
const { createDatabaseSession } =
  await import("@/server/identity-access/sessions");
const { sessionCookie } =
  await import("@/server/identity-access/session-cookie");
const { getMongoClient } = await import("@/server/lib/db");
const mockedAuth = vi.mocked(
  auth as unknown as () => Promise<{ user: { id: string } } | null>,
);

const stillWorks = async (sessionToken: string) => {
  const adapter = MongoDBAdapter(() => getMongoClient(), {
    databaseName: process.env.MONGODB_DB,
  });
  return Boolean(await adapter.getSessionAndUser?.(sessionToken));
};

describe("signOutParent (OI-44)", () => {
  beforeEach(async () => {
    await resetDatabase();
    jar.clear();
    mockedAuth.mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("deletes this session and its cookie, and leaves the parent's other sessions", async () => {
    const parent = await insertParent({ parentRole: "main" });
    const current = await createDatabaseSession(parent.userId);
    const other = await createDatabaseSession(parent.userId);
    jar.set(sessionCookie().name, current.sessionToken);
    mockedAuth.mockResolvedValue({ user: { id: parent.userId } });

    expect(await signOutParent()).toEqual({ ok: true, data: null });
    expect(jar.has(sessionCookie().name)).toBe(false);
    expect(await stillWorks(current.sessionToken)).toBe(false);
    expect(await stillWorks(other.sessionToken)).toBe(true);
  });

  it("with no session, returns NOT_SIGNED_IN and deletes nothing", async () => {
    const parent = await insertParent({ parentRole: "main" });
    const session = await createDatabaseSession(parent.userId);
    mockedAuth.mockResolvedValue(null);
    expect(await signOutParent()).toMatchObject({
      error: { code: "NOT_SIGNED_IN" },
    });
    expect(await stillWorks(session.sessionToken)).toBe(true);
  });
});
