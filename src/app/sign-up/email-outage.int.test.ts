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

let logged: string[];

beforeEach(async () => {
  await resetDatabase();
  mockedAuth.mockReset();
  mockedAuth.mockResolvedValue(null);
  sendMail.mockReset().mockRejectedValue(timeout);
  logged = [];
  vi.spyOn(console, "error").mockImplementation((line) => {
    logged.push(String(line));
  });
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

    const log = logged.join("\n");
    expect(log).toContain("errorId");
    expect(log).not.toContain(input.email);
    expect(log).not.toContain(input.password);
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

    sendMail.mockResolvedValue({});
    expect(await resendConsentEmail()).toEqual({ ok: true, data: null });
    const text = sendMail.mock.lastCall?.[0].text ?? "";
    const token = /#token=([A-Za-z0-9_-]+)/.exec(text)?.[1];
    expect(await confirmConsent(token)).toMatchObject({ ok: true });
  });
});
