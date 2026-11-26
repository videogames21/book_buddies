"use client";

import Link from "next/link";
import { useState, type SubmitEvent } from "react";
import type { SuggestionConflict } from "@/server/accounts-family/suggestions";
import { SUGGESTION_NOTE_MAX_LENGTH } from "@/shared/accounts-family/suggestion";
import styles from "../../../../books/books.module.css";
import { suggestBook } from "./actions";

// UC-PAR-suggest-book steps 2-3, 3a, 3b and 4a. The server checks everything; this form
// only sends it. The child and book IDs come from the route, never from a field.

const CONFLICT_FROM_CODE: Partial<Record<string, SuggestionConflict>> = {
  ALREADY_SUGGESTED: "suggested",
  ALREADY_RECOMMENDED: "recommended",
  ALREADY_ON_SHELF: "onShelf",
};

function warningText(conflict: SuggestionConflict, nickname: string): string {
  switch (conflict) {
    case "onShelf":
      return `This book is already on ${nickname}’s shelf.`;
    case "recommended":
      return `This book is already in ${nickname}’s recommendations.`;
    case "suggested":
      return `You’ve already suggested this book to ${nickname}. Suggesting it anyway replaces the note.`;
  }
}

export function SuggestForm({
  childId,
  bookId,
  nickname,
  initialConflict,
}: {
  childId: string;
  bookId: string;
  nickname: string;
  initialConflict: SuggestionConflict | null;
}) {
  const [note, setNote] = useState("");
  const [conflict, setConflict] = useState(initialConflict);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const length = note.trim().length;
  const tooLong = length > SUGGESTION_NOTE_MAX_LENGTH;

  if (done) {
    return (
      <section aria-live="polite">
        <p role="status">Suggested to {nickname}</p>
        <Link href="/parent/books">Back to the books</Link>
      </section>
    );
  }

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (tooLong) return;
    setPending(true);
    setError(null);
    try {
      const result = await suggestBook({
        childId,
        bookId,
        note,
        suggestAnyway: conflict !== null,
      });
      if (result.ok) {
        setDone(true);
        return;
      }
      const changed = CONFLICT_FROM_CODE[result.error.code];
      if (changed) {
        // The state changed after the page loaded: warn, keep the note, offer "anyway".
        setConflict(changed);
      } else {
        setError(
          result.error.errorId
            ? `${result.error.message} (Error ID: ${result.error.errorId})`
            : result.error.message,
        );
      }
    } catch {
      setError(
        "We couldn't reach BookBuddies, so we don't know whether the book was suggested. Reload the page and try again: if it was saved, we'll tell you.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        void onSubmit(event);
      }}
    >
      {conflict ? (
        <p role="alert" className={styles.warning}>
          {warningText(conflict, nickname)}
        </p>
      ) : null}
      <label>
        A note for {nickname} (optional)
        <textarea
          name="note"
          rows={3}
          value={note}
          placeholder="I think you’ll like this because…"
          aria-describedby="note-count"
          aria-invalid={tooLong}
          onChange={(event) => {
            setNote(event.target.value);
          }}
        />
        <span id="note-count" className={styles.counter}>
          {length} / {SUGGESTION_NOTE_MAX_LENGTH}
        </span>
      </label>
      {tooLong ? (
        <p role="alert" className={styles.error}>
          Please keep the note to {SUGGESTION_NOTE_MAX_LENGTH} characters or
          fewer.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}
      <div className={styles.buttons}>
        <button type="submit" disabled={pending || tooLong}>
          {pending ? "Suggesting…" : conflict ? "Suggest anyway" : "Suggest"}
        </button>
        {/* 3a: leaving writes nothing. */}
        <Link href="/parent/books">Cancel</Link>
      </div>
    </form>
  );
}
