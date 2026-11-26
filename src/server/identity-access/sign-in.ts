import "server-only";
import { fail, ok, type ActionResult } from "@/server/lib/action-result";
import { findAdminByEmail, findParentByEmail } from "./parent-accounts";
import { verifyPassword } from "./passwords";
import { createDatabaseSession, type NewSession } from "./sessions";
import { checkPasswordAttempt } from "./sign-in-throttle";

// A Main Parent's or an admin's sign-in (OI-44, design/par.md, Supporting flows). It knows nothing
// about onboarding: the gate on /parent decides where the parent goes next.

export type SignInCode = "INVALID_CREDENTIALS" | "TOO_MANY_ATTEMPTS";

// Checked when no usable account exists, so an unknown email takes as long as a wrong
// password and the response time does not reveal which emails have accounts. It is a
// fixed hash of a discarded random password, so it cannot fail or add work on a cold
// start. Raise it with the cost in passwords.ts; sign-in's tests compare the two.
const DECOY_HASH =
  "scrypt$131072$8$1$ASF4qnLVVD7atYpYJEuqrg==$qlkASV3hwmIhSA4/KhIZNxlILS69qMropx/FchDk4LL2++uZRhHATluhGXsaQVYcGUl6AkayphRjPPJ9EnVksw==";

/** The TOO_MANY_ATTEMPTS message, shared by every password entry point. */
export function waitMessage(seconds: number): string {
  const [amount, unit] =
    seconds < 60 ? [seconds, "second"] : [Math.ceil(seconds / 60), "minute"];
  const plural = amount === 1 ? "" : "s";
  return `Too many attempts. Try again in ${String(amount)} ${unit}${plural}.`;
}

/** `email` must already be trimmed and lowercased: it is the throttle's account key. */
export async function signInMainParent(
  email: string,
  password: string,
): Promise<ActionResult<NewSession, SignInCode>> {
  // Set by the check; an object, because a closure's assignment is not narrowed.
  const signedIn: { userId?: string } = {};
  const attempt = await checkPasswordAttempt(email, async () => {
    const parent = await findParentByEmail(email);
    // TEMPORARY (OI-61): off unless the demo or e2e server sets the flag, so the rig
    // cannot reach a live environment.
    const admin =
      parent || process.env.ALLOW_ADMIN_PARENT_SIGNIN !== "1"
        ? null
        : await findAdminByEmail(email);
    const account = parent ?? admin;
    const matches = await verifyPassword(
      password,
      account?.passwordHash ?? DECOY_HASH,
    );
    // Sub Parent sign-in comes with UC-PAR-create-sub-parent-account.
    if (!account || (parent && parent.parentRole !== "main") || !matches) {
      return false;
    }
    signedIn.userId = account.userId;
    return true;
  });
  if (attempt.outcome === "wait") {
    return fail("TOO_MANY_ATTEMPTS", waitMessage(attempt.waitSeconds));
  }
  if (attempt.outcome === "refused" || !signedIn.userId) {
    return fail("INVALID_CREDENTIALS", "That email or password is incorrect.");
  }
  return ok(await createDatabaseSession(signedIn.userId));
}
