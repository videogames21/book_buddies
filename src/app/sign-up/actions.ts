"use server";

import {
  createFamily,
  type SignUpErrorCode,
} from "@/server/accounts-family/families";
import { fail, type ActionResult } from "@/server/lib/action-result";
import { logUnexpectedError } from "@/server/lib/log";
import {
  firstErrorOf,
  signUpSchema,
  VALIDATION_MESSAGES,
  type ValidationErrorCode,
} from "./schema";

export type SignUpParentCode =
  SignUpErrorCode | ValidationErrorCode | "INVALID_INPUT";

/**
 * UC-PAR-onboarding steps 3–5. Anyone may call it (§8.1: there is no session to check
 * yet). Validation, then Accounts & Family (§8.2.3). Returns nothing about the family
 * or the token; the session cookie is set by createFamily.
 */
export async function signUpParent(
  input: unknown,
): Promise<ActionResult<{ emailSent: boolean }, SignUpParentCode>> {
  try {
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
