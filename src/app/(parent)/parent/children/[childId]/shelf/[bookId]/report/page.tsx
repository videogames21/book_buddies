import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ReportForm } from "../../../report-book/report-form";
import { reportPageView } from "./view";
import styles from "../../../report-book/report.module.css";

// UC-PAR-report-book from the shelf (UC-SHLF-parent-view-shelf's "Report" link). Read on
// every load, so a report another parent just sent shows as 7c.
export const dynamic = "force-dynamic";
export const metadata = { title: "Report a book · BookBuddies" };

export default async function ReportBookPage({
  params,
}: {
  params: Promise<{ childId: string; bookId: string }>;
}) {
  const { childId, bookId } = await params;
  const view = await reportPageView(childId, bookId);
  if ("redirect" in view) redirect(view.redirect);
  if ("notFound" in view) notFound();

  return (
    <main className={styles.page}>
      {view.state === "alreadyReported" ? (
        <section className={styles.panel}>
          <h1>Already reported</h1>
          <p>This book has already been reported for {view.nickname}.</p>
          <Link href={view.shelfPath}>Back to {view.nickname}’s shelf</Link>
        </section>
      ) : (
        <ReportForm
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
