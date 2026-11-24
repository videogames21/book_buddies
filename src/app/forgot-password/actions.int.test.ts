import { ObjectId } from "mongodb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { insertConsentRecord } from "../../../tests/fixtures/family";
import {
  insertParent,
  insertUserWithRole,
} from "../../../tests/fixtures/users";
import { resetDatabase } from "../../../tests/integration/db";

// after() needs a real request, so its callbacks are collected here and run by hand.
const { pending, sentEmails, sendEmail } = vi.hoisted(() => {
  const sentEmails: { to: string; text: string }[] = [];
  return {
    pending: [] as (() => Promise<unknown>)[],
    sentEmails,
    sendEmail: vi.fn((message: { to: string; text: string }) => {
      sentEmails.push(message);
      return Promise.resolve({ ok: true });
    }),
  };
});
vi.mock("next/server", () => ({
  after: (task: () => Promise<unknown>) => pending.push(task),
}));
vi.mock("@/server/notification/email", () => ({ sendEmail }));

const { requestPasswordReset } = await import("./actions");
const { hashResetToken } =
  await import("@/server/identity-access/password-resets");
const { getDb } = await import("@/server/lib/db");
const { resetClock, setClock } = await import("@/server/lib/clock");

const NOW = new Date("2026-11-20T12:00:00Z");
const resets = () => getDb().collection("passwordResets");
const emailOf = (userId: string) => `parent-${userId}@example.test`;
const tokenFrom = (text: string) =>
  decodeURIComponent(/#token=([A-Za-z0-9_%-]+)/.exec(text)?.[1] ?? "");

/** A Main Parent as sign-up writes one, with a password hash. */
async function insertMainParent() {
  const parent = await insertParent({ parentRole: "main" });
  await getDb()
    .collection("users")
    .updateOne(
      { _id: new ObjectId(parent.userId) },
      { $set: { passwordHash: "scrypt$invented-hash" } },
    );
  return parent;
}

/** Requests a reset as the page does, then runs what after() was given. */
async function request(email: string) {
  const result = await requestPasswordReset({ email });
  for (const task of pending.splice(0)) await task();
  return result;
}

beforeEach(async () => {
  await resetDatabase();
  pending.length = 0;
  sentEmails.length = 0;
  sendEmail.mockClear();
  setClock(() => NOW);
});
afterEach(() => {
  resetClock();
  vi.restoreAllMocks();
});

describe("requestPasswordReset (OI-44)", () => {
  it("stores one hashed token with a one-hour expiry and sends one link, whatever the onboarding step", async () => {
    const parent = await insertMainParent();
    await insertConsentRecord(parent, false); // still awaiting confirmation
    expect(await request(emailOf(parent.userId).toUpperCase())).toEqual({
      ok: true,
      data: null,
    });

    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0]?.to).toBe(emailOf(parent.userId));
    const token = tokenFrom(sentEmails[0]?.text ?? "");
    expect(sentEmails[0]?.text).toContain("/reset-password#token=");
    const rows = await resets().find().toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      userId: new ObjectId(parent.userId),
      tokenHash: hashResetToken(token),
      issuedAt: NOW,
      expiresAt: new Date(NOW.getTime() + 60 * 60 * 1000),
    });
    expect(JSON.stringify(rows)).not.toContain(token);
  });

  it("gives the same answer and sends nothing for an unknown email, a Sub Parent, a child or an admin", async () => {
    const main = await insertMainParent();
    const sub = await insertParent({
      parentRole: "sub",
      familyId: new ObjectId(main.familyId),
    });
    const admin = await insertUserWithRole("admin");
    await getDb()
      .collection("users")
      .updateOne(
        { _id: new ObjectId(admin.userId) },
        { $set: { email: "invented-admin@example.test" } },
      );
    await insertUserWithRole("child");
    for (const email of [
      "nobody@example.test",
      emailOf(sub.userId),
      "invented-admin@example.test",
    ]) {
      expect(await request(email)).toEqual({ ok: true, data: null });
    }
    expect(sendEmail).not.toHaveBeenCalled();
    expect(await resets().countDocuments()).toBe(0);
  });

  it("refuses only a malformed email, and schedules nothing", async () => {
    expect(await requestPasswordReset({ email: "nope" })).toMatchObject({
      error: { code: "INVALID_EMAIL" },
    });
    expect(pending).toHaveLength(0);
  });

  it("sends nothing more within five minutes; after that, a new token replaces the first", async () => {
    const parent = await insertMainParent();
    await request(emailOf(parent.userId));
    const first = tokenFrom(sentEmails[0]?.text ?? "");

    setClock(() => new Date(NOW.getTime() + 5 * 60 * 1000 - 1));
    expect(await request(emailOf(parent.userId))).toEqual({
      ok: true,
      data: null,
    });
    expect(sentEmails).toHaveLength(1);

    setClock(() => new Date(NOW.getTime() + 5 * 60 * 1000));
    await request(emailOf(parent.userId));
    expect(sentEmails).toHaveLength(2);
    const rows = await resets().find().toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.tokenHash).not.toBe(hashResetToken(first));
  });

  it("two requests at once send one email", async () => {
    const parent = await insertMainParent();
    await Promise.all([
      requestPasswordReset({ email: emailOf(parent.userId) }),
      requestPasswordReset({ email: emailOf(parent.userId) }),
    ]);
    await Promise.all(pending.splice(0).map((task) => task()));
    expect(sentEmails).toHaveLength(1);
  });

  it("logs no email when sending fails", async () => {
    const lines: string[] = [];
    vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      lines.push(args.map(String).join(" "));
    });
    const parent = await insertMainParent();
    sendEmail.mockRejectedValueOnce(
      new Error(`failed for ${emailOf(parent.userId)}`),
    );
    expect(await request(emailOf(parent.userId))).toMatchObject({ ok: true });
    expect(lines.join("\n")).not.toContain("@example.test");
  });
});
