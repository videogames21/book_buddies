import { Collection, ObjectId } from "mongodb";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { insertConsentedMainParent } from "../../../../../../../tests/fixtures/family";
import {
  insertParent,
  insertUserWithRole,
} from "../../../../../../../tests/fixtures/users";
import { resetDatabase } from "../../../../../../../tests/integration/db";

// UC-PAR-delete-kid-account, the server action (design/par.md, Tests): 1a, the four 4a
// rows, authorization and logging. The deletion itself is tested in
// child-deletion.int.test.ts. Invented data only.

vi.mock("@/server/identity-access/auth", () => ({ auth: vi.fn() }));
// The real password check, wrapped so a test can hold one check open while another
// finishes (the mixed-outcome rows). It runs the real check unless a test says otherwise.
vi.mock("@/server/identity-access/passwords", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/server/identity-access/passwords")>();
  return { ...actual, verifyPassword: vi.fn(actual.verifyPassword) };
});
const { auth } = await import("@/server/identity-access/auth");
const { createChild } = await import("@/server/accounts-family/child-accounts");
const { hashPassword, verifyPassword } =
  await import("@/server/identity-access/passwords");
const realPasswords = await vi.importActual<
  typeof import("@/server/identity-access/passwords")
>("@/server/identity-access/passwords");
const { signInMainParent } = await import("@/server/identity-access/sign-in");
const { checkPasswordAttempt } =
  await import("@/server/identity-access/sign-in-throttle");
const { getDb } = await import("@/server/lib/db");
const { resetClock, setClock } = await import("@/server/lib/clock");
const { deleteChildAccount } = await import("./actions");

const mockedAuth = vi.mocked(
  auth as unknown as () => Promise<{ user: { id: string } } | null>,
);
function signInAs(userId: string | null) {
  mockedAuth.mockResolvedValue(userId ? { user: { id: userId } } : null);
}

const PASSWORD = "invented parent password";
const NICKNAME = "Starfish";
const USERNAME = "star_reader";
const AT = new Date("2026-11-24T15:00:00Z");

let hash = "";

/** A Main Parent with a password, signed in, and one child made through createChild. */
async function familyWithChild() {
  const parent = await insertConsentedMainParent();
  const users = getDb().collection<{ _id: ObjectId; email?: string }>("users");
  await users.updateOne(
    { _id: new ObjectId(parent.userId) },
    { $set: { passwordHash: hash } },
  );
  const email = (await users.findOne({ _id: new ObjectId(parent.userId) }))
    ?.email;
  if (!email) throw new Error("fixture has no email");
  const created = await createChild(
    { ...parent, parentRole: "main" },
    {
      nickname: NICKNAME,
      age: 8,
      grade: "3",
      username: USERNAME,
      avatar: "1-1",
    },
  );
  if (!created.ok) throw new Error(`seed failed: ${created.error.code}`);
  signInAs(parent.userId);
  return { ...parent, email, childId: created.data.childId };
}

const childExists = async (childId: string) =>
  (await getDb()
    .collection<{ _id: string }>("children")
    .countDocuments({ _id: childId })) === 1;

const failuresFor = async (email: string) =>
  (
    await getDb()
      .collection<{ accountKey: string; failures: number }>("signInAttempts")
      .findOne({ accountKey: email })
  )?.failures ?? 0;

const request = (childId: string, overrides: Record<string, unknown> = {}) => ({
  childId,
  password: PASSWORD,
  nickname: NICKNAME,
  ...overrides,
});

describe("deleteChildAccount (UC-PAR-delete-kid-account)", () => {
  beforeAll(async () => {
    hash = await hashPassword(PASSWORD);
  });
  beforeEach(async () => {
    await resetDatabase();
    setClock(() => AT);
  });
  afterEach(() => {
    resetClock();
    vi.restoreAllMocks();
  });

  it("main: the right password and nickname delete the child and clear the parent's throttle count", async () => {
    const { childId, email } = await familyWithChild();
    await claimWrong(email, 2);

    const result = await deleteChildAccount(request(childId));

    expect(result).toEqual({ ok: true, data: null });
    expect(await childExists(childId)).toBe(false);
    expect(await failuresFor(email)).toBe(0);
  });

  it("1a: a Sub Parent gets NOT_MAIN_PARENT and nothing is deleted or counted", async () => {
    const { childId, familyId } = await familyWithChild();
    const sub = await insertParent({
      parentRole: "sub",
      familyId: new ObjectId(familyId),
    });
    signInAs(sub.userId);

    expect(await deleteChildAccount(request(childId))).toMatchObject({
      ok: false,
      error: { code: "NOT_MAIN_PARENT" },
    });
    expect(await childExists(childId)).toBe(true);
    expect(await getDb().collection("signInAttempts").countDocuments()).toBe(0);
  });

  it("4a, password: a wrong password is WRONG_PASSWORD, adds one failure and deletes nothing", async () => {
    const { childId, email } = await familyWithChild();

    const result = await deleteChildAccount(
      request(childId, { password: "not the password" }),
    );

    expect(result).toMatchObject({
      ok: false,
      error: { code: "WRONG_PASSWORD" },
    });
    expect(await failuresFor(email)).toBe(1);
    expect(await childExists(childId)).toBe(true);
  });

  it.each(["starfish", "Starfisx", "Star fish"])(
    "4a, nickname: %j is NICKNAME_MISMATCH and deletes nothing",
    async (typed) => {
      const { childId } = await familyWithChild();

      expect(
        await deleteChildAccount(request(childId, { nickname: typed })),
      ).toMatchObject({ ok: false, error: { code: "NICKNAME_MISMATCH" } });
      expect(await childExists(childId)).toBe(true);
    },
  );

  it("4a, nickname: spaces around the right nickname are ignored", async () => {
    const { childId } = await familyWithChild();

    expect(
      await deleteChildAccount(
        request(childId, { nickname: `  ${NICKNAME} ` }),
      ),
    ).toEqual({ ok: true, data: null });
    expect(await childExists(childId)).toBe(false);
  });

  it("4a, throttle: failures at sign-in and here share one count; then even the right password is TOO_MANY_ATTEMPTS until the wait passes", async () => {
    const { childId, email } = await familyWithChild();
    for (let i = 0; i < 3; i++) {
      await signInMainParent(email, "wrong at sign-in");
    }
    for (let i = 0; i < 2; i++) {
      await deleteChildAccount(request(childId, { password: "wrong here" }));
    }

    const blocked = await deleteChildAccount(request(childId));
    expect(blocked).toMatchObject({
      ok: false,
      error: { code: "TOO_MANY_ATTEMPTS" },
    });
    expect(await childExists(childId)).toBe(true);

    setClock(() => new Date(AT.getTime() + 31_000));
    expect(await deleteChildAccount(request(childId))).toEqual({
      ok: true,
      data: null,
    });
  });

  it("4a, parallel re-checks: with the count one short of a wait, simultaneous wrong passwords are each counted and the rest get TOO_MANY_ATTEMPTS", async () => {
    const { childId, email } = await familyWithChild();
    await claimWrong(email, 4);

    const results = await Promise.all(
      Array.from({ length: 4 }, () =>
        deleteChildAccount(request(childId, { password: "wrong" })),
      ),
    );

    const codes = results.map((r) => (r.ok ? "ok" : r.error.code)).sort();
    expect(codes).toEqual([
      "TOO_MANY_ATTEMPTS",
      "TOO_MANY_ATTEMPTS",
      "TOO_MANY_ATTEMPTS",
      "WRONG_PASSWORD",
    ]);
    expect(await failuresFor(email)).toBe(5);
    expect(await childExists(childId)).toBe(true);
  });

  it("4a, mixed outcomes: a correct password that settles while a wrong one is still being checked keeps that failure (review of #125)", async () => {
    const { childId, email } = await familyWithChild();
    // The right password with the wrong nickname, so nothing is deleted.
    const releaseRight = holdNextCheck();
    const right = deleteChildAccount(request(childId, { nickname: "Not it" }));
    await untilPending(email, 1);
    const releaseWrong = holdNextCheck();
    const wrong = deleteChildAccount(request(childId, { password: "wrong" }));
    await untilPending(email, 2);

    releaseRight();
    expect(await right).toMatchObject({
      ok: false,
      error: { code: "NICKNAME_MISMATCH" },
    });
    releaseWrong();
    expect(await wrong).toMatchObject({
      ok: false,
      error: { code: "WRONG_PASSWORD" },
    });

    expect(await failuresFor(email)).toBe(1);
    expect(await childExists(childId)).toBe(true);
  });

  it("4a, mixed outcomes: a wrong password that settled before a correct one is cleared by it", async () => {
    const { childId, email } = await familyWithChild();
    const releaseWrong = holdNextCheck();
    const wrong = deleteChildAccount(request(childId, { password: "wrong" }));
    await untilPending(email, 1);
    const releaseRight = holdNextCheck();
    const right = deleteChildAccount(request(childId, { nickname: "Not it" }));
    await untilPending(email, 2);

    releaseWrong();
    expect(await wrong).toMatchObject({
      ok: false,
      error: { code: "WRONG_PASSWORD" },
    });
    releaseRight();
    expect(await right).toMatchObject({
      ok: false,
      error: { code: "NICKNAME_MISMATCH" },
    });

    expect(await failuresFor(email)).toBe(0);
    expect(await childExists(childId)).toBe(true);
  });

  it("authorization: another family's child is CHILD_NOT_FOUND, uncounted; no session, a child and an admin are refused", async () => {
    const { childId } = await familyWithChild();
    const stranger = await insertConsentedMainParent();
    signInAs(stranger.userId);
    expect(await deleteChildAccount(request(childId))).toMatchObject({
      ok: false,
      error: { code: "CHILD_NOT_FOUND" },
    });
    expect(await getDb().collection("signInAttempts").countDocuments()).toBe(0);

    signInAs(null);
    expect(await deleteChildAccount(request(childId))).toMatchObject({
      ok: false,
      error: { code: "NOT_SIGNED_IN" },
    });
    for (const role of ["child", "admin"] as const) {
      signInAs((await insertUserWithRole(role)).userId);
      expect(await deleteChildAccount(request(childId))).toMatchObject({
        ok: false,
        error: { code: "NOT_A_PARENT" },
      });
    }
    expect(await childExists(childId)).toBe(true);
  });

  it("validation: a missing password or nickname is refused before the password check", async () => {
    const { childId, email } = await familyWithChild();

    expect(
      await deleteChildAccount(request(childId, { password: "" })),
    ).toMatchObject({ ok: false, error: { code: "PASSWORD_REQUIRED" } });
    expect(
      await deleteChildAccount(request(childId, { nickname: " " })),
    ).toMatchObject({ ok: false, error: { code: "NICKNAME_REQUIRED" } });
    expect(await failuresFor(email)).toBe(0);
    expect(await childExists(childId)).toBe(true);
  });

  it("logging: a success, a wrong password and a 5b failure log no password, nickname, username or email", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const warnings = vi.spyOn(console, "warn").mockImplementation(() => {});
    const first = await familyWithChild();
    await deleteChildAccount(request(first.childId, { password: "wrong pw" }));
    await deleteChildAccount(request(first.childId));

    await resetDatabase();
    const second = await familyWithChild();
    const original = Reflect.get(Collection.prototype, "deleteMany") as (
      this: Collection,
      ...args: unknown[]
    ) => unknown;
    vi.spyOn(Collection.prototype, "deleteMany").mockImplementation(function (
      this: Collection,
      ...args: unknown[]
    ) {
      if (this.collectionName === "parentNotes") throw new Error("down");
      return original.apply(this, args);
    } as Collection["deleteMany"]);
    const failed = await deleteChildAccount(request(second.childId));
    expect(failed).toMatchObject({
      ok: false,
      error: { code: "DELETE_FAILED", errorId: expect.any(String) as unknown },
    });

    const output = JSON.stringify([
      ...errors.mock.calls,
      ...warnings.mock.calls,
    ]);
    expect(output).toContain("reauth-refused");
    for (const secret of [
      PASSWORD,
      "wrong pw",
      NICKNAME,
      USERNAME,
      first.email,
      second.email,
    ]) {
      expect(output).not.toContain(secret);
    }
  });
});

/** `count` wrong passwords, each checked and settled, as at the sign-in page. */
async function claimWrong(email: string, count: number) {
  for (let i = 0; i < count; i++) {
    await checkPasswordAttempt(email, () => Promise.resolve(false));
  }
}

/** Makes the next password check wait until the returned function is called. */
function holdNextCheck(): () => void {
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  vi.mocked(verifyPassword).mockImplementationOnce(async (password, hash) => {
    await gate;
    return realPasswords.verifyPassword(password, hash);
  });
  return () => {
    release();
  };
}

/** Waits until `count` claimed checks are still running for the account. */
async function untilPending(email: string, count: number) {
  await vi.waitFor(async () => {
    const row = await getDb()
      .collection<{ accountKey: string; pending?: number }>("signInAttempts")
      .findOne({ accountKey: email });
    expect(row?.pending).toBe(count);
  });
}
