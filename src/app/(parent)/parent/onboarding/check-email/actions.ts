"use server";

import {
  resendConsentEmailFor,
  type ResendCode,
} from "@/server/accounts-family/families";
import {
  requireParent,
  type SessionErrorCode,
} from "@/server/identity-access/sessions";
import { fail, type ActionResult } from "@/server/lib/action-result";
import { logUnexpectedError } from "@/server/lib/log";

export type ResendConsentCode =
  ResendCode | SessionErrorCode | "NOT_MAIN_PARENT" | "RESEND_FAILED";

/**
 * UC-PAR-onboarding 6b. A signed-in Main Parent only (§8.1); there is no input, and the
 * family comes from the session.
 */
export async function resendConsentEmail(): Promise<
  ActionResult<null, ResendConsentCode>
> {
  try {
    const session = await requireParent();
    if (!session.ok) return session;
    if (session.data.parentRole !== "main") {
      return fail(
        "NOT_MAIN_PARENT",
        "Only the family's Main Parent can confirm consent.",
      );
    }
    return await resendConsentEmailFor(session.data);
  } catch (err) {
    return fail(
      "RESEND_FAILED",
      "We couldn't send the email. Please try again.",
      logUnexpectedError("resendConsentEmail", err),
    );
  }
}
