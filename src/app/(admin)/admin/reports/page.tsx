import Link from "next/link";
import { loadReportedBookQueue } from "@/server/administration/book-decisions";
import { requireAdminPage } from "../access";

export const metadata = { title: "Reported books · BookBuddies" };

export default async function ReportQueuePage() {
  await requireAdminPage();
  const queue = await loadReportedBookQueue();
  return (
    <main>
      <h1>Reported books</h1>
      <p>
        <Link href="/admin/catalog">Catalog</Link>
      </p>
      {queue.length === 0 ? (
        <p>There are no open book reports.</p>
      ) : (
        <ul>
          {queue.map(({ bookId, title, count, reasons }) => (
            <li key={bookId}>
              <Link href={`/admin/reports/${bookId}`}>{title}</Link>
              {" — "}
              {count} {count === 1 ? "report" : "reports"} ({reasons.join(", ")}
              )
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
