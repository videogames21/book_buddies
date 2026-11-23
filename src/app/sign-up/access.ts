import "server-only";
import { getOnboardingStep } from "@/server/accounts-family/families";
import { requireParent } from "@/server/identity-access/sessions";

/**
 * Who may not see the sign-up form: anyone signed in, except a Main Parent whose
 * sign-up has expired, who is starting again (UC-PAR-onboarding 6a). Kept out of
 * actions.ts, because every export of a "use server" file is callable.
 */
export async function mustLeaveSignUp(): Promise<boolean> {
  const session = await requireParent();
  if (!session.ok) return session.error.code !== "NOT_SIGNED_IN";
  if (session.data.parentRole !== "main") return true;
  return (await getOnboardingStep(session.data.familyId)) !== "expired";
}
