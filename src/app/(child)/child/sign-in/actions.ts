"use server";

import {
  endCurrentSession,
  requireChild,
  type ChildSessionErrorCode,
} from "@/server/identity-access/sessions";
import { fail, ok, type ActionResult } from "@/server/lib/action-result";
import { logUnexpectedError } from "@/server/lib/log";

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
