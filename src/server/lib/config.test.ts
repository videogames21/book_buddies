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
