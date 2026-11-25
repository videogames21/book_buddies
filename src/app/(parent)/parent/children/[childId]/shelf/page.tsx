import { notFound, redirect } from "next/navigation";
import { requireParent } from "@/server/identity-access/sessions";
import { getShelfForParent } from "@/server/shelf/parent-shelf";
import { ShelfBrowser } from "./shelf-browser";

// UC-SHLF-parent-view-shelf. Read on every load: a cached shelf could show a book that a
// block or a removal has already taken off (design/shlf.md, Key decisions).
export const dynamic = "force-dynamic";

export default async function ParentShelfPage({
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
  // Another family's child, an unknown ID and a malformed ID all give the same 404 (2c).
  const view = await getShelfForParent(session.data.familyId, childId);
  if (!view) notFound();
  return <ShelfBrowser view={view} childId={childId} />;
}
