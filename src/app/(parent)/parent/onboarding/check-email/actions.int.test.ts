import { ObjectId } from "mongodb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { insertConsentRecord } from "../../../../../../tests/fixtures/family";
import {
  insertParent,
  insertUserWithRole,
} from "../../../../../../tests/fixtures/users";
import { resetDatabase } from "../../../../../../tests/integration/db";

// The transport is replaced in memory, as in sign-up's tests.
const { sentEmails, sendEmail } = vi.hoisted(() => {
  const sentEmails: { to: string; text: string }[] = [];
  return {
    sentEmails,
    sendEmail: vi.fn((message: { to: string; text: string }) => {
      sentEmails.push(message);
      return Promise.resolve({ ok: true });
    }),
  };
});
vi.mock("@/server/notification/email", () => ({ sendEmail }));
vi.mock("@/server/identity-access/auth", () => ({ auth: vi.fn() }));

const { resendConsentEmail } = await import("./actions");
const { checkEmailView } = await import("./view");
const { confirmConsent } = await import("@/app/consent/confirm/actions");
const { hashConfirmationToken } =
  await import("@/server/accounts-family/families");
const { consentNoticeVersion } =
  await import("@/server/accounts-family/consent-notice");
const { auth } = await import("@/server/identity-access/auth");
const { getDb } = await import("@/server/lib/db");
const { resetClock, setClock } = await import("@/server/lib/clock");
const mockedAuth = vi.mocked(
  auth as unknown as () => Promise<{ user: { id: string } } | null>,
);

// The fixture's unconfirmed record has confirmBy 2026-10-15T12:00:00Z.
const BEFORE = new Date("2026-10-10T12:00:00Z");
const DEADLINE = new Date("2026-10-15T12:00:00Z");
const OLD_TOKEN = "invented-first-token";

const recordOf = (familyId: string) =>
  getDb()
    .collection("consentRecords")
    .findOne({ familyId: new ObjectId(familyId) });
const tokenFrom = (text: string) =>
  decodeURIComponent(/#token=([A-Za-z0-9_%-]+)/.exec(text)?.[1] ?? "");

/** A signed-in Main Parent awaiting confirmation, whose first link holds OLD_TOKEN. */
async function signedInAwaiting(noticeVersion = consentNoticeVersion(14)) {
  const parent = await insertParent({ parentRole: "main" });
  await insertConsentRecord(parent, false);
  await getDb()
    .collection("consentRecords")
    .updateOne(
      { familyId: new ObjectId(parent.familyId) },
      {
        $set: {
          confirmationTokenHash: hashConfirmationToken(OLD_TOKEN),
          noticeVersion,
        },
      },
    );
  mockedAuth.mockResolvedValue({ user: { id: parent.userId } });
  return parent;
}

beforeEach(async () => {
  await resetDatabase();
  sentEmails.length = 0;
  sendEmail.mockClear();
  mockedAuth.mockReset();
  mockedAuth.mockResolvedValue(null);
  setClock(() => BEFORE);
});
afterEach(() => {
  resetClock();
  vi.restoreAllMocks();
});

describe("resendConsentEmail (UC-PAR-onboarding 6b)", () => {
  it("replaces the token: the old link is invalid, the new one confirms, confirmBy is unchanged", async () => {
    const parent = await signedInAwaiting();
    expect(await resendConsentEmail()).toEqual({ ok: true, data: null });

    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0]?.to).toBe(`parent-${parent.userId}@example.test`);
    const record = await recordOf(parent.familyId);
    expect(record?.confirmBy).toEqual(DEADLINE);
    const newToken = tokenFrom(sentEmails[0]?.text ?? "");
    expect(record?.confirmationTokenHash).toBe(hashConfirmationToken(newToken));

    mockedAuth.mockResolvedValue(null);
    expect(await confirmConsent(OLD_TOKEN)).toMatchObject({
      error: { code: "LINK_INVALID" },
    });
    expect(await confirmConsent(newToken)).toMatchObject({ ok: true });
  });

  it("restates the notice and window the parent originally acknowledged", async () => {
    const version = consentNoticeVersion(10);
    const parent = await signedInAwaiting(version);
    await getDb()
      .collection("consentRecords")
      .updateOne(
        { familyId: new ObjectId(parent.familyId) },
        { $set: { acknowledgedAt: new Date("2026-10-05T12:00:00Z") } },
      );
    expect(await resendConsentEmail()).toEqual({ ok: true, data: null });
    expect(sentEmails[0]?.text).toContain(`consent notice version ${version}`);
    expect(sentEmails[0]?.text).toContain("within 10 days");
    expect(sentEmails[0]?.text).not.toContain("within 14 days");
    expect((await recordOf(parent.familyId))?.confirmBy).toEqual(DEADLINE);
  });

  it("does not send different text or rotate the token for an unknown notice version", async () => {
    const parent = await signedInAwaiting("unknown-notice-14d");
    expect(await resendConsentEmail()).toMatchObject({
      error: { code: "SEND_FAILED" },
    });
    expect(sendEmail).not.toHaveBeenCalled();
    expect((await recordOf(parent.familyId))?.confirmationTokenHash).toBe(
      hashConfirmationToken(OLD_TOKEN),
    );
  });

  it("a confirmed family gets ALREADY_CONFIRMED and no email", async () => {
    const parent = await insertParent({ parentRole: "main" });
    await insertConsentRecord(parent, true);
    mockedAuth.mockResolvedValue({ user: { id: parent.userId } });
    expect(await resendConsentEmail()).toMatchObject({
      error: { code: "ALREADY_CONFIRMED" },
    });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("6a: from the deadline on, SIGN_UP_EXPIRED, no email and nothing changed", async () => {
    const parent = await signedInAwaiting();
    setClock(() => DEADLINE);
    expect(await resendConsentEmail()).toMatchObject({
      error: { code: "SIGN_UP_EXPIRED" },
    });
    expect(sendEmail).not.toHaveBeenCalled();
    expect((await recordOf(parent.familyId))?.confirmationTokenHash).toBe(
      hashConfirmationToken(OLD_TOKEN),
    );
  });

  it("refuses a Sub Parent, a child, an admin and no session (§8.1)", async () => {
    const main = await signedInAwaiting();
    const sub = await insertParent({
      parentRole: "sub",
      familyId: new ObjectId(main.familyId),
    });
    mockedAuth.mockResolvedValue({ user: { id: sub.userId } });
    expect(await resendConsentEmail()).toMatchObject({
      error: { code: "NOT_MAIN_PARENT" },
    });
    for (const role of ["child", "admin"] as const) {
      const user = await insertUserWithRole(role);
      mockedAuth.mockResolvedValue({ user: { id: user.userId } });
      expect(await resendConsentEmail()).toMatchObject({
        error: { code: "NOT_A_PARENT" },
      });
    }
    mockedAuth.mockResolvedValue(null);
    expect(await resendConsentEmail()).toMatchObject({
      error: { code: "NOT_SIGNED_IN" },
    });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("6b, send fails: the new token is kept and a second resend sends a link that confirms", async () => {
    const parent = await signedInAwaiting();
    sendEmail.mockResolvedValueOnce({ ok: false });
    expect(await resendConsentEmail()).toMatchObject({
      error: { code: "SEND_FAILED" },
    });
    expect(await checkEmailView()).toEqual({ state: "awaiting" });
    expect(await confirmConsent(OLD_TOKEN)).toMatchObject({
      error: { code: "LINK_INVALID" },
    });

    expect(await resendConsentEmail()).toMatchObject({ ok: true });
    const sent = sentEmails.at(-1)?.text ?? "";
    expect(await confirmConsent(tokenFrom(sent))).toMatchObject({ ok: true });
    expect((await recordOf(parent.familyId))?.confirmBy).toEqual(DEADLINE);
  });
});

describe("check-email page (UC-PAR-onboarding 6, 6a)", () => {
  it("shows check-email while awaiting and start again from the deadline on", async () => {
    await signedInAwaiting();
    expect(await checkEmailView()).toEqual({ state: "awaiting" });
    setClock(() => DEADLINE);
    expect(await checkEmailView()).toEqual({ state: "expired" });
  });

  it("sends a confirmed family, a Sub Parent and no session elsewhere", async () => {
    const parent = await insertParent({ parentRole: "main" });
    await insertConsentRecord(parent, true);
    mockedAuth.mockResolvedValue({ user: { id: parent.userId } });
    expect(await checkEmailView()).toEqual({ redirect: "/parent" });

    const sub = await insertParent({
      parentRole: "sub",
      familyId: new ObjectId(parent.familyId),
    });
    mockedAuth.mockResolvedValue({ user: { id: sub.userId } });
    expect(await checkEmailView()).toEqual({ redirect: "/parent" });

    mockedAuth.mockResolvedValue(null);
    expect(await checkEmailView()).toEqual({ redirect: "/sign-in" });

    const child = await insertUserWithRole("child");
    mockedAuth.mockResolvedValue({ user: { id: child.userId } });
    expect(await checkEmailView()).toEqual({ notFound: true });
  });
});
