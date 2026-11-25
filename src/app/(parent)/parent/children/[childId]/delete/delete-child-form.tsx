"use client";

import Link from "next/link";
import { useState, type SubmitEvent } from "react";
import { deleteChildAccount } from "./actions";
import styles from "./delete-child.module.css";

// UC-PAR-delete-kid-account: the statement of step 2, the two fields of step 3, and the
// confirmation of step 7. The server checks everything; this form only sends it.
export function DeleteChildForm({
  childId,
  nickname,
}: {
  childId: string;
  nickname: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);

  if (deleted) {
    return (
      <section className={styles.done} aria-live="polite">
        <h2>The account was deleted</h2>
        <p>The account and all of the child’s information have been deleted.</p>
        <Link href="/parent">Back to home</Link>
      </section>
    );
  }

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    const result = await deleteChildAccount({
      childId,
      password: form.get("password"),
      nickname: form.get("nickname"),
    });
    setPending(false);
    if (result.ok) {
      setDeleted(true);
    } else {
      setError(
        result.error.errorId
          ? `${result.error.message} (Error ID: ${result.error.errorId})`
          : result.error.message,
      );
    }
  }

  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        void onSubmit(event);
      }}
    >
      <div className={styles.warning}>
        <p>
          This deletes {nickname}’s account and all of {nickname}’s information.
          It cannot be undone, and {nickname} will no longer be able to sign in.
        </p>
      </div>
      <label>
        Your password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </label>
      <label>
        Type {nickname} to confirm
        <input name="nickname" type="text" autoComplete="off" required />
      </label>
      {error ? (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={pending}>
        {pending ? "Deleting…" : "Delete this child’s account"}
      </button>
      <Link href="/parent">Cancel</Link>
    </form>
  );
}
