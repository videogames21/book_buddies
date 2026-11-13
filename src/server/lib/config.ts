import "server-only";
import { z } from "zod";

// The validated environment (architecture §8.2.6). Read lazily, so a build
// without database variables still compiles.
const configSchema = z.object({
  AUTH_SECRET: z.string().min(1),
  PRIVACY_NOTICE_URL: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.url().optional(),
  ),
  MONGODB_URI: z.string().min(1),
  MONGODB_DB: z.string().min(1).default("bookbuddies"),
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

export function getPrivacyNoticeUrl(): string {
  const url = getConfig().PRIVACY_NOTICE_URL;
  if (url) return url;
  if (process.env.NODE_ENV === "production")
    throw new Error("PRIVACY_NOTICE_URL must be configured before release");
  return "/privacy-notice";
}
