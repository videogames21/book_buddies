import Link from "next/link";
import type { PendingBatch } from "@/server/recommendation/batches";
import { LocalTime } from "./local-time";

// UC-REC-parent-review step 1: the "batch ready" notice is the family's pending batches
// themselves, listed on the parent home (design/rec.md, Key decisions). A batch leaves
// the list once confirmed or past its handoffDeadline; with none pending, nothing shows.
export function PendingBatches({ batches }: { batches: PendingBatch[] }) {
  if (batches.length === 0) return null;
  return (
    <section aria-labelledby="pending-batches">
      <h2 id="pending-batches">Recommendations to review</h2>
      <ul>
        {batches.map((batch) => (
          <li key={batch.batchId}>
            <Link
              href={`/parent/children/${batch.childId}/recommendations/${batch.batchId}`}
            >
              {batch.nickname}: {batch.bookCount}{" "}
              {batch.bookCount === 1 ? "book" : "books"}
            </Link>
            , going to {batch.nickname} on{" "}
            <LocalTime iso={batch.handoffDeadline.toISOString()} />
          </li>
        ))}
      </ul>
    </section>
  );
}
