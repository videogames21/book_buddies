import "server-only";
import { z } from "zod";

// The validated environment (architecture §8.2.6). Read lazily, so a build
// without database variables still compiles.
const optionalString = (schema: z.ZodType<string>) =>
  z.preprocess(
    (value) => (value === "" ? undefined : value),
    schema.optional(),
  );

const configSchema = z.object({
  AUTH_SECRET: z.string().min(1),
  PRIVACY_NOTICE_URL: optionalString(z.url()),
  MONGODB_URI: z.string().min(1),
  MONGODB_DB: z.string().min(1).default("bookbuddies"),
  // UC-PAR-onboarding. The base URL the emailed links are built on.
  APP_URL: optionalString(z.url()),
  // Mailpit outside production; Resend's SMTP interface in production (design/par.md).
  SMTP_URL: optionalString(z.string().regex(/^smtps?:\/\//)),
  MAIL_FROM: optionalString(z.string().min(3)),
  // The Scheduled Cleanup route refuses every request while this is unset (§8.1).
  CRON_SECRET: optionalString(z.string().min(32)),
  // Placeholder 14 days until legal review (OI-22); counted from the acknowledgment.
  CONSENT_CONFIRMATION_DAYS: z.coerce.number().int().min(1).max(90).default(14),
  // The only accepted method for V1 (OI-21, client answers 2026-10-28, Q13).
  CONSENT_METHOD: z.enum(["email-plus"]).default("email-plus"),
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

export function getMailFrom(): string {
  const from = getConfig().MAIL_FROM;
  if (from) return from;
  if (isProduction()) throw new Error("MAIL_FROM must be configured");
  return "BookBuddies <no-reply@bookbuddies.test>";
}
