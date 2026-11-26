import { createHash } from "node:crypto";
import { ObjectId } from "mongodb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { insertParent } from "../../../../../tests/fixtures/users";
import { resetDatabase } from "../../../../../tests/integration/db";

// design/shlf.md, Tests, "Sign-in". The throttle's timing is tested beside the throttle
// (sign-in-throttle.int.test.ts). Invented accounts only.

type Options = Record<string, unknown>;
const jar = vi.hoisted(() => new Map<string, { value: string } & Options>());
vi.mock("next/headers", () => ({
  cookies: () =>
    Promise.resolve({
      get: (name: string) => jar.get(name),
      set: (name: string, value: string, options: Options) =>
        jar.set(name, { value, ...options }),
      delete: (name: string) => jar.delete(name),
    }),
}));
// Auth.js, reduced to what it does here: the user of the session the cookie names.
vi.mock("@/server/identity-access/auth", () => ({
  auth: vi.fn(async () => {
    const { getDb } = await import("@/server/lib/db");
    const { sessionCookie } =
      await import("@/server/identity-access/session-cookie");
    const sessionToken = jar.get(sessionCookie().name)?.value;
    const session =
      sessionToken &&
      (await getDb().collection("sessions").findOne({ sessionToken }));
    return session ? { user: { id: String(session.userId) } } : null;
  }),
}));
// Lets one test stand in for a child deleted between the check and the transaction.
const checkPasses = vi.hoisted(() => ({ always: false }));
vi.mock("@/server/accounts-family/child-accounts", async (importOriginal) => {
  const real =
    await importOriginal<
      typeof import("@/server/accounts-family/child-accounts")
    >();
  return {
    ...real,
    childMaySignIn: (childId: string) =>
      checkPasses.always ? Promise.resolve(true) : real.childMaySignIn(childId),
  };
});
vi.mock("@/server/identity-access/child-sign-ins", async (importOriginal) => {
  const real =
    await importOriginal<
      typeof import("@/server/identity-access/child-sign-ins")
    >();
  return { ...real, recordChildSignIn: vi.fn(real.recordChildSignIn) };
});

const { signInChild } = await import("./actions");
const { createChild } = await import("@/server/accounts-family/child-accounts");
const { recordChildSignIn } =
  await import("@/server/identity-access/child-sign-ins");
const { requireChild, requireParent, createDatabaseSession } =
  await import("@/server/identity-access/sessions");
const { sessionCookie } =
  await import("@/server/identity-access/session-cookie");
const { getDb } = await import("@/server/lib/db");
const { setClock, resetClock } = await import("@/server/lib/clock");

/** 3 pm in the test zone, America/Chicago (tests/integration/setup.ts). */
const AT = new Date("2026-11-20T21:00:00Z");
const NEXT_MIDNIGHT = new Date("2026-11-21T06:00:00Z");
let currentTime = AT;

const count = (collection: string) =>
  getDb().collection(collection).countDocuments();
const throttleRows = () =>
  getDb()
    .collection<{ accountKey: string; failures: number }>("signInAttempts")
    .find({}, { projection: { _id: 0, accountKey: 1, failures: 1 } })
    .sort({ accountKey: 1 })
    .toArray();
const deviceCookie = () => jar.get("child_device");
const sessionToken = () => jar.get(sessionCookie().name)?.value;

/** A family with confirmed consent and one child account, as a parent creates it. */
async function newChild(username = "moon_reader") {
  const parent = await insertParent({ parentRole: "main" });
  const familyId = new ObjectId(parent.familyId);
  await getDb()
    .collection("consentRecords")
    .insertOne({
      familyId,
      parentUserId: new ObjectId(parent.userId),
      noticeVersion: "invented",
      method: "email-plus",
      acknowledgedAt: AT,
      confirmBy: NEXT_MIDNIGHT,
      confirmationTokenHash: hashOf(parent.userId),
      confirmedAt: AT,
    });
  const created = await createChild(
    { ...parent, parentRole: "main" },
    { nickname: "Starfish", age: 8, grade: "3", username, avatar: "1" },
  );
  if (!created.ok) throw new Error(created.error.code);
  return { ...created.data, parent, familyId };
}

type Child = Awaited<ReturnType<typeof newChild>>;

const signIn = ({ username, password }: Child) =>
  signInChild({ username, password });
const guess = (username: string) =>
  signInChild({ username, password: "wrong-guess-00" });
const code = (result: Awaited<ReturnType<typeof signInChild>>) =>
  result.ok ? "ok" : result.error.code;
const hashOf = (deviceId: string) =>
  createHash("sha256").update(deviceId).digest("hex");
const devices = () =>
  JSON.parse(
    Buffer.from(
      deviceCookie()?.value.split(".")[0] ?? "",
      "base64url",
    ).toString(),
  ) as { deviceId: string; childId: string }[];

beforeEach(async () => {
  await resetDatabase();
  jar.clear();
  checkPasses.always = false;
  currentTime = AT;
  setClock(() => currentTime);
  // Refusals are logged; the logging test reads what was written.
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => {
  resetClock();
  vi.restoreAllMocks();
});

describe("signInChild", () => {
  it("creates one session and one usage record, and signs the browser in as that child", async () => {
    const child = await newChild();
    expect(await signIn(child)).toEqual({ ok: true, data: null });

    expect(await count("sessions")).toBe(1);
    expect(
      await getDb()
        .collection("childSignIns")
        .find({}, { projection: { _id: 0 } })
        .toArray(),
    ).toEqual([{ childId: child.childId, at: AT }]);
    expect(
      await getDb().collection("childSessionEnds").findOne(),
    ).toMatchObject({ endsAt: NEXT_MIDNIGHT, lastActiveAt: AT });
    expect(jar.get(sessionCookie().name)).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
    });
    expect(await requireChild()).toMatchObject({
      ok: true,
      data: { childId: child.childId },
    });
    expect(await requireParent()).toMatchObject({
      error: { code: "NOT_A_PARENT" },
    });
  });

  it("accepts capitals and stray spaces in both fields", async () => {
    const child = await newChild();
    const capitalized = child.password.replace(/^./, (c) => c.toUpperCase());
    expect(
      await signInChild({
        username: " Moon_Reader ",
        password: `${capitalized} `,
      }),
    ).toEqual({ ok: true, data: null });
  });

  it.each([
    [{ username: " ", password: "x" }, "USERNAME_REQUIRED"],
    [{ username: "moon_reader", password: "" }, "PASSWORD_REQUIRED"],
    [{ username: "a".repeat(21), password: "x" }, "INVALID_CREDENTIALS"],
    [{ username: "x", password: "a".repeat(129) }, "INVALID_CREDENTIALS"],
    [undefined, "INVALID_CREDENTIALS"],
  ])("refuses %j as %s and counts nothing", async (input, expected) => {
    expect(code(await signInChild(input))).toBe(expected);
    expect(await count("signInAttempts")).toBe(0);
  });

  it("answers an unknown username and a wrong password alike, and counts both", async () => {
    const child = await newChild();
    const wrong = await guess(child.username);
    const unknown = await guess("nobody_here");
    expect(wrong).toEqual(unknown);
    expect(code(wrong)).toBe("INVALID_CREDENTIALS");
    expect(await throttleRows()).toEqual([
      { accountKey: "child:moon_reader:shared", failures: 1 },
      { accountKey: "child:nobody_here:shared", failures: 1 },
    ]);
    expect(await count("sessions")).toBe(0);
    expect(deviceCookie()).toBeUndefined();
  });

  it.each(["moon_reader", "nobody_here"])(
    "makes %s wait after three wrong passwords, with no number of seconds",
    async (username) => {
      await newChild();
      for (let i = 0; i < 3; i++) await guess(username);
      const refused = await guess(username);
      expect(code(refused)).toBe("TOO_MANY_ATTEMPTS");
      expect(JSON.stringify(refused)).not.toMatch(/\d/);
    },
  );

  it("clears the count a correct password was counted under", async () => {
    const child = await newChild();
    await guess(child.username);
    await guess(child.username);
    await signIn(child);
    expect(await throttleRows()).toEqual([]);
  });

  it("sets the device cookie only after a correct password, and renews it", async () => {
    const child = await newChild();
    await guess(child.username);
    expect(deviceCookie()).toBeUndefined();
    await signIn(child);
    expect(deviceCookie()).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      expires: new Date("2026-12-20T21:00:00Z"),
    });
    currentTime = NEXT_MIDNIGHT;
    await signIn(child);
    expect(deviceCookie()?.expires).toEqual(new Date("2026-12-21T06:00:00Z"));
  });

  it("counts a trusted device apart, so a wait on the account does not stop it", async () => {
    const child = await newChild();
    await signIn(child);
    const trusted = { value: String(deviceCookie()?.value) };
    const [{ deviceId } = { deviceId: "" }] = devices();

    // A guesser with no cookie puts the account's shared count into a wait.
    jar.clear();
    for (let i = 0; i < 3; i++) await guess(child.username);
    expect(code(await signIn(child))).toBe("TOO_MANY_ATTEMPTS");

    jar.set("child_device", trusted);
    await guess(child.username);
    expect(await throttleRows()).toEqual([
      {
        accountKey: `child:moon_reader:dev:${hashOf(deviceId)}`,
        failures: 1,
      },
      { accountKey: "child:moon_reader:shared", failures: 3 },
    ]);
    expect(JSON.stringify(await throttleRows())).not.toContain(deviceId);
    expect(code(await signIn(child))).toBe("ok");
    expect(await throttleRows()).toEqual([
      { accountKey: "child:moon_reader:shared", failures: 3 },
    ]);
  });

  it("counts every attempt that drops the cookie under the one shared count", async () => {
    const child = await newChild();
    for (let i = 0; i < 6; i++) {
      jar.clear();
      await guess(child.username);
    }
    expect(await throttleRows()).toEqual([
      { accountKey: "child:moon_reader:shared", failures: 3 },
    ]);
    // The accepted limit (OI-49): a new device waits too, until the wait ends.
    expect(code(await signIn(child))).toBe("TOO_MANY_ATTEMPTS");
    currentTime = new Date(AT.getTime() + 30 * 1000);
    expect(code(await signIn(child))).toBe("ok");
  });

  it.each([
    ["forged", () => ({ value: "forged.cookie" })],
    [
      "another child's",
      async () => {
        await signIn(await newChild("sun_reader"));
        return { value: String(deviceCookie()?.value) };
      },
    ],
  ])("counts a %s cookie under the shared count", async (_label, cookie) => {
    const child = await newChild();
    jar.set("child_device", await cookie());
    await guess(child.username);
    expect(await throttleRows()).toEqual([
      { accountKey: "child:moon_reader:shared", failures: 1 },
    ]);
  });

  it("counts an expired cookie under the shared count", async () => {
    const child = await newChild();
    await signIn(child);
    currentTime = new Date("2026-12-20T21:00:00Z");
    await guess(child.username);
    expect(await throttleRows()).toEqual([
      { accountKey: "child:moon_reader:shared", failures: 1 },
    ]);
  });

  it("trusts a shared tablet for each child who signs in on it", async () => {
    const first = await newChild();
    const second = await newChild("sun_reader");
    await signIn(first);
    await signIn(second);
    expect(devices().map((entry) => entry.childId)).toEqual([
      first.childId,
      second.childId,
    ]);
    expect(deviceCookie()?.value).not.toContain("Starfish");
    await guess(first.username);
    await guess(second.username);
    expect((await throttleRows()).map((row) => row.accountKey)).toEqual(
      [first, second].map(
        (child, i) =>
          `child:${child.username}:dev:${hashOf(devices()[i].deviceId)}`,
      ),
    );
    expect(
      JSON.stringify(await getDb().collection("childSignIns").find().toArray()),
    ).not.toContain(devices()[0].deviceId);
  });

  it("ends the session the browser's old cookie named, and no other", async () => {
    const child = await newChild();
    const parentUserId = child.parent.userId;
    const elsewhere = await createDatabaseSession(parentUserId);
    const here = await createDatabaseSession(parentUserId);
    jar.set(sessionCookie().name, { value: here.sessionToken });
    await signIn(child);
    const tokens = (await getDb().collection("sessions").find().toArray()).map(
      (session) => String(session.sessionToken),
    );
    expect(tokens.sort()).toEqual(
      [elsewhere.sessionToken, sessionToken()].sort(),
    );
  });

  it.each([
    [
      "consent is revoked",
      (child: Child) =>
        getDb()
          .collection("consentRecords")
          .updateOne({ familyId: child.familyId }, { $set: { revokedAt: AT } }),
    ],
    [
      "the child's record is gone",
      (child: Child) =>
        getDb()
          .collection<{ _id: string }>("children")
          .deleteOne({ _id: child.childId }),
    ],
  ])(
    "is unavailable when %s, only with the right password",
    async (_label, change) => {
      const child = await newChild();
      await change(child);
      expect(code(await guess(child.username))).toBe("INVALID_CREDENTIALS");
      expect(code(await signIn(child))).toBe("ACCOUNT_UNAVAILABLE");
      expect(await count("sessions")).toBe(0);
      expect(await count("childSignIns")).toBe(0);
      expect(deviceCookie()).toBeUndefined();
    },
  );

  it("leaves nothing when the child is deleted as the sign-in is saved", async () => {
    const child = await newChild();
    await getDb()
      .collection<{ _id: string }>("children")
      .deleteOne({ _id: child.childId });
    checkPasses.always = true;
    expect(code(await signIn(child))).toBe("INVALID_CREDENTIALS");
    for (const name of ["sessions", "childSessionEnds", "childSignIns"]) {
      expect(await count(name)).toBe(0);
    }
  });

  it("keeps no session when the usage record cannot be written", async () => {
    const child = await newChild();
    vi.mocked(recordChildSignIn).mockRejectedValueOnce(new Error("invented"));
    expect(code(await signIn(child))).toBe("SIGN_IN_FAILED");
    for (const name of ["sessions", "childSessionEnds", "childSignIns"]) {
      expect(await count(name)).toBe(0);
    }
    expect(sessionToken()).toBeUndefined();
    expect(deviceCookie()).toBeUndefined();
  });

  it("logs no username, password or session token", async () => {
    const child = await newChild();
    await guess(child.username);
    await signIn(child);
    const token = String(sessionToken());
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    vi.mocked(recordChildSignIn).mockRejectedValueOnce(
      new Error(`invented: ${child.username} ${child.password}`),
    );
    await signIn(child);
    const written = JSON.stringify([
      vi.mocked(console.warn).mock.calls,
      vi.mocked(console.error).mock.calls,
    ]);
    expect(written).toContain("sign-in-refused");
    for (const secret of [
      child.username,
      child.password,
      "wrong-guess",
      token,
    ]) {
      expect(written).not.toContain(secret);
    }
  });
});
