import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOnboardingStep } from "@/server/accounts-family/families";
import { requireParent } from "@/server/identity-access/sessions";

export default async function SettingsPage() {
  const session = await requireParent();
  if (!session.ok) {
    if (session.error.code === "NOT_SIGNED_IN") redirect("/sign-in");
    notFound();
  }
  const step = await getOnboardingStep(session.data.familyId);
  return (
    <main>
      <h1>Account settings</h1>
      {step === "revoked" && (
        <p>
          Consent has been withdrawn. You can review the data we still hold.
        </p>
      )}
      {session.data.parentRole === "main" &&
        (step === "awaiting" || step === "expired") && (
          <p>
            <Link href="/parent/onboarding/check-email">Confirm consent</Link>
          </p>
        )}
      {session.data.parentRole === "main" && step === "needs-first-child" && (
        <p>
          <Link href="/parent/children/new">Add a child</Link>
        </p>
      )}
      <p>
        <Link href="/parent/settings/child-data">
          Review or download child data
        </Link>
      </p>
    </main>
  );
}
