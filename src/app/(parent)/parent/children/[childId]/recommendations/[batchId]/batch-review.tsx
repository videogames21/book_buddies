"use client";

import Link from "next/link";
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
 * the batch. Every button is disabled while an action runs. A save that failed before
 * writing leaves the page as it was with the error (5a). When the outcome is not known
 * (the request or its response was lost, or `OUTCOME_UNKNOWN`), or the batch was released
 * meanwhile, the page reloads the batch and keeps its controls disabled until the
 * reloaded batch arrives (review of #137). The books shown are always the reloaded
 * view's, less those this tab has just removed, so a released view lists what was sent.
 * Report opens the batch entry page of UC-PAR-report-book; while an action runs or the
 * batch reloads it is disabled like the buttons.
 */
export function BatchReview({ view }: BatchReviewProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [removedHere, setRemovedHere] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  // The view a reload was asked from: until a new view arrives, the list is hidden and
  // the controls are disabled.
  const [reloadingFrom, setReloadingFrom] = useState<
    BatchReviewProps["view"] | null
  >(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [unknown, setUnknown] = useState(false);
  const [confirmedHere, setConfirmedHere] = useState(false);
  const { childId, batchId, nickname } = view;
  const reloading = reloadingFrom === view;
  const released = view.state !== "pending" || confirmedHere;
  const books = view.books.filter((book) => !removedHere.has(book.id));
  const disabled = busy || reloading;

  function reload() {
    setReloadingFrom(view);
    router.refresh();
  }

  function outcomeUnknown() {
    setUnknown(true);
    setNotice(null);
    reload();
  }

  async function run(
    action: () => Promise<
      { ok: true } | { ok: false; error: { code: string; message: string } }
    >,
    onOk: () => void,
  ) {
    setBusy(true);
    setNotice(null);
    setUnknown(false);
    try {
      const result = await action();
      if (result.ok) {
        onOk();
      } else if (result.error.code === "BATCH_ALREADY_RELEASED") {
        reload();
      } else if (result.error.code === "OUTCOME_UNKNOWN") {
        outcomeUnknown();
      } else {
        setNotice(result.error.message);
      }
    } catch {
      // The request or its response was lost: the save may have applied.
      outcomeUnknown();
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
          {confirmedHere ? "Released" : "Already released"} to {nickname}.
        </p>
      ) : (
        <p className={styles.deadline}>
          If you don’t confirm, these go to {nickname} unchanged on{" "}
          <LocalTime iso={view.handoffDeadline} />.
        </p>
      )}

      {reloading ? null : books.length === 0 ? (
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
                <div className={styles.controls}>
                  <button
                    type="button"
                    disabled={disabled}
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
                          setRemovedHere((left) => new Set(left).add(book.id));
                          router.refresh();
                        },
                      );
                    }}
                  >
                    Remove
                  </button>
                  <Link
                    href={`/parent/children/${childId}/recommendations/${batchId}/${book.id}/report`}
                    className={styles.report}
                    aria-label={`Report ${book.title}`}
                    aria-disabled={disabled}
                    onClick={(event) => {
                      if (disabled) event.preventDefault();
                    }}
                  >
                    Report
                  </Link>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {unknown && (
        <p className={styles.error} role="alert">
          {reloading
            ? "We couldn’t confirm whether that was saved. Checking…"
            : "We couldn’t confirm whether that was saved. This page now shows what is saved."}
        </p>
      )}
      {notice && (
        <p className={styles.error} role="alert">
          {notice}
        </p>
      )}
      {!released && (
        <button
          type="button"
          className={styles.confirm}
          disabled={disabled}
          onClick={() => {
            void run(
              () => confirmBatch({ childId, batchId }),
              () => {
                setConfirmedHere(true);
                reload();
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
