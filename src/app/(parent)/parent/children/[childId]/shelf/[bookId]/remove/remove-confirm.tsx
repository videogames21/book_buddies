"use client";

import Link from "next/link";
import { useReducer, useRef } from "react";
import { removeBookFromShelf } from "./actions";
import {
  INITIAL_REMOVE_STATE,
  nextRemoveState,
  type ShownError,
  type StopReason,
} from "./remove-state";
import styles from "./remove.module.css";

const STOP_HEADINGS: Record<StopReason, string> = {
  alreadyOffShelf: "Already off the shelf",
  outcomeUnknown: "Check the shelf",
  consentNotConfirmed: "The book was not removed",
  refused: "The book was not removed",
};

function ErrorLine({ error }: { error: ShownError | null }) {
  if (!error) return null;
  return (
    <p className={styles.error} role="alert">
      {error.message}
      {error.errorId ? ` (Error ID: ${error.errorId})` : ""}
    </p>
  );
}

/**
 * UC-SHLF-parent-remove-book steps 3 to 6. Renders the steps of `remove-state.ts` and
 * holds no rule of its own. "Cancel" is a link back to the shelf with no request (3a).
 */
export function RemoveConfirm({
  childId,
  bookId,
  title,
  nickname,
  backPath,
}: {
  childId: string;
  bookId: string;
  title: string;
  nickname: string;
  backPath: string;
}) {
  const [state, dispatch] = useReducer(nextRemoveState, INITIAL_REMOVE_STATE);
  const inFlight = useRef(false);
  const back = <Link href={backPath}>Back to {nickname}’s shelf</Link>;

  async function remove() {
    if (state.step !== "confirm" || inFlight.current) return;
    inFlight.current = true;
    dispatch({ type: "remove" });
    try {
      const result = await removeBookFromShelf({
        childId,
        bookId,
        confirmed: true,
      });
      dispatch({
        type: "result",
        answer: result.ok ? { ok: true } : { ok: false, error: result.error },
      });
    } catch {
      // The request may have reached the server, so this is not "nothing was saved".
      dispatch({
        type: "result",
        answer: {
          ok: false,
          error: {
            code: "OUTCOME_UNKNOWN",
            message:
              "We could not confirm the removal. It may have been saved, so check the shelf before trying again.",
          },
        },
      });
    } finally {
      inFlight.current = false;
    }
  }

  if (state.step === "removed") {
    return (
      <section className={styles.panel} aria-live="polite">
        <h1>Book removed</h1>
        <p>
          {title} was removed from {nickname}’s shelf. {nickname} will be told.
        </p>
        {back}
      </section>
    );
  }

  if (state.step === "stopped") {
    return (
      <section className={styles.panel}>
        <h1>{STOP_HEADINGS[state.reason]}</h1>
        <ErrorLine error={state.error} />
        {back}
      </section>
    );
  }

  const pending = state.step === "pending";
  return (
    <section className={styles.panel}>
      <h1>Remove from shelf?</h1>
      <p>
        Remove <strong>{title}</strong> from <strong>{nickname}</strong>’s
        shelf? {nickname} will be told the book was removed.
      </p>
      <ErrorLine error={pending ? null : state.error} />
      <div className={styles.actions}>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            void remove();
          }}
        >
          {pending ? "Removing…" : "Remove"}
        </button>
        <Link href={backPath}>Cancel</Link>
      </div>
    </section>
  );
}
