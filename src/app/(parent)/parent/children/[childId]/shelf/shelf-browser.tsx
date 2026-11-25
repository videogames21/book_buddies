"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ParentShelfView } from "@/server/shelf/parent-shelf";
import styles from "./shelf.module.css";

const CATEGORY_LABELS = {
  readingNow: "Reading Now",
  wantToRead: "Want to Read",
  maybeLater: "Maybe Later",
  finished: "Finished",
} as const;

const RATING_LABELS = {
  lovedIt: "Loved it",
  likedIt: "Liked it",
  okay: "It was okay",
  notForMe: "Not for me",
} as const;

/**
 * Steps 3 to 6 of UC-SHLF-parent-view-shelf. The whole shelf arrives at once and the
 * selected book is only state in this component, so choosing a book makes no request and
 * cannot hit a failed read or a blocked book halfway through a visit. The four links go
 * to pages that other use cases implement; this view never writes (POST-2).
 */
export function ShelfBrowser({
  view,
  childId,
}: {
  view: ParentShelfView;
  childId: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const all = view.categories.flatMap((group) =>
    group.entries.map((entry) => ({ ...entry, category: group.category })),
  );
  const selected = all.find((entry) => entry.bookId === selectedId) ?? null;
  const base = `/parent/children/${childId}/shelf`;

  // The panel sits after the last category, so a tap near the top of a long shelf would show
  // nothing where the parent is looking. Moving focus to the panel scrolls it into view and
  // tells a screen reader that something opened.
  useEffect(() => {
    if (selectedId !== null) panelRef.current?.focus();
  }, [selectedId]);

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>{view.child.nickname}’s shelf</h1>
      {all.length === 0 && (
        <p className={styles.empty}>
          {view.child.nickname} has no books on the shelf yet.
        </p>
      )}
      {view.categories.map((group) => (
        <section
          key={group.category}
          aria-labelledby={`shelf-${group.category}`}
          className={styles.section}
        >
          <h2 id={`shelf-${group.category}`}>
            {CATEGORY_LABELS[group.category]}
          </h2>
          {group.entries.length === 0 ? (
            <p className={styles.none}>Nothing here yet.</p>
          ) : (
            <ul className={styles.list}>
              {group.entries.map((entry) => (
                <li key={entry.bookId}>
                  <button
                    type="button"
                    id={`shelf-book-${entry.bookId}`}
                    className={styles.book}
                    aria-pressed={entry.bookId === selectedId}
                    onClick={() => {
                      setSelectedId(entry.bookId);
                    }}
                  >
                    <span className={styles.bookTitle}>{entry.title}</span>
                    <span className={styles.bookAuthor}>{entry.author}</span>
                    {entry.confirmed && (
                      <span
                        className={styles.confirmed}
                        role="img"
                        aria-label="Finish confirmed"
                      >
                        ✓
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
      {selected && (
        <aside
          ref={panelRef}
          tabIndex={-1}
          className={styles.panel}
          aria-label="Selected book"
        >
          <h2>{selected.title}</h2>
          <p>{selected.author}</p>
          {selected.rating && (
            <p>
              Rating: <strong>{RATING_LABELS[selected.rating]}</strong>
            </p>
          )}
          {selected.confirmed && <p>Finish confirmed.</p>}
          <ul className={styles.actions}>
            {selected.category === "finished" && !selected.confirmed && (
              <li>
                <Link
                  prefetch={false}
                  href={`${base}/${selected.bookId}/finish`}
                >
                  Confirm finished
                </Link>
              </li>
            )}
            {selected.confirmed && (
              <li>
                <Link
                  prefetch={false}
                  href={`${base}/${selected.bookId}/finish`}
                >
                  Edit note
                </Link>
              </li>
            )}
            <li>
              <Link prefetch={false} href={`${base}/${selected.bookId}/remove`}>
                Remove from shelf
              </Link>
            </li>
            <li>
              <Link prefetch={false} href={`${base}/${selected.bookId}/report`}>
                Report
              </Link>
            </li>
          </ul>
          <button
            type="button"
            onClick={() => {
              // Return focus to the book that was open, so the parent keeps their place.
              document.getElementById(`shelf-book-${selected.bookId}`)?.focus();
              setSelectedId(null);
            }}
          >
            Close
          </button>
        </aside>
      )}
    </main>
  );
}
