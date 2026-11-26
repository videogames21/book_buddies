"use client";

import Link from "next/link";
import { useReducer, useRef, useState } from "react";
import {
  REPORT_COMMENT_MAX_LENGTH,
  REPORT_REASON_LABELS,
  REPORT_REASONS,
} from "@/shared/accounts-family/book-report";
import { reportBook } from "../../../report-book/actions";
import {
  confirmedInput,
  INITIAL_REPORT_FORM,
  reportFormReducer,
  type ShownError,
} from "./report-form-state";
import styles from "./report.module.css";

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
 * UC-PAR-report-book steps 3 to 8. The form and the confirmation are two screens in the
 * browser; nothing is sent until "Confirm" (step 6). Shared with the batch entry page,
 * which `UC-REC-parent-review` builds.
 */
export function ReportForm({
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
  const [state, dispatch] = useReducer(reportFormReducer, INITIAL_REPORT_FORM);
  const inFlight = useRef(false);
  const [sending, setSending] = useState(false);

  async function confirm() {
    const input = confirmedInput(state, childId, bookId);
    if (!input || inFlight.current) return;
    inFlight.current = true;
    setSending(true);
    try {
      const result = await reportBook(input);
      dispatch({
        type: "result",
        answer: result.ok ? { ok: true } : { ok: false, error: result.error },
      });
    } catch {
      dispatch({
        type: "result",
        answer: {
          ok: false,
          error: {
            code: "OUTCOME_UNKNOWN",
            message:
              "We couldn't reach BookBuddies, so we don't know whether the report was sent. Check your child's shelf before trying again.",
          },
        },
      });
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  }

  if (state.screen === "sent") {
    return (
      <section className={styles.panel} aria-live="polite">
        <h1>Report sent</h1>
        <p>
          Thank you. {title} will no longer appear for {nickname}.
        </p>
        <Link href={backPath}>Back to {nickname}’s shelf</Link>
      </section>
    );
  }

  if (state.screen === "stopped") {
    return (
      <section className={styles.panel}>
        <h1>
          {state.reason === "alreadyReported"
            ? "Already reported"
            : state.reason === "outcomeUnknown"
              ? "Check the shelf"
              : "The report was not sent"}
        </h1>
        <ErrorLine error={state.error} />
        <Link href={backPath}>Back to {nickname}’s shelf</Link>
      </section>
    );
  }

  if (state.screen === "confirm") {
    return (
      <section className={styles.panel}>
        <h1>Send this report?</h1>
        <ul className={styles.warning}>
          <li>This report is final. It cannot be undone.</li>
          <li>
            {title} will no longer appear for {nickname}, and will be taken off
            their shelf.
          </li>
          <li>Sending a false report may be punished.</li>
        </ul>
        <ErrorLine error={state.error} />
        <div className={styles.actions}>
          <button
            type="button"
            disabled={sending}
            onClick={() => {
              void confirm();
            }}
          >
            {sending ? "Sending…" : "Confirm"}
          </button>
          <button
            type="button"
            className={styles.secondary}
            disabled={sending}
            onClick={() => {
              dispatch({ type: "back" });
            }}
          >
            Go back
          </button>
        </div>
      </section>
    );
  }

  const { draft } = state;
  return (
    <form
      className={styles.panel}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        dispatch({ type: "continue" });
      }}
    >
      <h1>Report a book</h1>
      <p>
        Reporting <strong>{title}</strong> for <strong>{nickname}</strong>.
      </p>
      <fieldset>
        <legend>Reason</legend>
        {REPORT_REASONS.map((value) => (
          <label key={value} className={styles.choice}>
            <input
              type="radio"
              name="reason"
              value={value}
              checked={draft.reason === value}
              onChange={() => {
                dispatch({ type: "edit", draft: { ...draft, reason: value } });
              }}
            />
            {REPORT_REASON_LABELS[value]}
          </label>
        ))}
      </fieldset>
      <label className={styles.comment}>
        Comment (optional)
        <span className={styles.hint}>
          Please don’t include your child’s name or other details about them.
          Our team reads this comment.
        </span>
        <textarea
          rows={4}
          maxLength={REPORT_COMMENT_MAX_LENGTH}
          value={draft.comment}
          onChange={(event) => {
            dispatch({
              type: "edit",
              draft: { ...draft, comment: event.target.value },
            });
          }}
        />
      </label>
      <ErrorLine error={state.error} />
      <div className={styles.actions}>
        <button type="submit">Continue</button>
        <Link href={backPath}>Cancel</Link>
      </div>
    </form>
  );
}
