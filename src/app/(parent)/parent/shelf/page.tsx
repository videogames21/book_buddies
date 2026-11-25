import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { avatarSrc } from "@/server/accounts-family/avatars";
import { listChildrenForFamily } from "@/server/accounts-family/child-accounts";
import { requireParent } from "@/server/identity-access/sessions";
import styles from "./picker.module.css";

// Extension 1a of UC-SHLF-parent-view-shelf, and the entry point until a parent dashboard
// links to the shelf: a parent with one child goes straight to that child's shelf, one
// with several chooses by nickname and avatar. Read on every load.
export const dynamic = "force-dynamic";

export default async function ChooseShelfPage() {
  const session = await requireParent();
  if (!session.ok) {
    if (session.error.code === "NOT_SIGNED_IN") redirect("/sign-in");
    notFound();
  }
  const children = await listChildrenForFamily(session.data.familyId);

  if (children.length === 1 && children[0]) {
    redirect(`/parent/children/${children[0]._id}/shelf`);
  }
  if (children.length === 0) {
    // Extension 1b: no linked child. Only a Main Parent can add one.
    if (session.data.parentRole === "main") redirect("/parent/children/new");
    return (
      <main className={styles.page}>
        <h1 className={styles.title}>No shelf to show yet</h1>
        <p>Ask the family’s Main Parent to add a child first.</p>
      </main>
    );
  }
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Whose shelf?</h1>
      <ul className={styles.list}>
        {children.map((child) => (
          <li key={child._id}>
            <Link
              className={styles.child}
              href={`/parent/children/${child._id}/shelf`}
            >
              <Image
                src={avatarSrc(child.avatar)}
                alt=""
                width={48}
                height={48}
              />
              <span>{child.nickname}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
