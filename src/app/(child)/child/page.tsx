import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { avatarSrc } from "@/server/accounts-family/avatars";
import { getChildDisplay } from "@/server/accounts-family/child-accounts";
import { requireChild } from "@/server/identity-access/sessions";
import styles from "./child.module.css";
import { CHILD_SHELF_PATH, CHILD_SIGN_IN_PATH } from "./paths";
import { SignOutButton } from "./sign-out-button";

// The child's home screen (design/shlf.md, a supporting flow with no use case, OI-46):
// the nickname, the avatar, My Shelf and Sign out, and nothing else (§8.2.11).
export const dynamic = "force-dynamic";

export default async function ChildHomePage() {
  const session = await requireChild();
  if (!session.ok) {
    if (session.error.code === "NOT_SIGNED_IN") redirect(CHILD_SIGN_IN_PATH);
    notFound();
  }
  const child = await getChildDisplay(session.data.childId);
  if (!child) notFound();
  return (
    <main className={styles.page}>
      <Image src={avatarSrc(child.avatar)} alt="" width={128} height={128} />
      <h1 className={styles.nickname}>{child.nickname}</h1>
      <Link className={styles.primary} href={CHILD_SHELF_PATH} prefetch={false}>
        My Shelf
      </Link>
      <SignOutButton />
    </main>
  );
}
