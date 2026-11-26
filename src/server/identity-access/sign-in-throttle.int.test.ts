import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetDatabase } from "../../../tests/integration/db";
import { resetClock, setClock } from "@/server/lib/clock";
import { getDb } from "@/server/lib/db";
import {
  CHILD_THROTTLE,
  checkPasswordAttempt,
  clearSignInAttempts,
  purgeExpiredSignInAttempts,
} from "./sign-in-throttle";

// checkPasswordAttempt, the one way every password entry point checks a password
// (SEC-signin-throttling; design/par.md, Child-data review dependencies). Each check
// below waits on a promise the test resolves, so the order in which attempts finish is
// fixed rather than left to the scheduler. Invented account keys only.

const KEY = "invented-parent@example.test";
const AT = new Date("2026-11-25T15:00:00Z");

type Row = {
  failures: number;
  pending?: number;
  allowedAt: Date;
  expiresAt: Date;
};
const row = () =>
  getDb().collection<Row & { accountKey: string }>("signInAttempts").findOne({
    accountKey: KEY,
  });

/** A check the test finishes later with `finish(true | false)`. */
function heldCheck() {
  let finish: (matched: boolean) => void = () => undefined;
  const result = new Promise<boolean>((resolve) => {
    finish = resolve;
  });
  return { verify: () => result, finish };
}

/** Lets the attempts already started reach their check before the test goes on. */
async function untilPending(count: number) {
  await vi.waitFor(async () => {
    expect((await row())?.pending).toBe(count);
  });
}

const DAY_MS = 24 * 60 * 60 * 1000;
let clock = AT;

describe("checkPasswordAttempt (§8.2.8)", () => {
  beforeEach(async () => {
    await resetDatabase();
    clock = AT;
    setClock(() => clock);
  });
  afterEach(() => {
    resetClock();
    vi.restoreAllMocks();
  });

  it("a correct password while a wrong one is still being checked keeps that failure (review of #125)", async () => {
    const wrong = heldCheck();
    const right = heldCheck();
    const wrongAttempt = checkPasswordAttempt(KEY, wrong.verify);
    await untilPending(1);
    const rightAttempt = checkPasswordAttempt(KEY, right.verify);
    await untilPending(2);

    // The correct password finishes first, then the wrong one it overlapped.
    right.finish(true);
    expect(await rightAttempt).toEqual({ outcome: "matched" });
    wrong.finish(false);
    expect(await wrongAttempt).toEqual({ outcome: "refused" });

    expect(await row()).toMatchObject({ failures: 1, pending: 0 });
  });

  it("a wrong password that finished before a correct one is cleared by it", async () => {
    const wrong = heldCheck();
    const right = heldCheck();
    const wrongAttempt = checkPasswordAttempt(KEY, wrong.verify);
    await untilPending(1);
    const rightAttempt = checkPasswordAttempt(KEY, right.verify);
    await untilPending(2);

    wrong.finish(false);
    expect(await wrongAttempt).toEqual({ outcome: "refused" });
    right.finish(true);
    expect(await rightAttempt).toEqual({ outcome: "matched" });

    expect(await row()).toBeNull();
  });

  it("mixed parallel attempts: every wrong one still in flight when a correct one succeeds stays counted", async () => {
    const wrongs = [heldCheck(), heldCheck(), heldCheck()];
    const right = heldCheck();
    const wrongAttempts = wrongs.map((check) =>
      checkPasswordAttempt(KEY, check.verify),
    );
    await untilPending(3);
    const rightAttempt = checkPasswordAttempt(KEY, right.verify);
    await untilPending(4);

    right.finish(true);
    await rightAttempt;
    for (const check of wrongs) check.finish(false);
    await Promise.all(wrongAttempts);

    expect(await row()).toMatchObject({ failures: 3, pending: 0 });
  });

  it("a correct password with nothing else in flight deletes the count, as sign-in did", async () => {
    for (let i = 0; i < 3; i++) {
      await checkPasswordAttempt(KEY, () => Promise.resolve(false));
    }
    expect(await row()).toMatchObject({ failures: 3, pending: 0 });

    expect(
      await checkPasswordAttempt(KEY, () => Promise.resolve(true)),
    ).toEqual({ outcome: "matched" });
    expect(await row()).toBeNull();
  });

  it("an account in its wait never runs the check (no scrypt) and is not counted", async () => {
    for (let i = 0; i < 5; i++) {
      await checkPasswordAttempt(KEY, () => Promise.resolve(false));
    }
    const verify = vi.fn(() => Promise.resolve(true));

    expect(await checkPasswordAttempt(KEY, verify)).toEqual({
      outcome: "wait",
      waitSeconds: 30,
    });
    expect(verify).not.toHaveBeenCalled();
    expect(await row()).toMatchObject({ failures: 5, pending: 0 });
  });

  it("a check that throws counts as a wrong password, is no longer pending, and rethrows", async () => {
    await expect(
      checkPasswordAttempt(KEY, () =>
        Promise.reject(new Error("invented: hash unreadable")),
      ),
    ).rejects.toThrow("invented: hash unreadable");

    expect(await row()).toMatchObject({ failures: 1, pending: 0 });
  });

  it("a row from before the pending count is still throttled and cleared", async () => {
    await getDb()
      .collection("signInAttempts")
      .insertOne({
        accountKey: KEY,
        failures: 2,
        allowedAt: AT,
        expiresAt: new Date(AT.getTime() + 24 * 60 * 60 * 1000),
      });

    await checkPasswordAttempt(KEY, () => Promise.resolve(false));
    expect(await row()).toMatchObject({ failures: 3, pending: 0 });
    await checkPasswordAttempt(KEY, () => Promise.resolve(true));
    expect(await row()).toBeNull();
  });

  it("a check that started before a password reset leaves the newer count alone (review of #130)", async () => {
    const before = heldCheck();
    const beforeAttempt = checkPasswordAttempt(KEY, before.verify);
    await untilPending(1);
    // A password reset deletes the count while that check is still running.
    await clearSignInAttempts(KEY);
    const after = heldCheck();
    const afterAttempt = checkPasswordAttempt(KEY, after.verify);
    await untilPending(1);

    // The old check succeeds: it must not clear the new count's in-flight failure.
    before.finish(true);
    expect(await beforeAttempt).toEqual({ outcome: "matched" });
    expect(await row()).toMatchObject({ failures: 1, pending: 1 });

    after.finish(false);
    expect(await afterAttempt).toEqual({ outcome: "refused" });
    expect(await row()).toMatchObject({ failures: 1, pending: 0 });
  });

  it("a check that started before its count expired leaves the restarted count alone (review of #130)", async () => {
    const old = heldCheck();
    const oldAttempt = checkPasswordAttempt(KEY, old.verify);
    await untilPending(1);

    // The count expires and a new attempt restarts it while the old check still runs.
    clock = new Date(AT.getTime() + DAY_MS);
    const wrong = heldCheck();
    const wrongAttempt = checkPasswordAttempt(KEY, wrong.verify);
    await vi.waitFor(async () => {
      expect((await row())?.expiresAt).toEqual(
        new Date(clock.getTime() + DAY_MS),
      );
    });
    const right = heldCheck();
    const rightAttempt = checkPasswordAttempt(KEY, right.verify);
    await untilPending(2);

    // The old wrong check finishing must not take the new wrong one off pending,
    // so the correct password then keeps that failure.
    old.finish(false);
    expect(await oldAttempt).toEqual({ outcome: "refused" });
    expect(await row()).toMatchObject({ failures: 2, pending: 2 });
    right.finish(true);
    expect(await rightAttempt).toEqual({ outcome: "matched" });
    wrong.finish(false);
    expect(await wrongAttempt).toEqual({ outcome: "refused" });

    expect(await row()).toMatchObject({ failures: 1, pending: 0 });
  });
});

// The child's numbers (design/shlf.md, Data model): 3 free attempts, a wait of 30 seconds
// doubling to at most 2 minutes, and one attempt forgiven every 30 minutes.
describe("checkPasswordAttempt with the child's numbers", () => {
  const CHILD_KEY = "child:invented_reader:shared";
  const MINUTE_MS = 60 * 1000;
  const after = (ms: number) => new Date(AT.getTime() + ms);
  const childRow = () =>
    getDb()
      .collection<Row & { accountKey: string }>("signInAttempts")
      .findOne({ accountKey: CHILD_KEY });
  const attempt = (matched: boolean) =>
    checkPasswordAttempt(
      CHILD_KEY,
      () => Promise.resolve(matched),
      CHILD_THROTTLE,
    );
  const refused = { outcome: "refused" };
  const wait = (waitSeconds: number) => ({ outcome: "wait", waitSeconds });

  /** Three wrong attempts at AT, which start the first 30 second wait. */
  async function threeWrong() {
    for (let i = 0; i < 3; i++) expect(await attempt(false)).toEqual(refused);
  }

  beforeEach(async () => {
    await resetDatabase();
    clock = AT;
    setClock(() => clock);
  });
  afterEach(() => {
    resetClock();
  });

  it("answers three wrong attempts at once, then waits 30, 60 and 120 seconds and no longer", async () => {
    await threeWrong();
    for (const seconds of [30, 60, 120, 120, 120]) {
      expect(await attempt(false)).toEqual(wait(seconds));
      clock = new Date(clock.getTime() + seconds * 1000);
      expect(await attempt(false)).toEqual(refused);
    }
  });

  it("refuses an attempt during a wait without checking, counting or lengthening it", async () => {
    await threeWrong();
    const before = await childRow();
    clock = after(10 * 1000);
    const verify = vi.fn(() => Promise.resolve(true));
    expect(
      await checkPasswordAttempt(CHILD_KEY, verify, CHILD_THROTTLE),
    ).toEqual(wait(20));
    expect(verify).not.toHaveBeenCalled();
    expect(await childRow()).toEqual(before);
  });

  it.each([
    // The wait ends 30 seconds after AT, and the 30 minutes start there.
    ["not before 30 minutes", 30 * MINUTE_MS + 30 * 1000 - 1, 4, 60],
    ["after 30 minutes", 30 * MINUTE_MS + 30 * 1000, 3, 30],
    // 30 minutes after the attempt, but only 29.5 after the wait.
    ["none of the wait", 30 * MINUTE_MS, 4, 60],
  ])("forgives an attempt %s", async (_label, later, failures, nextWait) => {
    await threeWrong();
    clock = after(later);
    expect(await attempt(false)).toEqual(refused);
    expect(await childRow()).toMatchObject({ failures });
    expect(await attempt(false)).toEqual(wait(nextWait));
  });

  it("is gone once every attempt is forgiven, and the cleanup keeps it until then", async () => {
    await threeWrong();
    const gone = 30 * 1000 + 90 * MINUTE_MS;
    expect((await childRow())?.expiresAt).toEqual(after(gone));
    clock = after(gone - 1);
    expect(await purgeExpiredSignInAttempts()).toBe(0);
    clock = after(gone);
    expect(await purgeExpiredSignInAttempts()).toBe(1);
    expect(await childRow()).toBeNull();
  });

  it("starts from one again on a forgiven row the cleanup has not reached", async () => {
    await threeWrong();
    clock = after(24 * 60 * MINUTE_MS);
    await attempt(false);
    expect(await childRow()).toMatchObject({ failures: 1 });
  });

  it("lets at most three of ten guesses sent at once be checked", async () => {
    const verify = vi.fn(() => Promise.resolve(false));
    const outcomes = await Promise.all(
      Array.from({ length: 10 }, () =>
        checkPasswordAttempt(CHILD_KEY, verify, CHILD_THROTTLE),
      ),
    );
    expect(verify).toHaveBeenCalledTimes(3);
    expect(outcomes.filter((o) => o.outcome === "wait")).toHaveLength(7);
    expect(await childRow()).toMatchObject({
      failures: 3,
      pending: 0,
      allowedAt: after(30 * 1000),
    });
  });

  it("never locks: the right password signs in after any wait and clears the count", async () => {
    await threeWrong();
    for (let i = 0; i < 10; i++) {
      clock = new Date(clock.getTime() + 2 * MINUTE_MS);
      await attempt(false);
    }
    clock = new Date(clock.getTime() + 2 * MINUTE_MS);
    expect(await attempt(true)).toEqual({ outcome: "matched" });
    expect(await childRow()).toBeNull();
  });

  it("keeps a failure still in flight after a success, and expires it with that count", async () => {
    const wrong = heldCheck();
    const wrongAttempt = checkPasswordAttempt(
      CHILD_KEY,
      wrong.verify,
      CHILD_THROTTLE,
    );
    await vi.waitFor(async () => {
      expect((await childRow())?.pending).toBe(1);
    });
    await attempt(true);
    wrong.finish(false);
    await wrongAttempt;
    expect(await childRow()).toMatchObject({
      failures: 1,
      expiresAt: after(30 * MINUTE_MS),
    });
  });
});
