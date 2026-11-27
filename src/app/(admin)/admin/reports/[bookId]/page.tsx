import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { listOpenBookReports } from "@/server/accounts-family/book-reports";
import { loadBookBlockPreview } from "@/server/administration/book-decisions";
import { requireAdminPage } from "../../access";
import { DecisionForm } from "../decision-form";

type Props = {
  params: Promise<{ bookId: string }>;
  searchParams: Promise<{ from?: string }>;
};

export default async function ReportedBookPage({
  params,
  searchParams,
}: Props) {
  await requireAdminPage();
  const { bookId } = await params;
  if (!z.uuid().safeParse(bookId).success) notFound();
  const entry = (await searchParams).from === "catalog" ? "catalog" : "reports";
  const preview = await loadBookBlockPreview(bookId);
  if (!preview) notFound();
  const reports = entry === "reports" ? await listOpenBookReports(bookId) : [];
  const canDecide = entry === "catalog" || reports.length > 0;
  return (
    <main>
      <p>
        <Link href={entry === "catalog" ? "/admin/catalog" : "/admin/reports"}>
          Back
        </Link>
      </p>
      <h1>{preview.title}</h1>
      <p>
        Status: {preview.status}
        {preview.reason && ` (${preview.reason})`}
      </p>
      {entry === "reports" && (
        <section>
          <h2>Open reports</h2>
          {reports.length ? (
            <ul>
              {reports.map((report) => (
                <li key={report.id}>
                  {report.reason} · Account {report.accountRef}
                  <DecisionForm
                    bookId={bookId}
                    entry="reports"
                    kind="warn"
                    reportId={report.id}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p>There are no open reports for this book.</p>
          )}
        </section>
      )}
      {canDecide && preview.status !== "blocked" && (
        <>
          <p>
            Blocking removes this book from recommendations and {preview.count}{" "}
            shelf entries.
          </p>
          <DecisionForm bookId={bookId} entry={entry} kind="block" />
        </>
      )}
      {entry === "reports" && canDecide && (
        <DecisionForm
          bookId={bookId}
          entry={entry}
          kind={preview.status === "blocked" ? "close" : "discard"}
        />
      )}
    </main>
  );
}
