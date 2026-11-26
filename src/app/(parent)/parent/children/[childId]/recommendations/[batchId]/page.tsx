import { notFound, redirect } from "next/navigation";
import { requireParent } from "@/server/identity-access/sessions";
import { getBatchForReview } from "@/server/recommendation/batches";
import { BatchReview } from "./batch-review";

// UC-REC-parent-review steps 2-3. Read on every load, so a removal by the other parent, a
// block or the deadline shows at once (design/rec.md).
export const dynamic = "force-dynamic";
export const metadata = { title: "Recommendations to review · BookBuddies" };

export default async function BatchReviewPage({
  params,
}: {
  params: Promise<{ childId: string; batchId: string }>;
}) {
  const session = await requireParent();
  if (!session.ok) {
    if (session.error.code === "NOT_SIGNED_IN") redirect("/sign-in");
    notFound();
  }
  const { childId, batchId } = await params;
  // Another family's child, an unknown or malformed child or batch ID and another
  // child's batch all give the same 404.
  const view = await getBatchForReview(session.data.familyId, childId, batchId);
  if (!view) notFound();
  return (
    <BatchReview
      view={{ ...view, handoffDeadline: view.handoffDeadline.toISOString() }}
    />
  );
}
