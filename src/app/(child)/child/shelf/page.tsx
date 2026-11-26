import { notFound, redirect } from "next/navigation";
import { requireChild } from "@/server/identity-access/sessions";
import { getShelfForChild } from "@/server/shelf/child-shelf";
import { CHILD_SIGN_IN_PATH } from "../paths";
import { ShelfBrowser } from "./shelf-browser";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Shelf · BookBuddies" };

export default async function ChildShelfPage() {
  const session = await requireChild();
  if (!session.ok) {
    if (session.error.code === "NOT_SIGNED_IN") redirect(CHILD_SIGN_IN_PATH);
    notFound();
  }
  return <ShelfBrowser view={await getShelfForChild(session.data.childId)} />;
}
