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
