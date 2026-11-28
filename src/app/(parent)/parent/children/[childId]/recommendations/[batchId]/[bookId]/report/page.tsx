import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ReportForm } from "../../../../report-book/report-form";
import styles from "../../../../report-book/report.module.css";
import { batchReportPageView } from "./view";

// UC-PAR-report-book from a recommendation batch under review (UC-REC-parent-review
// step 4's "Report" link). Read on every load, so a report another parent just sent
// shows as 7c and a batch released meanwhile is the 404.
export const dynamic = "force-dynamic";
export const metadata = { title: "Report a book · BookBuddies" };

export default async function BatchReportBookPage({
  params,
}: {
  params: Promise<{ childId: string; batchId: string; bookId: string }>;
}) {
  const { childId, batchId, bookId } = await params;
  const view = await batchReportPageView(childId, batchId, bookId);
  if ("redirect" in view) redirect(view.redirect);
  if ("notFound" in view) notFound();

  return (
    <main className={styles.page}>
      {view.state === "alreadyReported" ? (
        <section className={styles.panel}>
          <h1>Already reported</h1>
          <p>This book has already been reported for {view.nickname}.</p>
          <Link href={view.batchPath}>
            Back to {view.nickname}’s recommendations
          </Link>
        </section>
      ) : (
        <ReportForm
          childId={view.childId}
          bookId={view.bookId}
          title={view.title}
          nickname={view.nickname}
          backPath={view.batchPath}
          entry="batch"
        />
      )}
    </main>
  );
}
