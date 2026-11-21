import "server-only";
import { randomBytes } from "node:crypto";
import { fail, ok, type ActionResult } from "@/server/lib/action-result";
import { findParentByEmail } from "./parent-accounts";
import { hashPassword, verifyPassword } from "./passwords";
import { createDatabaseSession, type NewSession } from "./sessions";
import { claimSignInAttempt, clearSignInAttempts } from "./sign-in-throttle";

// A Main Parent's sign-in (OI-44, design/par.md, Supporting flows). It knows nothing
// about onboarding: the gate on /parent decides where the parent goes next.

export type SignInCode = "INVALID_CREDENTIALS" | "TOO_MANY_ATTEMPTS";

// Checked when no usable account exists, so an unknown email takes as long as a wrong
// password and the response time does not reveal which emails have accounts.
let decoyHash: Promise<string> | undefined;
const getDecoyHash = () =>
  (decoyHash ??= hashPassword(randomBytes(32).toString("hex")));

function waitMessage(seconds: number): string {
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
  const claim = await claimSignInAttempt(email);
  if (!claim.allowed) {
    return fail("TOO_MANY_ATTEMPTS", waitMessage(claim.waitSeconds));
  }

  const parent = await findParentByEmail(email);
  const matches = await verifyPassword(
    password,
    parent?.passwordHash ?? (await getDecoyHash()),
  );
  // Sub Parent sign-in comes with UC-PAR-create-sub-parent-account.
  if (!parent || parent.parentRole !== "main" || !matches) {
    return fail("INVALID_CREDENTIALS", "That email or password is incorrect.");
  }

  await clearSignInAttempts(email);
  return ok(await createDatabaseSession(parent.userId));
}
