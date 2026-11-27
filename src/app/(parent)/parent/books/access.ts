import "server-only";
import { notFound, redirect } from "next/navigation";
import { getOnboardingStep } from "@/server/accounts-family/families";
import {
  requireParent,
  type ParentSession,
} from "@/server/identity-access/sessions";
import { areParentSuggestionsEnabled } from "@/server/lib/config";

/**
 * The checks every UC-PAR-suggest-book page makes first (design/par.md, API contract):
 * the release gate (off: 404), the session (none: sign-in; not a parent: 404) and the
 * onboarding gate (any step but `complete`: `/parent`, which routes by step). The step
 * is the family's, so a Sub Parent of a complete family passes. The action does not
 * rely on this: it checks the session and the child itself.
 */
export async function requireSuggestingParent(): Promise<ParentSession> {
  if (!areParentSuggestionsEnabled()) notFound();
  const session = await requireParent();
  if (!session.ok) {
    if (session.error.code === "NOT_SIGNED_IN") redirect("/sign-in");
    notFound();
  }
  if ((await getOnboardingStep(session.data.familyId)) !== "complete") {
    redirect("/parent");
  }
  return session.data;
}

/**
 * A route segment as stored. Next.js passes page params still percent-encoded, and the
 * links encode catalog IDs, which are arbitrary strings (review of #147). A segment that
 * is not valid encoding is a 404, like an unknown ID.
 */
export function decodeRouteParam(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    notFound();
  }
}
