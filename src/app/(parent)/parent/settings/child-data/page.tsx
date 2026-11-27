import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { listChildrenForFamily } from "@/server/accounts-family/child-accounts";
import { requireParent } from "@/server/identity-access/sessions";
import { ReviewChildData } from "./review-child-data";

export default async function ChildDataPage() {
  const session = await requireParent();
  if (!session.ok) {
    if (session.error.code === "NOT_SIGNED_IN") redirect("/sign-in");
    notFound();
  }
  const children = await listChildrenForFamily(session.data.familyId);
  return (
    <main>
      <p>
        <Link href="/parent/settings">Account settings</Link>
      </p>
      <h1>Review child data</h1>
      {children.length ? (
        <ReviewChildData
          children={children.map(({ _id, nickname }) => ({
            id: _id,
            nickname,
          }))}
        />
      ) : (
        <p>There are no children linked to this account.</p>
      )}
    </main>
  );
}
