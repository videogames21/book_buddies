import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

it("reports a missing Auth.js secret without exposing environment values", async () => {
  vi.resetModules();
  vi.stubEnv("AUTH_SECRET", undefined);
  vi.stubEnv("MONGODB_URI", "mongodb://private-config-fixture");
  const { getConfig } = await import("./config");
  expect(() => getConfig()).toThrow("Invalid environment: AUTH_SECRET");
  try {
    getConfig();
  } catch (error) {
    expect(String(error)).not.toContain("private-config-fixture");
  }
});

it("accepts the empty optional privacy URL from .env.example during development", async () => {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("AUTH_SECRET", "invented-config-test-secret");
  vi.stubEnv("MONGODB_URI", "mongodb://127.0.0.1:27017");
  vi.stubEnv("PRIVACY_NOTICE_URL", "");
  const { getPrivacyNoticeUrl } = await import("./config");
  expect(getPrivacyNoticeUrl()).toBe("/privacy-notice");
});

it("defaults the onboarding settings outside production (OI-21, OI-22)", async () => {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("AUTH_SECRET", "invented-config-test-secret");
  vi.stubEnv("MONGODB_URI", "mongodb://127.0.0.1:27017");
  const config = await import("./config");
  expect(config.getConfig()).toMatchObject({
    CONSENT_CONFIRMATION_DAYS: 14,
    CONSENT_METHOD: "email-plus",
  });
  expect(config.getAppUrl()).toBe("http://localhost:3000");
  expect(config.getSmtpUrl()).toBe("smtp://localhost:1025");
});

it("reads the consent window from the environment, so legal review needs no code change", async () => {
  vi.resetModules();
  vi.stubEnv("AUTH_SECRET", "invented-config-test-secret");
  vi.stubEnv("MONGODB_URI", "mongodb://127.0.0.1:27017");
  vi.stubEnv("CONSENT_CONFIRMATION_DAYS", "30");
  const { getConfig } = await import("./config");
  expect(getConfig().CONSENT_CONFIRMATION_DAYS).toBe(30);
});

it("accepts a 90-day consent window and refuses 91", async () => {
  vi.stubEnv("AUTH_SECRET", "invented-config-test-secret");
  vi.stubEnv("MONGODB_URI", "mongodb://127.0.0.1:27017");
  vi.stubEnv("CONSENT_CONFIRMATION_DAYS", "90");
  const accepted = await import("./config");
  expect(accepted.getConfig().CONSENT_CONFIRMATION_DAYS).toBe(90);

  vi.resetModules();
  vi.stubEnv("CONSENT_CONFIRMATION_DAYS", "91");
  const refused = await import("./config");
  expect(() => refused.getConfig()).toThrow(
    "Invalid environment: CONSENT_CONFIRMATION_DAYS",
  );
});

it("treats blank settings that have defaults as unset", async () => {
  vi.resetModules();
  vi.stubEnv("AUTH_SECRET", "invented-config-test-secret");
  vi.stubEnv("MONGODB_URI", "mongodb://127.0.0.1:27017");
  vi.stubEnv("MONGODB_DB", "");
  vi.stubEnv("CONSENT_CONFIRMATION_DAYS", "");
  vi.stubEnv("CONSENT_METHOD", "");
  vi.stubEnv("CHILD_KEEPALIVE_SECONDS", "");
  vi.stubEnv("CHILD_LEAVE_GRACE_SECONDS", "");
  vi.stubEnv("CHILD_IDLE_MINUTES", "");
  const { getConfig } = await import("./config");
  expect(getConfig()).toMatchObject({
    MONGODB_DB: "bookbuddies",
    CONSENT_CONFIRMATION_DAYS: 14,
    CONSENT_METHOD: "email-plus",
    CHILD_KEEPALIVE_SECONDS: 30,
    CHILD_LEAVE_GRACE_SECONDS: 600,
    CHILD_IDLE_MINUTES: 30,
  });
});

it("still refuses a blank required setting", async () => {
  vi.resetModules();
  vi.stubEnv("AUTH_SECRET", "");
  vi.stubEnv("MONGODB_URI", "mongodb://127.0.0.1:27017");
  const { getConfig } = await import("./config");
  expect(() => getConfig()).toThrow("Invalid environment: AUTH_SECRET");
});

it("fails closed in production when email and the app URL are not configured", async () => {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("AUTH_SECRET", "invented-config-test-secret");
  vi.stubEnv("MONGODB_URI", "mongodb://127.0.0.1:27017");
  const config = await import("./config");
  expect(config.getSmtpUrl()).toBeNull();
  expect(() => config.getAppUrl()).toThrow("APP_URL must be configured");
  expect(() => config.getMailFrom()).toThrow("MAIL_FROM must be configured");
});

it.each([
  ["CHILD_KEEPALIVE_SECONDS", 5, 300],
  ["CHILD_LEAVE_GRACE_SECONDS", 60, 3600],
  ["CHILD_IDLE_MINUTES", 1, 240],
] as const)("accepts %s from %i to %i only", async (name, lowest, highest) => {
  vi.stubEnv("AUTH_SECRET", "invented-config-test-secret");
  vi.stubEnv("MONGODB_URI", "mongodb://127.0.0.1:27017");
  const read = async (value: number) => {
    vi.resetModules();
    vi.stubEnv(name, String(value));
    const { getConfig } = await import("./config");
    return () => getConfig()[name];
  };
  for (const value of [lowest, highest]) {
    expect((await read(value))()).toBe(value);
  }
  for (const value of [lowest - 1, highest + 1]) {
    expect(await read(value)).toThrow(`Invalid environment: ${name}`);
  }
});

it("defaults the child session times", async () => {
  vi.resetModules();
  vi.stubEnv("AUTH_SECRET", "invented-config-test-secret");
  vi.stubEnv("MONGODB_URI", "mongodb://127.0.0.1:27017");
  const config = await import("./config");
  expect(config.getConfig()).toMatchObject({
    CHILD_KEEPALIVE_SECONDS: 30,
    CHILD_LEAVE_GRACE_SECONDS: 600,
    CHILD_IDLE_MINUTES: 30,
  });
});

it("defaults the batch review window to 24 hours and accepts 1 to 168 (OI-69)", async () => {
  vi.stubEnv("AUTH_SECRET", "invented-config-test-secret");
  vi.stubEnv("MONGODB_URI", "mongodb://127.0.0.1:27017");
  const defaulted = await import("./config");
  expect(defaulted.getConfig().BATCH_REVIEW_WINDOW_HOURS).toBe(24);

  for (const [value, expected] of [
    ["1", 1],
    ["168", 168],
  ] as const) {
    vi.resetModules();
    vi.stubEnv("BATCH_REVIEW_WINDOW_HOURS", value);
    const accepted = await import("./config");
    expect(accepted.getConfig().BATCH_REVIEW_WINDOW_HOURS).toBe(expected);
  }

  for (const value of ["0", "169", "1.5"]) {
    vi.resetModules();
    vi.stubEnv("BATCH_REVIEW_WINDOW_HOURS", value);
    const refused = await import("./config");
    expect(() => refused.getConfig()).toThrow(
      "Invalid environment: BATCH_REVIEW_WINDOW_HOURS",
    );
  }
});
