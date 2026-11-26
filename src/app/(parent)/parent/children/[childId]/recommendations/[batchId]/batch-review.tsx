"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ReviewBook } from "@/server/catalog/books";
import type { BatchReviewView } from "@/server/recommendation/batches";
import { LocalTime } from "../../../../local-time";
import { confirmBatch, removeBookFromBatch } from "./actions";
import styles from "./batch-review.module.css";

export type BatchReviewProps = {
  view: Omit<BatchReviewView, "handoffDeadline"> & { handoffDeadline: string };
};

const tagsOf = (book: ReviewBook) =>
  [...book.genres, ...book.subjects, ...book.moods, book.length].join(" · ");

/**
 * Steps 3-6 and 4a. Each removal is saved when the parent taps Remove; Confirm releases
 * the batch. Every button is disabled while an action runs. A failed save leaves the page
 * as it was with the error (5a); a batch released meanwhile, by the other parent or the
 * deadline, reloads into the released view. The Report control waits for the batch
 * report page (UC-PAR-report-book), so no link leads to a 404.
 */
export function BatchReview({ view }: BatchReviewProps) {
  const router = useRouter();
  const [books, setBooks] = useState(view.books);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const { childId, batchId, nickname } = view;
  const released = view.state !== "pending" || confirmed;

  async function run(
    action: () => Promise<
      { ok: true } | { ok: false; error: { code: string; message: string } }
    >,
    onOk: () => void,
  ) {
    setBusy(true);
    setError(null);
    try {
      const result = await action();
      if (result.ok) {
        onOk();
      } else if (result.error.code === "BATCH_ALREADY_RELEASED") {
        router.refresh();
      } else {
        setError(result.error.message);
      }
    } catch {
      setError("We couldn't save that. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Recommendations for {nickname}</h1>
      <p className={styles.source}>Picked by the rules recommender</p>
      {released ? (
        <p className={styles.released} role="status">
          {confirmed ? "Released" : "Already released"} to {nickname}.
        </p>
      ) : (
        <p className={styles.deadline}>
          If you don’t confirm, these go to {nickname} unchanged on{" "}
          <LocalTime iso={view.handoffDeadline} />.
        </p>
      )}

      {books.length === 0 ? (
        <p className={styles.none}>
          {released
            ? "No books were sent."
            : `No books left. Confirm to let ${nickname} know there are no new picks right now.`}
        </p>
      ) : (
        <ul className={styles.list}>
          {books.map((book) => (
            <li key={book.id} className={styles.book}>
              <div>
                <span className={styles.bookTitle}>{book.title}</span>{" "}
                <span className={styles.bookAuthor}>by {book.author}</span>
                <p className={styles.tags}>{tagsOf(book)}</p>
              </div>
              {!released && (
                <button
                  type="button"
                  disabled={busy}
                  aria-label={`Remove ${book.title}`}
                  onClick={() => {
                    void run(
                      () =>
                        removeBookFromBatch({
                          childId,
                          batchId,
                          bookId: book.id,
                        }),
                      () => {
                        setBooks((left) =>
                          left.filter((other) => other.id !== book.id),
                        );
                      },
                    );
                  }}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {!released && (
        <button
          type="button"
          className={styles.confirm}
          disabled={busy}
          onClick={() => {
            void run(
              () => confirmBatch({ childId, batchId }),
              () => {
                setConfirmed(true);
                router.refresh();
              },
            );
          }}
        >
          Confirm
        </button>
      )}
    </main>
  );
}
