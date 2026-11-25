import "server-only";
import { getAppUrl, getConfig, getPrivacyNoticeUrl } from "@/server/lib/config";
import { consentNotice } from "./consent-notice";

// The confirmation email (UC-PAR-onboarding step 5, CI-email-parent). It restates what
// was consented to, names the notice version, links the online privacy notice
// (BR-coppa-notice), says how to revoke, gives the link and the date it stops working,
// and holds no child data (no child exists yet).

export const CONFIRM_CONSENT_PATH = "/consent/confirm";

/** The token rides in the fragment, which browsers never send to the server (§8.2.7). */
export function confirmationLink(token: string): string {
  return `${getAppUrl()}${CONFIRM_CONSENT_PATH}#token=${encodeURIComponent(token)}`;
}

export function buildConsentEmail(input: {
  token: string;
  confirmBy: Date;
  noticeVersion: string;
}): { subject: string; text: string } {
  const deadline = input.confirmBy.toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "long",
    timeZone: "UTC",
  });
  const notice = consentNotice(getConfig().CONSENT_CONFIRMATION_DAYS)
    .map(
      (section) =>
        `${section.heading}\n${section.paragraphs.map((p) => `- ${p}`).join("\n")}`,
    )
    .join("\n\n");
  // In development the notice URL is a path, which an email cannot link to alone.
  const privacyNotice = new URL(getPrivacyNoticeUrl(), `${getAppUrl()}/`).href;

  const text = [
    "Thank you for creating a BookBuddies account.",
    "",
    "To finish giving consent, open this link and press Confirm:",
    confirmationLink(input.token),
    "",
    `The link stops working on ${deadline}. If you do not confirm by then, we delete your name, email address and the unconfirmed account.`,
    "",
    `What you agreed to (consent notice version ${input.noticeVersion}):`,
    "",
    notice,
    "",
    `Our online privacy notice: ${privacyNotice}`,
    "",
    "How to withdraw consent: at any time, from your account settings in BookBuddies.",
    "",
    "If you did not create this account, ignore this email and it will be deleted.",
  ].join("\n");

  return { subject: "Confirm your BookBuddies consent", text };
}
