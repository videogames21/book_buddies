import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOnboardingStep } from "@/server/accounts-family/families";
import { requireAdmin, requireParent } from "@/server/identity-access/sessions";
import {
  CHECK_EMAIL_PATH,
  NEW_CHILD_PATH,
  SIGN_IN_PATH,
} from "./onboarding/paths";
import styles from "./children/new/new-child.module.css";

export const metadata = { title: "Home · BookBuddies" };

// The parent entry point and onboarding gate (UC-PAR-onboarding 8a). The home below is
// a placeholder until UC-PAR-view-growth-report designs the dashboard.
export default async function ParentHomePage() {
  const session = await requireParent();
  if (!session.ok) {
    if (session.error.code === "NOT_SIGNED_IN") redirect(SIGN_IN_PATH);
    // An admin signs in on the parent page and goes on to the catalog.
    if ((await requireAdmin()).ok) redirect("/admin/catalog");
    notFound();
  }

  if (session.data.parentRole === "main") {
    const step = await getOnboardingStep(session.data.familyId);
    if (step === "awaiting" || step === "expired") redirect(CHECK_EMAIL_PATH);
    if (step === "needs-first-child") redirect(NEW_CHILD_PATH);
  }

  return (
    <main className={styles.page}>
      <h1>Welcome to BookBuddies</h1>
      <p>
        <Link href={NEW_CHILD_PATH}>Add a Child</Link>
      </p>
    </main>
  );
}
