import { notFound, redirect } from "next/navigation";
import { requireParent } from "@/server/identity-access/sessions";
import { getChildForFamily } from "@/server/accounts-family/child-accounts";

export default async function OnboardingCompletePage({
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
      <h1>Onboarding complete</h1>
      <p>{child.nickname}’s onboarding is complete.</p>
    </main>
  );
}
