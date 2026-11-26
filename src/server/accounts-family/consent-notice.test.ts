import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import {
  CONSENT_NOTICE_VERSION,
  consentNotice,
  consentNoticeForVersion,
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

it("keeps the published placeholder template under its original version", () => {
  const notice = consentNoticeForVersion("2026-11-23-placeholder-14d");
  expect(
    createHash("sha256").update(JSON.stringify(notice)).digest("hex"),
  ).toBe("bbcb3e90708e3023cdb6b9f0001c0608c0b8465e454993da09e2d34e38df897a");
});

it("names suggested books and their notes as shown to the child (UC-PAR-suggest-book, COPPA-direct-notice)", () => {
  expect(CONSENT_NOTICE_VERSION).toBe("2026-11-25-placeholder");
  const collected = consentNotice(14).find(
    (section) =>
      section.heading === "What we collect about your child, and why",
  );
  const item = collected?.paragraphs.find((p) =>
    p.startsWith("Books you suggest"),
  );
  expect(item).toContain("short note");
  expect(item).toContain('"From your grown-up"');
  expect(item).toContain("not checked or read by BookBuddies staff");
  // The earlier version is still the text those parents saw, without the new item.
  expect(
    JSON.stringify(consentNoticeForVersion("2026-11-23-placeholder-14d")),
  ).not.toContain("Books you suggest");
});
