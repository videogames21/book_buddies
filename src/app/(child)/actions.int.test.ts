import { Collection, type Document, type WithId } from "mongodb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { insertSignedInChild } from "../../../tests/fixtures/child-session";
import { insertParent } from "../../../tests/fixtures/users";
import { resetDatabase } from "../../../tests/integration/db";

// design/shlf.md, Tests, "Sign-in, keep-alive".

vi.mock("@/server/identity-access/auth", () => ({ auth: vi.fn() }));
const jar = vi.hoisted(() => new Map<string, string>());
vi.mock("next/headers", () => ({
  cookies: () =>
    Promise.resolve({
      get: (name: string) =>
        jar.has(name) ? { name, value: jar.get(name) } : undefined,
    }),
}));

const { keepChildSessionAlive } = await import("./actions");
const { auth } = await import("@/server/identity-access/auth");
const { sessionCookie } =
  await import("@/server/identity-access/session-cookie");
const { getDb } = await import("@/server/lib/db");
const { setClock, resetClock } = await import("@/server/lib/clock");
const mockedAuth = vi.mocked(
  auth as unknown as () => Promise<{ user: { id: string } } | null>,
);

const SIGNED_IN = new Date("2026-11-20T15:00:00Z");
const LATER = new Date("2026-11-20T15:05:00Z");
const ENDS = new Date("2026-11-21T03:00:00Z");
let currentTime: Date;

const records = async () =>
  getDb()
    .collection("childSessionEnds")
    .find({}, { projection: { _id: 0, sessionId: 0 } })
    .sort({ _id: 1 })
    .toArray();

async function signedInChild() {
  const child = await insertSignedInChild();
  jar.set(sessionCookie().name, child.session.sessionToken);
  mockedAuth.mockResolvedValue({ user: { id: child.userId } });
  return child;
}

beforeEach(async () => {
  await resetDatabase();
  jar.clear();
  mockedAuth.mockReset();
  currentTime = SIGNED_IN;
  setClock(() => currentTime);
});
afterEach(() => {
  resetClock();
  vi.restoreAllMocks();
});

describe("keepChildSessionAlive", () => {
  it.each([
    [false, SIGNED_IN],
    [true, LATER],
  ])(
    "with active %s, marks the caller's own session as seen",
    async (active, lastActiveAt) => {
      await insertSignedInChild("Otter");
      await signedInChild();
      currentTime = LATER;
      expect(await keepChildSessionAlive({ active })).toEqual({
        ok: true,
        data: null,
      });
      expect(await records()).toEqual([
        { endsAt: ENDS, lastSeenAt: SIGNED_IN, lastActiveAt: SIGNED_IN },
        { endsAt: ENDS, lastSeenAt: LATER, lastActiveAt },
      ]);
    },
  );

  it("says an ended session is signed out, even when it reports activity", async () => {
    await signedInChild();
    currentTime = new Date("2026-11-20T15:30:00Z");
    expect(await keepChildSessionAlive({ active: true })).toMatchObject({
      error: { code: "NOT_SIGNED_IN" },
    });
    expect(await records()).toEqual([]);
  });

  it.each([
    ["a string flag", { active: "true" }],
    ["no flag", {}],
    ["an extra field", { active: true, endsAt: "2027-01-01" }],
    ["nothing", undefined],
  ])("refuses %s and counts no activity", async (_label, input) => {
    await signedInChild();
    currentTime = LATER;
    expect(await keepChildSessionAlive(input)).toMatchObject({
      error: { code: "INVALID_INPUT" },
    });
    expect(await records()).toMatchObject([
      { endsAt: ENDS, lastActiveAt: SIGNED_IN },
    ]);
  });

  it("checks the session before the input, and refuses a parent", async () => {
    mockedAuth.mockResolvedValue(null);
    expect(await keepChildSessionAlive("not an object")).toMatchObject({
      error: { code: "NOT_SIGNED_IN" },
    });
    const parent = await insertParent({ parentRole: "main" });
    mockedAuth.mockResolvedValue({ user: { id: parent.userId } });
    expect(await keepChildSessionAlive({ active: true })).toMatchObject({
      error: { code: "NOT_A_CHILD" },
    });
  });

  it("says signed out when the session ends between the check and the activity", async () => {
    await signedInChild();
    // Read by name, because it is only ever called with the collection as `this`.
    const findOneAndUpdate = Reflect.get(
      Collection.prototype,
      "findOneAndUpdate",
    ) as (
      this: Collection,
      ...args: unknown[]
    ) => Promise<WithId<Document> | null>;
    // The first call is the session check's. Another tab signs out right after it.
    vi.spyOn(Collection.prototype, "findOneAndUpdate").mockImplementationOnce(
      async function (this: Collection, ...args: unknown[]) {
        const found = await findOneAndUpdate.apply(this, args);
        await getDb().collection("childSessionEnds").deleteMany({});
        return found;
      },
    );
    expect(await keepChildSessionAlive({ active: true })).toMatchObject({
      ok: false,
      error: { code: "NOT_SIGNED_IN" },
    });
  });

  it("answers an unexpected failure with a code and an error ID, and no detail", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockedAuth.mockRejectedValue(new Error("invented database detail"));
    expect(await keepChildSessionAlive({ active: true })).toEqual({
      ok: false,
      error: {
        code: "KEEP_ALIVE_FAILED",
        message: "That didn’t work.",
        errorId: expect.any(String) as string,
      },
    });
  });

  it("logs nothing", async () => {
    await signedInChild();
    const logged = [
      vi.spyOn(console, "log"),
      vi.spyOn(console, "warn"),
      vi.spyOn(console, "error"),
    ];
    currentTime = LATER;
    await keepChildSessionAlive({ active: true });
    for (const log of logged) expect(log).not.toHaveBeenCalled();
  });
});
