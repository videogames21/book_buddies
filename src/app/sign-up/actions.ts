"use server";

import {
  createFamily,
  type SignUpErrorCode,
} from "@/server/accounts-family/families";
import { fail, type ActionResult } from "@/server/lib/action-result";
import { logUnexpectedError } from "@/server/lib/log";
import { mustLeaveSignUp } from "./access";
import {
  firstErrorOf,
  signUpSchema,
  VALIDATION_MESSAGES,
  type ValidationErrorCode,
} from "./schema";

export type SignUpParentCode =
  SignUpErrorCode | ValidationErrorCode | "INVALID_INPUT" | "ALREADY_SIGNED_IN";

/**
 * UC-PAR-onboarding steps 3–5. Open to visitors with no session and to a Main Parent
 * whose sign-up expired; the action checks this itself, as the page does (§8.1). Then
 * validation and Accounts & Family (§8.2.3). Returns nothing about the family or the
 * token; the session cookie is set by createFamily.
 */
export async function signUpParent(
  input: unknown,
): Promise<ActionResult<{ emailSent: boolean }, SignUpParentCode>> {
  try {
    if (await mustLeaveSignUp()) {
      return fail("ALREADY_SIGNED_IN", "You are already signed in.");
    }
    const parsed = signUpSchema.safeParse(input);
    if (!parsed.success) {
      const code = firstErrorOf(parsed.error);
      if (!code)
        return fail("INVALID_INPUT", "Check your details and try again.");
      return fail(code, VALIDATION_MESSAGES[code]);
    }
    return await createFamily(parsed.data);
  } catch (err) {
    return fail(
      "SAVE_FAILED",
      "We couldn't create your account. Please try again.",
      logUnexpectedError("signUpParent", err),
    );
  }
}
