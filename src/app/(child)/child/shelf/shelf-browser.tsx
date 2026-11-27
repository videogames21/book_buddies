"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type {
  ChildShelfNotice,
  ChildShelfView,
} from "@/server/shelf/child-shelf";
import styles from "../child.module.css";
import {
  CHILD_DASHBOARD_PATH,
  CHILD_HOME_PATH,
  CHILD_SHELF_PATH,
  CHILD_SIGN_IN_PATH,
} from "../paths";
import { dismissChildNotice } from "./actions";
import shelf from "./shelf.module.css";

const CATEGORY_LABELS = {
  readingNow: "Reading Now",
  wantToRead: "Want to Read",
  maybeLater: "Maybe Later",
  finished: "Finished",
} as const;

// Words, never a number (BR-kid-no-metrics).
const RATING_LABELS = {
  lovedIt: "Loved it",
  likedIt: "Liked it",
  okay: "It was okay",
  notForMe: "Not for me",
} as const;

const ACTION_LABELS = { move: "Move", remove: "Remove", rate: "Rate" } as const;

/**
 * A notice's wording. The removal wording is the team's, asked of the client in OI-71;
 * it gives no reason and names no one.
 */
function NoticeText({ notice }: { notice: ChildShelfNotice }) {
  if (notice.kind === "finish-declined") {
    return (
      <p>
        Whoops! Looks like you didn’t finish your book. It went back to where it
        was.
      </p>
    );
  }
  return notice.title ? (
    <p>
      <em>{notice.title}</em> was taken off your shelf.
    </p>
  ) : (
    <p>A book was taken off your shelf.</p>
  );
}

/** A pending notice, which stays until the child taps OK and the server has it. */
function Notice({ notice }: { notice: ChildShelfNotice }) {
  const inFlight = useRef(false);
  const [seen, setSeen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function dismiss() {
    if (inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    setError(null);
    try {
      const result = await dismissChildNotice(notice.id);
      if (result.ok) {
        setSeen(true);
        return;
      }
      const { code } = result.error;
      if (code === "NOT_SIGNED_IN" || code === "NOT_A_CHILD") {
        window.location.replace(CHILD_SIGN_IN_PATH);
        return;
      }
      setError(result.error.message);
    } catch {
      setError("That didn’t work. Try again or ask a grown-up.");
    }
    inFlight.current = false;
    setSaving(false);
  }

  if (seen) return null;
  return (
    <div className={shelf.notice} role="status">
      <NoticeText notice={notice} />
      {error && <p role="alert">{error}</p>}
      <button
        type="button"
        className={styles.primary}
        disabled={saving}
        onClick={() => {
          void dismiss();
        }}
      >
        OK
      </button>
    </div>
  );
}

/**
 * Steps 3 to 5 of UC-SHLF-kid-view-shelf. The whole shelf arrives at once and the
 * selected book is only state here, so choosing one makes no request and changes no
 * address. The links go to pages that other use cases build.
 */
export function ShelfBrowser({ view }: { view: ChildShelfView }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const selected = view.categories
    .flatMap((group) => group.entries)
    .find((entry) => entry.bookId === selectedId);

  // The panel is after the last category, so focus brings it into view.
  useEffect(() => {
    if (selectedId !== null) panelRef.current?.focus();
  }, [selectedId]);

  return (
    <main className={styles.page}>
      <h1>My Shelf</h1>
      {view.notices.map((notice) => (
        <Notice key={notice.id} notice={notice} />
      ))}
      {view.showFindBookMessage && (
        <p>Find a book you like and get ideas for what to read next!</p>
      )}
      {view.categories.map((group) => (
        <section
          key={group.category}
          aria-labelledby={`shelf-${group.category}`}
          className={shelf.section}
        >
          <h2 id={`shelf-${group.category}`}>
            {CATEGORY_LABELS[group.category]}
          </h2>
          {/* An empty category has its heading and nothing else (3a). */}
          {group.entries.length > 0 && (
            <ul className={shelf.list}>
              {group.entries.map((entry) => (
                <li key={entry.bookId}>
                  <button
                    type="button"
                    id={`shelf-book-${entry.bookId}`}
                    // Awaiting a parent's confirmation: grayed, with no icon (3c).
                    className={
                      group.category === "finished" && !entry.confirmed
                        ? `${shelf.book} ${shelf.waiting}`
                        : shelf.book
                    }
                    aria-pressed={entry.bookId === selectedId}
                    onClick={() => {
                      setSelectedId(entry.bookId);
                    }}
                  >
                    <span>{entry.title}</span>
                    {entry.confirmed && (
                      <span
                        className={shelf.confirmed}
                        role="img"
                        aria-label="Finished"
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
          className={shelf.panel}
          aria-label="Selected book"
        >
          <h2>{selected.title}</h2>
          <p>{selected.author}</p>
          {selected.seriesName && <p>Series: {selected.seriesName}</p>}
          {selected.rating && (
            <p>
              My rating: <strong>{RATING_LABELS[selected.rating]}</strong>
            </p>
          )}
          {selected.actions.map((action) => (
            <Link
              key={action}
              className={styles.secondary}
              prefetch={false}
              href={`${CHILD_SHELF_PATH}/${selected.bookId}/${action}`}
            >
              {ACTION_LABELS[action]}
            </Link>
          ))}
          <button
            type="button"
            className={styles.secondary}
            onClick={() => {
              // Back to the book that was open, so the child keeps their place.
              document.getElementById(`shelf-book-${selected.bookId}`)?.focus();
              setSelectedId(null);
            }}
          >
            Close
          </button>
        </aside>
      )}
      <Link
        className={styles.secondary}
        href={CHILD_DASHBOARD_PATH}
        prefetch={false}
      >
        My Dashboard
      </Link>
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
