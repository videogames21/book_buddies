import { afterEach, beforeEach, expect, it, vi } from "vitest";

const sendMail = vi.fn();
const createTransport = vi.fn(() => ({ sendMail }));
vi.mock("nodemailer", () => ({ default: { createTransport } }));

const message = {
  to: "invented-parent@example.test",
  subject: "Subject",
  text: "Body",
};

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("AUTH_SECRET", "invented-email-test-secret");
  vi.stubEnv("MONGODB_URI", "mongodb://127.0.0.1:27017");
  sendMail.mockReset().mockResolvedValue({});
  createTransport.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

it("refuses in production with no SMTP_URL, without trying to send", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("MAIL_FROM", "BookBuddies <no-reply@example.test>");
  vi.spyOn(console, "error").mockImplementation(() => {});
  const { sendEmail } = await import("./email");
  expect(await sendEmail(message)).toEqual({ ok: false });
  expect(createTransport).not.toHaveBeenCalled();
});

it("sends through the configured SMTP_URL", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("SMTP_URL", "smtps://resend:key@smtp.example.test:465");
  vi.stubEnv("MAIL_FROM", "BookBuddies <no-reply@example.test>");
  const { sendEmail } = await import("./email");
  expect(await sendEmail(message)).toEqual({ ok: true });
  expect(createTransport).toHaveBeenCalledWith({
    url: "smtps://resend:key@smtp.example.test:465",
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 10_000,
  });
  expect(sendMail).toHaveBeenCalledWith({
    from: "BookBuddies <no-reply@example.test>",
    ...message,
  });
});

it("uses Mailpit outside production", async () => {
  vi.stubEnv("NODE_ENV", "development");
  const { sendEmail } = await import("./email");
  await sendEmail(message);
  expect(createTransport).toHaveBeenCalledWith(
    expect.objectContaining({ url: "smtp://localhost:1025" }),
  );
});

it("answers ok false when the SMTP server times out", async () => {
  vi.stubEnv("NODE_ENV", "development");
  sendMail.mockRejectedValue(
    Object.assign(new Error("Timeout"), { code: "ETIMEDOUT" }),
  );
  vi.spyOn(console, "error").mockImplementation(() => {});
  const { sendEmail } = await import("./email");
  expect(await sendEmail(message)).toEqual({ ok: false });
});

it("answers ok false on a transport failure and logs neither the address nor the body", async () => {
  vi.stubEnv("NODE_ENV", "development");
  sendMail.mockRejectedValue(
    new Error("550 rejected invented-parent@example.test"),
  );
  const logged = vi.spyOn(console, "error").mockImplementation(() => {});
  const { sendEmail } = await import("./email");
  expect(await sendEmail(message)).toEqual({ ok: false });
  const output = logged.mock.calls.flat().join(" ");
  expect(output).not.toContain("invented-parent@example.test");
  expect(output).not.toContain("Body");
});
