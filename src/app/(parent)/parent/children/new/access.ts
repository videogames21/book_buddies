import "server-only";
import { isConsentConfirmed } from "@/server/accounts-family/child-accounts";
import {
  requireParent,
  type ParentSession,
  type SessionErrorCode,
} from "@/server/identity-access/sessions";
import { fail, ok, type ActionResult } from "@/server/lib/action-result";

// Who may create a child account: a signed-in Main Parent whose family's consent is
// confirmed (PRE-1 to PRE-3). The page and the action both run this check (§8.1).
// Kept out of actions.ts, because every export of a "use server" file is callable.

export type CreateChildAccessCode =
  SessionErrorCode | "NOT_MAIN_PARENT" | "CONSENT_NOT_CONFIRMED";

export async function checkCreateChildAccess(): Promise<
  ActionResult<ParentSession, CreateChildAccessCode>
> {
  const session = await requireParent();
  if (!session.ok) return session;
  if (session.data.parentRole !== "main") {
    return fail(
      "NOT_MAIN_PARENT",
      "Only the family's Main Parent can add a child.",
    );
  }
  if (!(await isConsentConfirmed(session.data.familyId))) {
    return fail(
      "CONSENT_NOT_CONFIRMED",
      "Please confirm your consent from the email we sent before adding a child.",
    );
  }
  return ok(session.data);
}

// UC-PAR-onboarding's routes (1c redirects to check-email).
export {
  CHECK_EMAIL_PATH,
  SIGN_IN_PATH,
} from "@/app/(parent)/parent/onboarding/paths";
