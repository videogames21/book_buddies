import "server-only";
import { fail, ok } from "@/server/lib/action-result";
import { logSecurityEvent } from "@/server/lib/log";
import {
  getParentCredential,
  getSubParentReauthCredential,
} from "./parent-accounts";
import { verifyPassword } from "./passwords";
import type { ParentSession } from "./sessions";
import { waitMessage } from "./sign-in";
import { checkPasswordAttempt } from "./sign-in-throttle";

export async function verifyParentPassword(
  parent: ParentSession,
  password: string,
) {
  const main =
    parent.parentRole === "main"
      ? await getParentCredential(parent.userId, parent.familyId)
      : null;
  const credential =
    parent.parentRole === "main"
      ? main && { key: main.email, passwordHash: main.passwordHash }
      : await getSubParentReauthCredential(parent.userId, parent.familyId);
  if (!credential) {
    logSecurityEvent("reauth-refused", "REAUTH_UNAVAILABLE");
    return fail(
      "REAUTH_UNAVAILABLE",
      "Password confirmation isn't available for this account.",
    );
  }
  const attempt = await checkPasswordAttempt(credential.key, () =>
    verifyPassword(password, credential.passwordHash),
  );
  if (attempt.outcome === "wait") {
    logSecurityEvent("reauth-refused", "TOO_MANY_ATTEMPTS");
    return fail("TOO_MANY_ATTEMPTS", waitMessage(attempt.waitSeconds));
  }
  if (attempt.outcome === "refused") {
    logSecurityEvent("reauth-refused", "PASSWORD_INCORRECT");
    return fail("PASSWORD_INCORRECT", "That password is incorrect.");
  }
  return ok(null);
}
