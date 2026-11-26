"use server";

import {
  signInChildAccount,
  type ChildSignInCode,
} from "@/server/identity-access/child-sign-in";
import { issueDeviceToken } from "@/server/identity-access/device-token";
import {
  endCurrentSession,
  requireChild,
  setSessionCookie,
  type ChildSessionErrorCode,
} from "@/server/identity-access/sessions";
import { fail, ok, type ActionResult } from "@/server/lib/action-result";
import { logSecurityEvent, logUnexpectedError } from "@/server/lib/log";
import {
  CHILD_SIGN_IN_PROBLEMS,
  childSignInProblem,
  childSignInSchema,
  type ChildSignInProblem,
} from "./schema";

export type SignInChildCode =
  ChildSignInCode | ChildSignInProblem | "SIGN_IN_FAILED";

/**
 * A child's sign-in (design/shlf.md, "Child signs in"). Open to anyone, so there is no
 * session check; validation, then Identity & Access (§8.2.3). The cookies are set only
 * once the session and its record have committed.
 */
export async function signInChild(
  input: unknown,
): Promise<ActionResult<null, SignInChildCode>> {
  try {
    const parsed = childSignInSchema.safeParse(input);
    if (!parsed.success) {
      const code = childSignInProblem(parsed.error);
      logSecurityEvent("sign-in-refused", code);
      return fail(code, CHILD_SIGN_IN_PROBLEMS[code]);
    }
    const result = await signInChildAccount(
      parsed.data.username,
      parsed.data.password,
    );
    if (!result.ok) {
      logSecurityEvent("sign-in-refused", result.error.code);
      return result;
    }
    // The session the old cookie named, perhaps a parent's on a shared tablet, ends
    // here rather than staying valid but out of reach.
    await endCurrentSession();
    await setSessionCookie(result.data.session);
    await issueDeviceToken(result.data.childId);
    return ok(null);
  } catch (err) {
    return fail(
      "SIGN_IN_FAILED",
      "That didn’t work. Try again or ask a grown-up.",
      logUnexpectedError("signInChild", err),
    );
  }
}

export type SignOutChildCode = ChildSessionErrorCode | "SIGN_OUT_FAILED";

/**
 * A child's sign-out (design/shlf.md, "Child signs out"): the session document and its
 * end record are deleted, not only the cookie, so the session ends on the server at once.
 */
export async function signOutChild(): Promise<
  ActionResult<null, SignOutChildCode>
> {
  try {
    const session = await requireChild();
    if (!session.ok) return session;
    await endCurrentSession();
    return ok(null);
  } catch (err) {
    return fail(
      "SIGN_OUT_FAILED",
      "That didn’t work. Try again or ask a grown-up.",
      logUnexpectedError("signOutChild", err),
    );
  }
}
