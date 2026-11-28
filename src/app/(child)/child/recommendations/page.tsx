import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireChild } from "@/server/identity-access/sessions";
import { getRecommendationListForChild } from "@/server/recommendation/reactions";
import styles from "../child.module.css";
import { CHILD_HOME_PATH, CHILD_SIGN_IN_PATH } from "../paths";
import { RecommendationList } from "./recommendation-list";

export const metadata = { title: "My recommendations · BookBuddies" };

// UC-REC-kid-review steps 1–2 (design/rec.md, Components). Read on every load, so an
// answered, reported or blocked book is gone at once. A failed read throws to the
// retry screen (error.tsx), so no partial list is shown.
export const dynamic = "force-dynamic";

export default async function ChildRecommendationsPage() {
  const session = await requireChild();
  if (!session.ok) {
    if (session.error.code === "NOT_SIGNED_IN") redirect(CHILD_SIGN_IN_PATH);
    notFound();
  }
  // The child is the session's: no child ID is ever in the address or the request.
  const items = await getRecommendationListForChild(session.data);
  return (
    <main className={styles.page}>
      <h1>My recommendations</h1>
      <RecommendationList items={items} />
      <Link
        className={styles.secondary}
        href={CHILD_HOME_PATH}
        prefetch={false}
      >
        Back home
      </Link>
    </main>
  );
}
