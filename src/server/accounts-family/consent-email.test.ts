import { beforeEach, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("AUTH_SECRET", "invented-email-test-secret");
  vi.stubEnv("MONGODB_URI", "mongodb://127.0.0.1:27017");
  vi.stubEnv("APP_URL", "https://bookbuddies.example.test");
  vi.stubEnv("PRIVACY_NOTICE_URL", "");
});

const email = async () => {
  const { buildConsentEmail } = await import("./consent-email");
  const { consentNotice } = await import("./consent-notice");
  return buildConsentEmail({
    token: "invented-token_123",
    confirmBy: new Date("2026-12-04T12:00:00Z"),
    noticeVersion: "v-test",
    notice: consentNotice(14),
  });
};

it("holds the link with the token in the fragment, the version, the deadline and how to revoke", async () => {
  const { text, subject } = await email();
  expect(subject).toMatch(/confirm/i);
  expect(text).toContain(
    "https://bookbuddies.example.test/consent/confirm#token=invented-token_123",
  );
  // Never in a query string, which reaches request logs (§8.2.7).
  expect(text).not.toMatch(/\?token=/);
  expect(text).toContain("consent notice version v-test");
  expect(text).toContain("December 4, 2026");
  expect(text).toMatch(/withdraw consent/i);
  expect(text).toMatch(/account settings/i);
  // What was consented to is restated (CI-email-parent).
  expect(text).toContain("What we collect about your child, and why");
});

it("links the online privacy notice as a full URL (BR-coppa-notice)", async () => {
  const { text } = await email();
  expect(text).toContain("https://bookbuddies.example.test/privacy-notice");
});

it("uses a configured privacy notice URL as it is", async () => {
  vi.stubEnv("PRIVACY_NOTICE_URL", "https://notice.example.test/children");
  const { text } = await email();
  expect(text).toContain("https://notice.example.test/children");
});

it("holds no child data", async () => {
  const { text } = await email();
  // No child exists yet; the notice describes categories, never values.
  expect(text).not.toMatch(/nickname:|username:|age:|grade:/i);
});
