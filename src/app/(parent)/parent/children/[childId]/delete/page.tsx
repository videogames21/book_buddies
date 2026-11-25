import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { avatarSrc } from "@/server/accounts-family/avatars";
import { getChildForFamily } from "@/server/accounts-family/child-accounts";
import { requireParent } from "@/server/identity-access/sessions";
import { DeleteChildForm } from "./delete-child-form";
import styles from "./delete-child.module.css";

export const metadata = { title: "Delete a child's account · BookBuddies" };

// UC-PAR-delete-kid-account steps 2, 3 and 7. The page checks access itself (§8.1); the
// action checks again, because an action can be called without the page. Leaving the
// page is the cancel (2a). No page links here yet (design/par.md, Open questions).
export default async function DeleteChildPage({
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
  if (!child) notFound(); // a foreign child and an unknown one look the same

  if (session.data.parentRole !== "main") {
    return (
      <main className={styles.page}>
        <h1>Delete a child’s account</h1>
        <p>Only the Main Parent can delete a child’s account.</p>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <h1>Delete a child’s account</h1>
      <header className={styles.child}>
        <Image src={avatarSrc(child.avatar)} alt="" width={64} height={64} />
        <p>{child.nickname}</p>
      </header>
      <DeleteChildForm childId={childId} nickname={child.nickname} />
    </main>
  );
}
