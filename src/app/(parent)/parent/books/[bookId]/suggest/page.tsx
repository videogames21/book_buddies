import { notFound, redirect } from "next/navigation";
import { listChildrenForFamily } from "@/server/accounts-family/child-accounts";
import { findActiveBookIds } from "@/server/catalog/books";
import { decodeRouteParam, requireSuggestingParent } from "../../access";
import { ChildPicker } from "./child-picker";

// UC-PAR-suggest-book extension 1a: which child to suggest the book to. One child goes
// straight to the confirmation; none does what /parent/shelf does (design/par.md).
export const dynamic = "force-dynamic";
export const metadata = { title: "Suggest a book · BookBuddies" };

export default async function SuggestChildPickerPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const session = await requireSuggestingParent();
  const bookId = decodeRouteParam((await params).bookId);
  // Unknown, draft and blocked books all give the same 404 (PRE-3).
  if ((await findActiveBookIds([bookId])).length === 0) notFound();

  const children = await listChildrenForFamily(session.familyId);
  if (children.length === 1 && children[0]) {
    redirect(
      `/parent/children/${encodeURIComponent(children[0]._id)}/suggest/${encodeURIComponent(bookId)}`,
    );
  }
  if (children.length === 0) {
    // Only a Main Parent can add a child.
    if (session.parentRole === "main") redirect("/parent/children/new");
    return <ChildPicker view={{ kind: "noChild" }} />;
  }
  return (
    <ChildPicker
      view={{
        kind: "children",
        bookId,
        children: children.map((child) => ({
          id: child._id,
          nickname: child.nickname,
          avatar: child.avatar,
        })),
      }}
    />
  );
}
