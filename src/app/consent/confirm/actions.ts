"use server";

import { z } from "zod";
import {
  NEW_CHILD_PATH,
  SIGN_IN_PATH,
} from "@/app/(parent)/parent/onboarding/paths";
import {
  confirmConsentByToken,
  type ConfirmConsentCode,
} from "@/server/accounts-family/families";
import { requireParent } from "@/server/identity-access/sessions";
import { fail, ok, type ActionResult } from "@/server/lib/action-result";
import { logUnexpectedError } from "@/server/lib/log";

const tokenSchema = z.string().min(1).max(128);

export type ConfirmConsentResultCode = ConfirmConsentCode | "CONFIRM_FAILED";

/**
 * UC-PAR-onboarding step 7. Anyone holding the link may call it, with no session: a
 * parent often opens the email on another device (design/par.md, Key decisions). The
 * family comes from the token, and a session only decides where the parent goes next.
 */
export async function confirmConsent(
  input: unknown,
): Promise<ActionResult<{ next: string }, ConfirmConsentResultCode>> {
  try {
    const token = tokenSchema.safeParse(input);
    if (!token.success) {
      return fail("LINK_INVALID", "This link no longer works.");
    }
    const result = await confirmConsentByToken(token.data);
    if (!result.ok) return result;
    // Consent is saved, so a session failure only sends the parent to sign in.
    const session = await requireParent().catch((err: unknown) => {
      logUnexpectedError("confirmConsent: session", err);
      return null;
    });
    const sameFamily =
      session?.ok && session.data.familyId === result.data.familyId;
    return ok({ next: sameFamily ? NEW_CHILD_PATH : SIGN_IN_PATH });
  } catch (err) {
    return fail(
      "CONFIRM_FAILED",
      "We couldn't confirm your consent. Please try again.",
      logUnexpectedError("confirmConsent", err),
    );
  }
}
