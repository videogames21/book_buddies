import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetDatabase } from "../../../tests/integration/db";
import { resetClock, setClock } from "@/server/lib/clock";
import { getDb } from "@/server/lib/db";
import { checkPasswordAttempt } from "./sign-in-throttle";

// checkPasswordAttempt, the one way every password entry point checks a password
// (SEC-signin-throttling; design/par.md, Child-data review dependencies). Each check
// below waits on a promise the test resolves, so the order in which attempts finish is
// fixed rather than left to the scheduler. Invented account keys only.

const KEY = "invented-parent@example.test";
const AT = new Date("2026-11-25T15:00:00Z");

type Row = { failures: number; pending?: number; allowedAt: Date };
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

describe("checkPasswordAttempt (§8.2.8)", () => {
  beforeEach(async () => {
    await resetDatabase();
    setClock(() => AT);
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
});
