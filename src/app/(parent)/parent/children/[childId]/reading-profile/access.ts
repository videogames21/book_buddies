import "server-only";
import {
  getChildForFamily,
  isConsentConfirmed,
} from "@/server/accounts-family/child-accounts";
import {
  requireParent,
  type ParentSession,
  type SessionErrorCode,
} from "@/server/identity-access/sessions";
import { fail, ok, type ActionResult } from "@/server/lib/action-result";

// Who may open or save a child's reading profile: a signed-in parent, Main or Sub, of
// the child's family (PRE-1, PRE-2; architecture §8.1). The page and the action both
// run this. Kept out of actions.ts, because every export of a "use server" file is
// callable.

export type ChildAccess = {
  session: ParentSession;
  child: NonNullable<Awaited<ReturnType<typeof getChildForFamily>>>;
};

export type ChildAccessCode = SessionErrorCode | "CHILD_NOT_FOUND";

/** Session, then the family check. A foreign or unknown child gets the same answer. */
export async function requireOwnChild(
  childId: unknown,
): Promise<ActionResult<ChildAccess, ChildAccessCode>> {
  const session = await requireParent();
  if (!session.ok) return session;
  const child =
    typeof childId === "string"
      ? await getChildForFamily(session.data.familyId, childId)
      : null;
  if (!child) return fail("CHILD_NOT_FOUND", "We couldn't find that child.");
  return ok({ session: session.data, child });
}

export type SaveAccessCode = ChildAccessCode | "CONSENT_NOT_CONFIRMED";

/** Saving also needs the family's consent to be confirmed (BR-kid-data-stored). */
export async function requireOwnChildWithConsent(
  childId: unknown,
): Promise<ActionResult<ChildAccess, SaveAccessCode>> {
  const access = await requireOwnChild(childId);
  if (!access.ok) return access;
  if (!(await isConsentConfirmed(access.data.session.familyId))) {
    return fail(
      "CONSENT_NOT_CONFIRMED",
      "Your family's consent must be confirmed before saving a reading profile.",
    );
  }
  return access;
}

// The completion page (UC-PAR-create-kid-account step 10). The path template is fixed
// here; the child ID in it comes from the route, never from a request field.
export const onboardingCompletePath = (childId: string) =>
  `/parent/children/${childId}/onboarding-complete`;
