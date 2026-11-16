import { notFound, redirect } from "next/navigation";
import { requireParent } from "@/server/identity-access/sessions";
import { getChildForFamily } from "@/server/accounts-family/child-accounts";

// Integration point for UC-REC-kid-onboarding; it must implement its own family check.
export default async function ReadingProfilePendingPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const session = await requireParent();
  if (!session.ok) {
    if (session.error.code === "NOT_SIGNED_IN") redirect("/sign-in");
    notFound();
  }
  const { childId } = await params;
  const child = await getChildForFamily(session.data.familyId, childId);
  if (!child) notFound();
  return (
    <main>
      <h1>Account created</h1>
      <p>
        {child.nickname}’s account has been saved. Reading-interest onboarding
        is not available yet.
      </p>
    </main>
  );
}
