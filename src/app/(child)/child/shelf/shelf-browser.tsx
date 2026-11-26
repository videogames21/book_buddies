"use client";

import Link from "next/link";
import { useState } from "react";
import type { ChildShelfView } from "@/server/shelf/child-shelf";
import styles from "../child.module.css";
import { CHILD_HOME_PATH } from "../paths";
import { dismissChildNotice } from "./actions";
import shelf from "./shelf.module.css";

const categories = {
  readingNow: "Reading Now",
  wantToRead: "Want to Read",
  maybeLater: "Maybe Later",
  finished: "Finished",
};
const ratings = {
  lovedIt: "Loved it",
  likedIt: "Liked it",
  okay: "It was okay",
  notForMe: "Not for me",
};

export function ShelfBrowser({ view }: { view: ChildShelfView }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const empty = view.categories.every(({ entries }) => entries.length === 0);

  async function dismiss(id: string) {
    setPending(id);
    setError(null);
    try {
      const result = await dismissChildNotice(id);
      if (result.ok) {
        setDismissed((ids) => [...ids, id]);
      } else {
        setError(result.error.message);
      }
    } catch {
      setError("That notice could not be dismissed. Try again.");
    } finally {
      setPending(null);
    }
  }

  return (
    <main className={styles.page}>
      <h1>My Shelf</h1>
      {view.notices
        .filter(({ id }) => !dismissed.includes(id))
        .map((notice) => (
          <section className={shelf.notice} key={notice.id}>
            <p>
              {notice.kind === "finish-declined"
                ? "Your grown-up says you haven’t finished this book yet."
                : notice.title
                  ? `${notice.title} was taken off your shelf.`
                  : "A book was taken off your shelf."}
            </p>
            <button
              className={styles.secondary}
              type="button"
              disabled={pending !== null}
              onClick={() => void dismiss(notice.id)}
            >
              OK
            </button>
          </section>
        ))}
      {error && <p role="alert">{error}</p>}
      {empty && <p>Your shelf is empty. Find a book to get started.</p>}
      {view.categories.map(({ category, entries }) => (
        <section className={shelf.category} key={category}>
          <h2>{categories[category]}</h2>
          {entries.length > 0 && (
            <ul>
              {entries.map((book) => {
                const expanded = selected === book.id;
                const awaiting = category === "finished" && !book.confirmed;
                return (
                  <li key={book.id}>
                    <button
                      type="button"
                      className={awaiting ? shelf.awaiting : styles.secondary}
                      aria-expanded={expanded}
                      onClick={() => setSelected(expanded ? null : book.id)}
                    >
                      {book.title}
                      {book.confirmed && (
                        <span
                          title="Finished confirmed"
                          aria-label="Finished confirmed"
                        >
                          {" "}
                          ✓
                        </span>
                      )}
                    </button>
                    {expanded && (
                      <div className={shelf.details}>
                        <p>By {book.author}</p>
                        {book.seriesName && <p>{book.seriesName}</p>}
                        {book.rating && <p>{ratings[book.rating]}</p>}
                        {awaiting && (
                          <p>Waiting for your grown-up to confirm.</p>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}
      <Link
        className={styles.secondary}
        href={CHILD_HOME_PATH}
        prefetch={false}
      >
        Back
      </Link>
    </main>
  );
}
