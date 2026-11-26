"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { SuggestionConflict } from "@/server/accounts-family/suggestions";
import { SUGGESTION_NOTE_MAX_LENGTH } from "@/shared/accounts-family/suggestion";
import styles from "../../../../books/books.module.css";
import { initialFormState, type SuggestFormState } from "./form-state";

// UC-PAR-suggest-book steps 2-3, 3a, 3b and 4a. The server checks everything; this form
// only sends it. It posts to a server action through useActionState, so it works before
// hydration and without JavaScript, and the note never goes into a URL (review of #147).
// The child and book IDs are bound to the action by the page, never sent as fields.

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
  action,
  nickname,
  initialConflict,
}: {
  action: (
    previous: SuggestFormState,
    formData: FormData,
  ) => Promise<SuggestFormState>;
  nickname: string;
  initialConflict: SuggestionConflict | null;
}) {
  const [state, formAction, pending] = useActionState(
    action,
    initialFormState(initialConflict),
  );

  if (state.status === "done") {
    return (
      <section aria-live="polite">
        <p role="status">Suggested to {nickname}</p>
        <Link href="/parent/books">Back to the books</Link>
      </section>
    );
  }
  return (
    <EditingForm
      // A new state (a refusal) starts the field from the note it carries.
      key={JSON.stringify(state)}
      state={state}
      formAction={formAction}
      pending={pending}
      nickname={nickname}
    />
  );
}

function EditingForm({
  state,
  formAction,
  pending,
  nickname,
}: {
  state: Extract<SuggestFormState, { status: "editing" }>;
  formAction: (formData: FormData) => void;
  pending: boolean;
  nickname: string;
}) {
  const [note, setNote] = useState(state.note);
  const length = note.trim().length;
  const tooLong = length > SUGGESTION_NOTE_MAX_LENGTH;
  const { conflict } = state;
  // The server's message is about the note it was sent. Once the parent edits the note,
  // the live check takes over, so the two never show the same message twice.
  const edited = note !== state.note;
  const serverError = edited ? null : state.error;

  return (
    <form className={styles.form} action={formAction}>
      {conflict ? (
        <p role="alert" className={styles.warning}>
          {warningText(conflict, nickname)}
        </p>
      ) : null}
      {/* "Suggest anyway" is the answer to the warning shown above (4a). */}
      <input type="hidden" name="suggestAnyway" value={conflict ? "1" : "0"} />
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
      {tooLong && !serverError ? (
        <p role="alert" className={styles.error}>
          Please keep the note to {SUGGESTION_NOTE_MAX_LENGTH} characters or
          fewer.
        </p>
      ) : null}
      {serverError ? (
        <p role="alert" className={styles.error}>
          {serverError}
        </p>
      ) : null}
      <div className={styles.buttons}>
        {/* Never disabled by the live check: without JavaScript it cannot rerun after
            the parent shortens a refused note, and the server checks the length anyway
            (3b; re-review of #147). */}
        <button type="submit" disabled={pending}>
          {pending ? "Suggesting…" : conflict ? "Suggest anyway" : "Suggest"}
        </button>
        {/* 3a: leaving writes nothing. */}
        <Link href="/parent/books">Cancel</Link>
      </div>
    </form>
  );
}
