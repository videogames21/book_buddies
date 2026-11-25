import "server-only";

// The direct notice shown at sign-up (UC-PAR-onboarding step 2) and restated in the
// confirmation email (step 5). TEAM- AND LAWYER-EDITABLE: placeholder wording until
// legal review (OI-20, OI-21). It holds every element BR-coppa-notice lists. Changing
// any text below means raising CONSENT_NOTICE_VERSION. Each Consent Record stores
// consentNoticeVersion(days), so it always points at the exact text the parent saw,
// including the configured window.

export const CONSENT_NOTICE_VERSION = "2026-11-23-placeholder";

export type ConsentNoticeSection = { heading: string; paragraphs: string[] };

export function consentNoticeVersion(confirmationDays: number): string {
  return `${CONSENT_NOTICE_VERSION}-${String(confirmationDays)}d`;
}

/** `confirmationDays` is the configured window (OI-22), stated in the notice. */
export function consentNotice(
  confirmationDays: number,
): ConsentNoticeSection[] {
  return [
    {
      heading: "Your consent is needed first",
      paragraphs: [
        "BookBuddies needs your permission, as the parent, before it collects anything about your child. Nothing is collected from or about your child until you give consent and confirm it from the email we send you.",
      ],
    },
    {
      heading: "What we collect about your child, and why",
      paragraphs: [
        "A nickname and a picture character you choose, so your child sees a friendly name instead of a real one. We never ask for your child's real name.",
        "Your child's age and grade, and a reading level if you know it, so we can suggest books that fit.",
        "A short note from you about your child's reading, if you choose to write one, to help with suggestions. Notes are checked for words that may mean a child needs help, and a flagged note is reviewed by a person.",
        "A username you choose and a password we create, so your child can sign in.",
        "What your child does in the app: books on the shelf, reactions and ratings, so suggestions improve over time.",
      ],
    },
    {
      heading: "Who receives it",
      paragraphs: [
        "We do not sell your child's information, use it for advertising or use it to train AI, and no third party receives it for its own purposes. Because nothing is shared that way, there is no separate sharing permission to give.",
        "Two service providers hold it only to run BookBuddies for us: Vercel hosts the app and MongoDB Atlas stores the data.",
        "Our email provider, Resend, receives only your name and email address, to send you account emails. It never receives your child's information.",
      ],
    },
    {
      heading: "How to give consent",
      paragraphs: [
        "Tick the box below and create your account. We will email you a link; open it and press Confirm to finish giving consent.",
        `If you do not confirm within ${String(confirmationDays)} days, we delete your name, email address and the unconfirmed account.`,
      ],
    },
    {
      heading: "Changing your mind",
      paragraphs: [
        "You can review your child's information, stop further collection, withdraw consent or have your child's information deleted at any time from your account settings.",
      ],
    },
  ];
}
