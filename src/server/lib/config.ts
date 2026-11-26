import "server-only";
import { z } from "zod";

// The validated environment (architecture §8.2.6). Read lazily, so a build
// without database variables still compiles.
// A blank line in .env counts as unset, so a default or "optional" still applies.
const blankAsUnset = <Schema extends z.ZodType>(schema: Schema) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema);

const optionalString = (schema: z.ZodType<string>) =>
  blankAsUnset(schema.optional());

function isTimeZone(name: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: name });
    return true;
  } catch {
    return false;
  }
}

const configSchema = z.object({
  AUTH_SECRET: z.string().min(1),
  PRIVACY_NOTICE_URL: optionalString(z.url()),
  MONGODB_URI: z.string().min(1),
  MONGODB_DB: blankAsUnset(z.string().min(1).default("bookbuddies")),
  // UC-PAR-onboarding. The base URL the emailed links are built on.
  APP_URL: optionalString(z.url()),
  // Mailpit outside production; Resend's SMTP interface in production (design/par.md).
  SMTP_URL: optionalString(z.string().regex(/^smtps?:\/\//)),
  MAIL_FROM: optionalString(z.string().min(3)),
  // The Scheduled Cleanup route refuses every request while this is unset (§8.1).
  CRON_SECRET: optionalString(z.string().min(32)),
  // Placeholder 14 days until legal review (OI-22); counted from the acknowledgment.
  CONSENT_CONFIRMATION_DAYS: blankAsUnset(
    z.coerce.number().int().min(1).max(90).default(14),
  ),
  // The only accepted method for V1 (OI-21, client answers 2026-10-28, Q13).
  CONSENT_METHOD: blankAsUnset(z.enum(["email-plus"]).default("email-plus")),
  // UC-PAR-suggest-book release gate (README, "Review and release dependencies").
  // Off unless set to "1"; only the demo and e2e servers, which hold invented data, set it.
  PARENT_SUGGESTIONS_ENABLED: blankAsUnset(z.enum(["0", "1"]).default("0")),
  // UC-REC-parent-review 2a: how long a batch waits for the parent before it is released
  // unchanged. 24 hours, provisional (OI-69). The quiz's insert adds it to `createdAt`
  // once and stores the result as the batch's `handoffDeadline`.
  BATCH_REVIEW_WINDOW_HOURS: blankAsUnset(
    z.coerce.number().int().min(1).max(168).default(24),
  ),
  // Child sessions (design/shlf.md, Data model). How often an open child page sends
  // its keep-alive.
  CHILD_KEEPALIVE_SECONDS: blankAsUnset(
    z.coerce.number().int().min(5).max(300).default(30),
  ),
  // How long after the last keep-alive or request a visit still counts as open once
  // midnight has passed.
  CHILD_LEAVE_GRACE_SECONDS: blankAsUnset(
    z.coerce.number().int().min(60).max(3600).default(600),
  ),
  // How long a child can do nothing before being signed out (SEC-auth).
  CHILD_IDLE_MINUTES: blankAsUnset(
    z.coerce.number().int().min(1).max(240).default(30),
  ),
  // The zone "midnight" is read in (OI-48). Needed by child sign-in only.
  CHILD_SESSION_TIME_ZONE: optionalString(z.string().refine(isTimeZone)),
  // Signs the trusted-device cookie. Needed by child sign-in only.
  CHILD_DEVICE_SECRET: optionalString(z.string().min(32)),
  // How many children one browser's trusted-device cookie holds at once.
  CHILD_DEVICE_MAX_CHILDREN: blankAsUnset(
    z.coerce.number().int().min(1).max(10).default(4),
  ),
});

export type Config = z.infer<typeof configSchema>;

let cached: Config | undefined;

export function getConfig(): Config {
  if (!cached) {
    const parsed = configSchema.safeParse(process.env);
    if (!parsed.success) {
      // Names the missing variables only, never their values.
      const names = parsed.error.issues
        .map((issue) => issue.path.join("."))
        .join(", ");
      throw new Error(`Invalid environment: ${names}`);
    }
    cached = parsed.data;
  }
  return cached;
}

const isProduction = () => process.env.NODE_ENV === "production";

export function getPrivacyNoticeUrl(): string {
  const url = getConfig().PRIVACY_NOTICE_URL;
  if (url) return url;
  if (isProduction())
    throw new Error("PRIVACY_NOTICE_URL must be configured before release");
  return "/privacy-notice";
}

/** The app's own origin, with no trailing slash. Required in production. */
export function getAppUrl(): string {
  const url = getConfig().APP_URL;
  if (url) return url.replace(/\/+$/, "");
  if (isProduction()) throw new Error("APP_URL must be configured");
  return "http://localhost:3000";
}

/**
 * The SMTP connection URL, or null when production has none: email then fails
 * closed rather than going nowhere (design/par.md, Key decisions).
 */
export function getSmtpUrl(): string | null {
  const url = getConfig().SMTP_URL;
  if (url) return url;
  return isProduction() ? null : "smtp://localhost:1025";
}

/**
 * Whether parent suggestions may be used in this deployment. False for every
 * family, pilot testers included, until the README's release gate for
 * `UC-PAR-suggest-book` is lifted (`OI-70` and the inactivity purge). Never set
 * the variable in a deployment that holds real families' data.
 */
export function areParentSuggestionsEnabled(): boolean {
  return getConfig().PARENT_SUGGESTIONS_ENABLED === "1";
}

export function getMailFrom(): string {
  const from = getConfig().MAIL_FROM;
  if (from) return from;
  if (isProduction()) throw new Error("MAIL_FROM must be configured");
  return "BookBuddies <no-reply@bookbuddies.test>";
}

/**
 * The zone a child's session ends in (OI-48). No default, so child sign-in fails closed
 * when it is unset, and nothing else depends on it.
 */
export function getChildSessionTimeZone(): string {
  const zone = getConfig().CHILD_SESSION_TIME_ZONE;
  if (!zone) throw new Error("CHILD_SESSION_TIME_ZONE must be configured");
  return zone;
}

/** No default, so child sign-in fails closed when it is unset (§8.2.6). */
export function getChildDeviceSecret(): string {
  const secret = getConfig().CHILD_DEVICE_SECRET;
  if (!secret) throw new Error("CHILD_DEVICE_SECRET must be configured");
  return secret;
}
