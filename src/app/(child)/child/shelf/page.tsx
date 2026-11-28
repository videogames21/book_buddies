import { notFound, redirect } from "next/navigation";
import { requireChild } from "@/server/identity-access/sessions";
import { getShelfForChild } from "@/server/shelf/child-shelf";
import { CHILD_SIGN_IN_PATH } from "../paths";
import { ShelfBrowser } from "./shelf-browser";

export const metadata = { title: "My Shelf · BookBuddies" };

// UC-SHLF-kid-view-shelf. Read on every load, so a removed or blocked book is gone at
// once. It changes nothing. A failed read goes to the child area's retry screen (2b).
export const dynamic = "force-dynamic";

export default async function ChildShelfPage() {
  const session = await requireChild();
  if (!session.ok) {
    if (session.error.code === "NOT_SIGNED_IN") redirect(CHILD_SIGN_IN_PATH);
    notFound();
  }
  // The child is the session's: no child ID is ever in the address or the request.
  const view = await getShelfForChild(session.data.childId);
  return <ShelfBrowser view={view} />;
}
