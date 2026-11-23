import "server-only";
import { getAppUrl } from "@/server/lib/config";

// Shared by auth.ts (which reads sessions) and sessions.ts (which writes them).

/** Auth.js's default session lifetime, stated so sessions written here match it. */
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/**
 * The session cookie Auth.js reads. Auth.js prefixes it with `__Secure-` and marks
 * it Secure on an https origin; both are fixed here from APP_URL so the cookie that
 * sessions.ts sets is always the one Auth.js looks for (§8.1).
 */
export function sessionCookie(): { name: string; secure: boolean } {
  return sessionCookieFor(getAppUrl());
}

export function sessionCookieFor(appUrl: string): {
  name: string;
  secure: boolean;
} {
  const secure = appUrl.startsWith("https://");
  return {
    name: `${secure ? "__Secure-" : ""}next-auth.session-token`,
    secure,
  };
}
