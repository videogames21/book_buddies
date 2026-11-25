import { expect, it } from "vitest";
import {
  CONSENT_NOTICE_VERSION,
  consentNotice,
  consentNoticeVersion,
} from "./consent-notice";

it("gives each configured window its own notice version", () => {
  expect(consentNoticeVersion(14)).toBe(`${CONSENT_NOTICE_VERSION}-14d`);
  expect(consentNoticeVersion(30)).not.toBe(consentNoticeVersion(14));
  expect(JSON.stringify(consentNotice(30))).toContain("within 30 days");
});

it("names the service providers that hold or receive data (COPPA-integral-listed)", () => {
  const text = JSON.stringify(consentNotice(14));
  for (const provider of ["Vercel", "MongoDB Atlas", "Resend"]) {
    expect(text).toContain(provider);
  }
  expect(text).not.toContain("No one outside BookBuddies");
});
