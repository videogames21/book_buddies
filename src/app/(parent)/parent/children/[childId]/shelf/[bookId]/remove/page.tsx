import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { RemoveConfirm } from "./remove-confirm";
import { removeBookView } from "./view";
import styles from "./remove.module.css";

// UC-SHLF-parent-remove-book from the shelf (UC-SHLF-parent-view-shelf's "Remove from
// shelf" link). Read on every load, so a book removed since the shelf loaded shows as 3b.
export const dynamic = "force-dynamic";
export const metadata = { title: "Remove from shelf · BookBuddies" };

export default async function RemoveBookPage({
  params,
}: {
  params: Promise<{ childId: string; bookId: string }>;
}) {
  const { childId, bookId } = await params;
  const view = await removeBookView(childId, bookId);
  if ("redirect" in view) redirect(view.redirect);
  if ("notFound" in view) notFound();

  return (
    <main className={styles.page}>
      {view.state === "offShelf" ? (
        <section className={styles.panel}>
          <h1>Already off the shelf</h1>
          <p>This book is already off {view.nickname}’s shelf.</p>
          <Link href={view.shelfPath}>Back to {view.nickname}’s shelf</Link>
        </section>
      ) : (
        <RemoveConfirm
          childId={view.childId}
          bookId={view.bookId}
          title={view.title}
          nickname={view.nickname}
          backPath={view.shelfPath}
        />
      )}
    </main>
  );
}
