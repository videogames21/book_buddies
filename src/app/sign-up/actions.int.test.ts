import { ObjectId } from "mongodb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { insertUserWithRole } from "../../../tests/fixtures/users";
import { resetDatabase } from "../../../tests/integration/db";

// The transport is replaced in memory (design/par.md, Open questions: CI runs Mailpit
// only for end-to-end tests). The cookie jar stands in for next/headers.
const { sentEmails, sendEmail, cookieJar } = vi.hoisted(() => {
  const sentEmails: { to: string; subject: string; text: string }[] = [];
  return {
    sentEmails,
    sendEmail: vi.fn((message: (typeof sentEmails)[number]) => {
      sentEmails.push(message);
      return Promise.resolve({ ok: true });
    }),
    cookieJar: { set: vi.fn() },
  };
});
vi.mock("@/server/notification/email", () => ({ sendEmail }));
vi.mock("next/headers", () => ({ cookies: () => Promise.resolve(cookieJar) }));
vi.mock("@/server/identity-access/auth", () => ({ auth: vi.fn() }));
vi.mock("@/server/identity-access/passwords", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/server/identity-access/passwords")>();
  return { ...actual, hashPassword: vi.fn(actual.hashPassword) };
});
vi.mock("@/server/identity-access/sessions", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/server/identity-access/sessions")>();
  return {
    ...actual,
    createDatabaseSession: vi.fn(actual.createDatabaseSession),
  };
});
// A set version replaces the real one, to make the validator refuse the insert (5a).
const notice = vi.hoisted(() => ({ version: null as string | null }));
vi.mock("@/server/accounts-family/consent-notice", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/server/accounts-family/consent-notice")
    >();
  return {
    ...actual,
    consentNoticeVersion: (days: number) =>
      notice.version ?? actual.consentNoticeVersion(days),
  };
});

vi.mock("@/server/accounts-family/consent-email", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/server/accounts-family/consent-email")
    >();
  return { ...actual, buildConsentEmail: vi.fn(actual.buildConsentEmail) };
});

const { signUpParent } = await import("./actions");
const { buildConsentEmail } =
  await import("@/server/accounts-family/consent-email");
const { CONSENT_NOTICE_VERSION } =
  await import("@/server/accounts-family/consent-notice");
const { createDatabaseSession } =
  await import("@/server/identity-access/sessions");
const { hashPassword, verifyPassword } =
  await import("@/server/identity-access/passwords");
const { auth } = await import("@/server/identity-access/auth");
const mockedAuth = vi.mocked(
  auth as unknown as () => Promise<{ user: { id: string } } | null>,
);
const { hashConfirmationToken } =
  await import("@/server/accounts-family/families");
const { getDb } = await import("@/server/lib/db");
const { setClock, resetClock } = await import("@/server/lib/clock");

const SIGN_UP_AT = new Date("2026-11-20T12:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;

const input = {
  name: "Invented Parent",
  email: "Invented.Parent@Example.test",
  password: "correct horse battery",
  acknowledged: true,
};
const EMAIL = "invented.parent@example.test";

const db = () => getDb();
const count = (name: string, filter = {}) =>
  db().collection(name).countDocuments(filter);

/** The plaintext token, as only the email holds it. */
function tokenFromEmail(text: string): string {
  const match = /#token=([A-Za-z0-9_-]+)/.exec(text);
  if (!match) throw new Error("no link in the email");
  return decodeURIComponent(match[1]);
}

async function expectNothingStored() {
  expect(await count("users")).toBe(0);
  expect(await count("consentRecords")).toBe(0);
  expect(await count("sessions")).toBe(0);
  expect(cookieJar.set).not.toHaveBeenCalled();
  expect(sendEmail).not.toHaveBeenCalled();
}

beforeEach(async () => {
  await resetDatabase();
  sentEmails.length = 0;
  sendEmail.mockClear();
  cookieJar.set.mockClear();
  mockedAuth.mockReset();
  mockedAuth.mockResolvedValue(null);
  setClock(() => SIGN_UP_AT);
  notice.version = null;
});

afterEach(() => {
  resetClock();
  vi.restoreAllMocks();
});

describe("signUpParent, UC-PAR-onboarding main (steps 3–5)", () => {
  it("writes one Main Parent, one Consent Record and one session, sets the cookie and sends one email", async () => {
    expect(await signUpParent(input)).toEqual({
      ok: true,
      data: { emailSent: true },
    });

    const users = await db()
      .collection<{ _id: ObjectId; familyId: ObjectId; passwordHash: string }>(
        "users",
      )
      .find()
      .toArray();
    expect(users).toHaveLength(1);
    const user = users[0];
    expect(user).toMatchObject({
      role: "parent",
      parentRole: "main",
      name: "Invented Parent",
      email: EMAIL,
    });
    expect(user.passwordHash).toMatch(/^scrypt\$/);
    expect(await verifyPassword(input.password, user.passwordHash)).toBe(true);

    const records = await db().collection("consentRecords").find().toArray();
    expect(records).toHaveLength(1);
    const record = records[0];
    expect(record).toMatchObject({
      familyId: user.familyId,
      parentUserId: user._id,
      // The version names the window, so it points at the exact text shown.
      noticeVersion: `${CONSENT_NOTICE_VERSION}-14d`,
      method: "email-plus",
      acknowledgedAt: SIGN_UP_AT,
      confirmBy: new Date(SIGN_UP_AT.getTime() + 14 * DAY_MS),
    });
    expect(record.confirmedAt).toBeUndefined();

    const sessions = await db().collection("sessions").find().toArray();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].userId).toEqual(user._id);
    expect(cookieJar.set).toHaveBeenCalledTimes(1);
    expect(cookieJar.set.mock.calls[0][1]).toBe(sessions[0].sessionToken);

    expect(sentEmails).toHaveLength(1);
    const email = sentEmails[0];
    expect(email.to).toBe(EMAIL);
    expect(email.text).toContain(`version ${CONSENT_NOTICE_VERSION}-14d`);
    expect(email.text).toMatch(/account settings/);
    expect(email.text).toContain("December 4, 2026");
    // Only the token's hash is stored, never the token (design/par.md, Key decisions).
    const token = tokenFromEmail(email.text);
    expect(record.confirmationTokenHash).toBe(hashConfirmationToken(token));
    expect(JSON.stringify(records)).not.toContain(token);
  });

  it("3b: an unacknowledged notice is CONSENT_NOT_ACKNOWLEDGED and stores nothing", async () => {
    for (const acknowledged of [undefined, false, "true"]) {
      expect(await signUpParent({ ...input, acknowledged })).toMatchObject({
        ok: false,
        error: { code: "CONSENT_NOT_ACKNOWLEDGED" },
      });
    }
    await expectNothingStored();
  });

  it("4b and 4c: a bad email or weak password stores nothing", async () => {
    expect(await signUpParent({ ...input, email: "nope" })).toMatchObject({
      error: { code: "INVALID_EMAIL" },
    });
    expect(await signUpParent({ ...input, password: "short" })).toMatchObject({
      error: { code: "WEAK_PASSWORD" },
    });
    await expectNothingStored();
  });
});

describe("who may call signUpParent (§8.1)", () => {
  it("refuses a signed-in parent until their sign-up has expired (6a)", async () => {
    await signUpParent(input);
    const user = await db()
      .collection<{ _id: ObjectId }>("users")
      .findOne({ email: EMAIL });
    mockedAuth.mockResolvedValue({
      user: { id: user?._id.toHexString() ?? "" },
    });
    const second = { ...input, email: "second@example.test" };
    expect(await signUpParent(second)).toMatchObject({
      error: { code: "ALREADY_SIGNED_IN" },
    });
    expect(await count("users")).toBe(1);
    setClock(() => new Date(SIGN_UP_AT.getTime() + 14 * DAY_MS));
    expect(await signUpParent(second)).toMatchObject({ ok: true });
  });
});

describe("4a: email already registered", () => {
  it("refuses an email any user has, in any letter case, before hashing (OI-51), and stores nothing new", async () => {
    await signUpParent(input);
    sendEmail.mockClear();
    cookieJar.set.mockClear();
    vi.mocked(hashPassword).mockClear();
    expect(
      await signUpParent({ ...input, email: "INVENTED.PARENT@example.TEST" }),
    ).toMatchObject({ ok: false, error: { code: "EMAIL_TAKEN" } });
    expect(hashPassword).not.toHaveBeenCalled();
    expect(await count("users")).toBe(1);
    expect(await count("consentRecords")).toBe(1);
    expect(await count("sessions")).toBe(1);
    expect(cookieJar.set).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("refuses an email an admin already uses", async () => {
    const admin = await insertUserWithRole("admin");
    await db()
      .collection("users")
      .updateOne(
        { _id: new ObjectId(admin.userId) },
        { $set: { email: EMAIL } },
      );
    expect(await signUpParent(input)).toMatchObject({
      error: { code: "EMAIL_TAKEN" },
    });
    expect(await count("consentRecords")).toBe(0);
  });

  it("concurrent: two simultaneous sign-ups with one email leave one account and one record", async () => {
    const results = await Promise.all([
      signUpParent(input),
      signUpParent(input),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.map((r) => (r.ok ? "ok" : r.error.code)).sort()).toEqual([
      "EMAIL_TAKEN",
      "ok",
    ]);
    expect(await count("users")).toBe(1);
    expect(await count("consentRecords")).toBe(1);
    expect(await count("sessions")).toBe(1);
  });

  it("expired: an unconfirmed account past confirmBy does not block a new sign-up", async () => {
    await signUpParent(input);
    const old = await db()
      .collection<{ _id: ObjectId; familyId: ObjectId }>("users")
      .findOne({ email: EMAIL });
    await db()
      .collection("signInAttempts")
      .insertOne({
        accountKey: EMAIL,
        failures: 3,
        allowedAt: SIGN_UP_AT,
        expiresAt: new Date(SIGN_UP_AT.getTime() + 30 * DAY_MS),
      });
    // Still blocked one millisecond before the deadline.
    setClock(() => new Date(SIGN_UP_AT.getTime() + 14 * DAY_MS - 1));
    expect(await signUpParent(input)).toMatchObject({
      error: { code: "EMAIL_TAKEN" },
    });

    setClock(() => new Date(SIGN_UP_AT.getTime() + 14 * DAY_MS));
    expect(await signUpParent(input)).toMatchObject({ ok: true });
    const users = await db().collection("users").find().toArray();
    expect(users).toHaveLength(1);
    expect(users[0]._id).not.toEqual(old?._id);
    expect(await count("sessions", { userId: old?._id })).toBe(0);
    expect(await count("consentRecords", { familyId: old?.familyId })).toBe(0);
    expect(await count("consentRecords")).toBe(1);
    // The old account's throttle state goes with it.
    expect(await count("signInAttempts", { accountKey: EMAIL })).toBe(0);
    expect(
      await db()
        .collection("auditLog")
        .findOne({}, { projection: { _id: 0 } }),
    ).toEqual({
      actorRole: "system",
      event: "account.unconfirmed-purged",
      userId: old?._id,
      familyId: old?.familyId,
      occurredAt: new Date(SIGN_UP_AT.getTime() + 14 * DAY_MS),
    });
  });

  it("a confirmed account is never replaced, however old", async () => {
    await signUpParent(input);
    await db()
      .collection("consentRecords")
      .updateOne({}, { $set: { confirmedAt: SIGN_UP_AT } });
    setClock(() => new Date(SIGN_UP_AT.getTime() + 400 * DAY_MS));
    expect(await signUpParent(input)).toMatchObject({
      error: { code: "EMAIL_TAKEN" },
    });
    expect(await count("consentRecords", { confirmedAt: SIGN_UP_AT })).toBe(1);
  });
});

describe("5a: the account cannot be saved", () => {
  it("when the Consent Record insert fails, no user, record or session remains and no cookie is set", async () => {
    // An empty notice version fails the consentRecords validator inside the transaction.
    notice.version = "";
    vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await signUpParent(input);
    expect(result).toMatchObject({ ok: false, error: { code: "SAVE_FAILED" } });
    expect(!result.ok && result.error.errorId).toMatch(/^[0-9a-f-]{36}$/);
    await expectNothingStored();
  });

  it("when the session insert fails, no user, record or session remains and no cookie is set", async () => {
    vi.mocked(createDatabaseSession).mockRejectedValueOnce(
      new Error("timeout"),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await signUpParent(input)).toMatchObject({
      ok: false,
      error: { code: "SAVE_FAILED" },
    });
    await expectNothingStored();
  });
});

describe("5b: the confirmation email cannot be sent", () => {
  it("keeps the account, record and session, sets the cookie and answers emailSent false", async () => {
    sendEmail.mockResolvedValueOnce({ ok: false });
    expect(await signUpParent(input)).toEqual({
      ok: true,
      data: { emailSent: false },
    });
    expect(await count("users")).toBe(1);
    expect(await count("consentRecords")).toBe(1);
    expect(await count("sessions")).toBe(1);
    expect(cookieJar.set).toHaveBeenCalledTimes(1);
  });

  it("when building the email throws after commit, keeps the account and never reports SAVE_FAILED", async () => {
    vi.mocked(buildConsentEmail).mockImplementationOnce(() => {
      throw new Error("APP_URL must be configured");
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await signUpParent(input)).toEqual({
      ok: true,
      data: { emailSent: false },
    });
    expect(await count("users")).toBe(1);
    expect(await count("consentRecords")).toBe(1);
    expect(cookieJar.set).toHaveBeenCalledTimes(1);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("when setting the cookie throws after commit, still sends the email and never reports SAVE_FAILED", async () => {
    cookieJar.set.mockImplementationOnce(() => {
      throw new Error("cookie failure");
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await signUpParent(input)).toEqual({
      ok: true,
      data: { emailSent: true },
    });
    expect(await count("users")).toBe(1);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });
});

describe("8: the record sign-up wrote lets the confirmed parent add a child", () => {
  it("after confirmation a child is created; with revokedAt set, both checks refuse", async () => {
    const { confirmConsent } = await import("@/app/consent/confirm/actions");
    const { createChildAccount } =
      await import("@/app/(parent)/parent/children/new/actions");
    const { checkCreateChildAccess } =
      await import("@/app/(parent)/parent/children/new/access");
    await signUpParent(input);
    const user = await db()
      .collection<{ _id: ObjectId }>("users")
      .findOne({ email: EMAIL });
    mockedAuth.mockResolvedValue({
      user: { id: user?._id.toHexString() ?? "" },
    });
    expect(
      await confirmConsent(tokenFromEmail(sentEmails[0]?.text ?? "")),
    ).toEqual({ ok: true, data: { next: "/parent/children/new" } });

    expect(await checkCreateChildAccess()).toMatchObject({ ok: true });
    const child = {
      nickname: "Starfish",
      age: 8,
      grade: "3",
      username: "Star_Reader",
      avatar: "1-1",
    };
    expect(await createChildAccount(child)).toMatchObject({ ok: true });

    await db()
      .collection("consentRecords")
      .updateOne({}, { $set: { revokedAt: SIGN_UP_AT } });
    expect(await checkCreateChildAccess()).toMatchObject({
      error: { code: "CONSENT_NOT_CONFIRMED" },
    });
    expect(
      await createChildAccount({ ...child, username: "other_reader" }),
    ).toMatchObject({ error: { code: "CONSENT_NOT_CONFIRMED" } });
    expect(await count("children")).toBe(1);
  });
});

describe("UC-PAR-onboarding logging (§8.2.7)", () => {
  it("logs no name, email, password, confirmation token or session token", async () => {
    const lines: string[] = [];
    for (const method of ["log", "info", "warn", "error", "debug"] as const) {
      vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
        lines.push(args.map(String).join(" "));
      });
    }
    await signUpParent(input); // success
    sendEmail.mockResolvedValueOnce({ ok: false });
    await signUpParent({ ...input, email: "second@example.test" }); // 5b
    vi.mocked(createDatabaseSession).mockRejectedValueOnce(
      new Error(`failed for ${EMAIL}`),
    );
    await signUpParent({ ...input, email: "third@example.test" }); // 5a
    await signUpParent(input); // 4a

    const tokens = sentEmails.map((email) => tokenFromEmail(email.text));
    const sessionTokens = (
      await db().collection("sessions").find().toArray()
    ).map((s) => s.sessionToken as string);
    const output = lines.join("\n");
    for (const secret of [
      input.name,
      EMAIL,
      "second@example.test",
      "third@example.test",
      input.password,
      ...tokens,
      ...sessionTokens,
    ]) {
      expect(output).not.toContain(secret);
    }
  });
});
