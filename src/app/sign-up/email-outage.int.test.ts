import { format } from "node:util";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetDatabase } from "../../../tests/integration/db";

// Degradation: the email service is down (UC-PAR-onboarding 5b and 6b). Only the call
// that leaves the process, Nodemailer's sendMail, is replaced. Sign-up, the resend, the
// Email Service, the database and the check-email page are the real ones.
const { sendMail } = vi.hoisted(() => ({
  sendMail: vi.fn<(message: { to: string; text: string }) => Promise<object>>(),
}));
vi.mock("nodemailer", () => ({
  default: { createTransport: () => ({ sendMail }) },
}));
vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ set: vi.fn() }),
}));
// The page's resend button asks for a router, which only exists inside the running app.
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({}),
}));
vi.mock("@/server/identity-access/auth", () => ({ auth: vi.fn() }));

const { signUpParent } = await import("./actions");
const { resendConsentEmail } =
  await import("@/app/(parent)/parent/onboarding/check-email/actions");
const { default: CheckEmailPage } =
  await import("@/app/(parent)/parent/onboarding/check-email/page");
const { NOT_SENT_FLAG } =
  await import("@/app/(parent)/parent/onboarding/paths");
const { confirmConsent } = await import("@/app/consent/confirm/actions");
const { consentNoticeVersion } =
  await import("@/server/accounts-family/consent-notice");
const { auth } = await import("@/server/identity-access/auth");
const { getDb } = await import("@/server/lib/db");
const mockedAuth = vi.mocked(
  auth as unknown as () => Promise<{ user: { id: string } } | null>,
);

const input = {
  name: "Invented Parent",
  email: "invented.parent@example.test",
  password: "correct horse battery",
  acknowledged: true,
  noticeVersion: consentNoticeVersion(14),
};

// A real transport error can quote the recipient, so this one does too.
const timeout = Object.assign(new Error(`Timeout sending to ${input.email}`), {
  code: "ETIMEDOUT",
});

const count = (name: string) => getDb().collection(name).countDocuments();

/** Signs the saved parent in, as the session cookie would on the next request. */
async function signInSavedParent() {
  const user = await getDb().collection("users").findOne();
  if (!user) throw new Error("no account was saved");
  mockedAuth.mockResolvedValue({ user: { id: user._id.toString() } });
}

/** The plaintext token, as only the email holds it. */
function tokenFrom(text: string): string {
  const token = /#token=([A-Za-z0-9_-]+)/.exec(text)?.[1];
  if (!token) throw new Error("no link in the email");
  return token;
}

let logged: string[];

/** Checks everything logged so far against what must never be logged (§8.2.7). */
async function expectNoSecretsLogged() {
  const log = logged.join("\n");
  // The failure was logged, so the checks below are not passing on an empty log.
  expect(log).toContain("errorId");
  const sessions = await getDb().collection("sessions").find().toArray();
  for (const secret of [
    input.name,
    input.email,
    input.password,
    ...sendMail.mock.calls.map(([message]) => tokenFrom(message.text)),
    ...sessions.map((session) => session.sessionToken as string),
  ]) {
    expect(log).not.toContain(secret);
  }
}

beforeEach(async () => {
  await resetDatabase();
  mockedAuth.mockReset();
  mockedAuth.mockResolvedValue(null);
  sendMail.mockReset().mockRejectedValue(timeout);
  logged = [];
  for (const method of ["log", "info", "warn", "error", "debug"] as const) {
    vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
      // As the console would print it, so text inside an object is checked too.
      logged.push(format(...args));
    });
  }
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the email service is down", () => {
  it("5b: sign-up keeps the account and the parent is told the email was not sent", async () => {
    expect(await signUpParent(input)).toEqual({
      ok: true,
      data: { emailSent: false },
    });
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(await count("users")).toBe(1);
    expect(await count("consentRecords")).toBe(1);
    expect(await count("sessions")).toBe(1);

    // For `emailSent: false` the sign-up form opens check-email with this flag.
    await signInSavedParent();
    const page = renderToStaticMarkup(
      await CheckEmailPage({
        searchParams: Promise.resolve({ [NOT_SENT_FLAG]: "1" }),
      }),
    );
    expect(page).toContain("We couldn&#x27;t send the email.");
    expect(page).toContain("Your account is saved.");
    expect(page).toContain("Send it again");

    await expectNoSecretsLogged();
  });

  it("6b: a resend says it failed, and works once the service is back", async () => {
    await signUpParent(input);
    await signInSavedParent();

    expect(await resendConsentEmail()).toEqual({
      ok: false,
      error: {
        code: "SEND_FAILED",
        message:
          "We couldn't send the email. Please try again in a few minutes.",
      },
    });

    await expectNoSecretsLogged();

    sendMail.mockResolvedValue({});
    expect(await resendConsentEmail()).toEqual({ ok: true, data: null });
    // Sign-up, the failed resend and this one. The token must come from this one:
    // the failed resend's link would confirm too.
    expect(sendMail).toHaveBeenCalledTimes(3);
    const token = tokenFrom(sendMail.mock.calls[2][0].text);
    expect(await confirmConsent(token)).toMatchObject({ ok: true });
  });
});
