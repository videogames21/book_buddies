import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { avatarSrc } from "@/server/accounts-family/avatars";
import { listPickerBooks } from "@/server/catalog/books";
import { getPrivacyNoticeUrl } from "@/server/lib/config";
import { INTEREST_OPTIONS } from "@/server/recommendation/interests";
import { isOnboardingComplete } from "@/server/recommendation/reading-profiles";
import { requireOwnChild } from "./access";
import { PARENT_HOME_PATH } from "./paths";
import { ReadingProfileForm } from "./reading-profile-form";
import styles from "./reading-profile.module.css";

export const metadata = { title: "Reading profile · BookBuddies" };

// UC-REC-kid-onboarding steps 1 and 2. The page checks access itself (§8.1); the action
// checks again, because an action can be called without the page.
export default async function ReadingProfilePage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = await params;
  const access = await requireOwnChild(childId);
  if (!access.ok) {
    if (access.error.code === "NOT_SIGNED_IN") redirect("/sign-in");
    notFound(); // not a parent, a foreign child and an unknown child look the same
  }
  const { child, session } = access.data;

  // 1a: already complete is an error shown to the parent. The child keeps their access.
  if (await isOnboardingComplete(session.familyId, childId)) {
    return (
      <main className={styles.page}>
        <h1>Reading profile</h1>
        <p role="alert" className={styles.error}>
          {child.nickname}’s reading profile is already complete.
        </p>
        {PARENT_HOME_PATH ? (
          <Link href={PARENT_HOME_PATH}>Back to home</Link>
        ) : null}
      </main>
    );
  }

  const books = await listPickerBooks();
  return (
    <main className={styles.page}>
      <header className={styles.child}>
        <Image src={avatarSrc(child.avatar)} alt="" width={64} height={64} />
        <p>{child.nickname}</p>
      </header>
      <ReadingProfileForm
        childId={childId}
        interests={INTEREST_OPTIONS.map((option) => ({ ...option }))}
        books={books}
        privacyNoticeUrl={getPrivacyNoticeUrl()}
      />
    </main>
  );
}
