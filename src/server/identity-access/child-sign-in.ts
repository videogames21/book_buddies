import "server-only";
import { createHash } from "node:crypto";
import {
  childMaySignIn,
  lockChildForWrite,
} from "@/server/accounts-family/child-accounts";
import { fail, ok, type ActionResult } from "@/server/lib/action-result";
import { now } from "@/server/lib/clock";
import {
  getChildDeviceSecret,
  getChildSessionTimeZone,
} from "@/server/lib/config";
import { withTransaction } from "@/server/lib/db";
import { findChildCredential } from "./child-credentials";
import { recordChildSignIn } from "./child-sign-ins";
import { readTrustedDevice } from "./device-token";
import { nextMidnight } from "./next-midnight";
import { verifyPassword } from "./passwords";
import { createDatabaseSession, type NewSession } from "./sessions";
import { DECOY_HASH } from "./sign-in";
import { CHILD_THROTTLE, checkPasswordAttempt } from "./sign-in-throttle";

// A child's sign-in (design/shlf.md, "Child signs in"; OI-46). Nothing here is logged:
// the username, password and session token never leave in a message either (§8.2.7).

export type ChildSignInCode =
  "INVALID_CREDENTIALS" | "TOO_MANY_ATTEMPTS" | "ACCOUNT_UNAVAILABLE";

export type SignedInChild = { session: NewSession; childId: string };

const MESSAGES: Record<ChildSignInCode, string> = {
  INVALID_CREDENTIALS:
    "That username or password isn’t right. Try again, or ask a grown-up.",
  // No number of seconds, and never a lock.
  TOO_MANY_ATTEMPTS: "Let’s wait a little while, then try again.",
  ACCOUNT_UNAVAILABLE: "Ask a grown-up to help you sign in.",
};

const refuse = (code: ChildSignInCode) => fail(code, MESSAGES[code]);

/**
 * A browser the child has signed in on keeps its own count; every other caller shares
 * the account's, so dropping the cookie never earns a fresh one. Only a hash of the
 * device ID is stored.
 */
function throttleKey(username: string, deviceId: string | null): string {
  const device = deviceId
    ? `dev:${createHash("sha256").update(deviceId).digest("hex")}`
    : "shared";
  return `child:${username}:${device}`;
}

/**
 * `username` and `password` must already be trimmed and lowercased. The caller sets the
 * cookies once this has committed.
 */
export async function signInChildAccount(
  username: string,
  password: string,
): Promise<ActionResult<SignedInChild, ChildSignInCode>> {
  // Both throw when sign-in is not configured, before anything is counted or written.
  const timeZone = getChildSessionTimeZone();
  getChildDeviceSecret();

  const credential = await findChildCredential(username);
  const deviceId = credential
    ? await readTrustedDevice(credential.childId)
    : null;
  const attempt = await checkPasswordAttempt(
    throttleKey(username, deviceId),
    async () => {
      // An unknown username does the same work as a wrong password.
      const matches = await verifyPassword(
        password,
        credential?.passwordHash ?? DECOY_HASH,
      );
      return credential !== null && matches;
    },
    CHILD_THROTTLE,
  );
  if (attempt.outcome === "wait") return refuse("TOO_MANY_ATTEMPTS");
  if (attempt.outcome === "refused" || !credential) {
    return refuse("INVALID_CREDENTIALS");
  }
  // Only after a correct password, so it tells a guesser nothing.
  const { userId, childId } = credential;
  if (!(await childMaySignIn(childId))) return refuse("ACCOUNT_UNAVAILABLE");

  // The session and its usage record together or not at all (§8.2.8).
  const session = await withTransaction(async (tx) => {
    // Conflicts with a deletion of the child, which then leaves nothing behind.
    if (!(await lockChildForWrite(tx, childId))) return null;
    const created = await createDatabaseSession(
      userId,
      tx,
      nextMidnight(now(), timeZone),
    );
    await recordChildSignIn(tx, childId);
    return created;
  });
  if (!session) return refuse("INVALID_CREDENTIALS");
  return ok({ session, childId });
}
