"use server";

import { setSessionCookie } from "@/server/identity-access/sessions";
import {
  signInMainParent,
  type SignInCode,
} from "@/server/identity-access/sign-in";
import { fail, ok, type ActionResult } from "@/server/lib/action-result";
import { logSecurityEvent, logUnexpectedError } from "@/server/lib/log";
import { signInSchema } from "./schema";

export type SignInParentCode = SignInCode | "SIGN_IN_FAILED";

/**
 * A Main Parent's sign-in (OI-44). Open to anyone, so there is no session check;
 * validation, then Identity & Access (§8.2.3). A malformed email or password gets the
 * same answer as a wrong one.
 */
export async function signInParent(
  input: unknown,
): Promise<ActionResult<null, SignInParentCode>> {
  try {
    const parsed = signInSchema.safeParse(input);
    if (!parsed.success) {
      logSecurityEvent("sign-in-refused", "INVALID_CREDENTIALS");
      return fail(
        "INVALID_CREDENTIALS",
        "That email or password is incorrect.",
      );
    }
    const result = await signInMainParent(
      parsed.data.email,
      parsed.data.password,
    );
    if (!result.ok) {
      logSecurityEvent("sign-in-refused", result.error.code);
      return result;
    }
    await setSessionCookie(result.data);
    return ok(null);
  } catch (err) {
    return fail(
      "SIGN_IN_FAILED",
      "We couldn't sign you in. Please try again.",
      logUnexpectedError("signInParent", err),
    );
  }
}
