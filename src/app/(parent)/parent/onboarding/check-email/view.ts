import "server-only";
import { getOnboardingStep } from "@/server/accounts-family/families";
import { requireParent } from "@/server/identity-access/sessions";
import { PARENT_HOME_PATH, SIGN_IN_PATH } from "../paths";

export type CheckEmailView =
  { redirect: string } | { notFound: true } | { state: "awaiting" | "expired" };

/**
 * What the check-email page shows (UC-PAR-onboarding 6, 6a), decided on the server for
 * every request (§8.1). Only a Main Parent who has not confirmed sees it.
 */
export async function checkEmailView(): Promise<CheckEmailView> {
  const session = await requireParent();
  if (!session.ok) {
    return session.error.code === "NOT_SIGNED_IN"
      ? { redirect: SIGN_IN_PATH }
      : { notFound: true };
  }
  if (session.data.parentRole !== "main") return { redirect: PARENT_HOME_PATH };
  const step = await getOnboardingStep(session.data.familyId);
  if (step === "awaiting" || step === "expired") return { state: step };
  return { redirect: PARENT_HOME_PATH };
}
