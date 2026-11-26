"use client";

import { useRef, useState, type SubmitEvent } from "react";
import styles from "../child.module.css";
import { CHILD_HOME_PATH } from "../paths";
import { signInChild } from "./actions";
import {
  CHILD_SIGN_IN_PROBLEMS,
  childSignInProblem,
  childSignInSchema,
} from "./schema";

// No link to any parent page.
export function ChildSignInForm() {
  const inFlight = useRef(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const parsed = childSignInSchema.safeParse({ username, password });
    if (!parsed.success) {
      setError(CHILD_SIGN_IN_PROBLEMS[childSignInProblem(parsed.error)]);
      return;
    }
    inFlight.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const result = await signInChild({ username, password });
      if (result.ok) {
        // A full load, so nothing of this form stays on the page.
        window.location.replace(CHILD_HOME_PATH);
        return;
      }
      setPassword("");
      setError(result.error.message);
    } catch {
      setError("That didn’t work. Try again or ask a grown-up.");
    }
    inFlight.current = false;
    setSubmitting(false);
  }

  return (
    // `post`, so a submit before the script has loaded never puts the password in the
    // address.
    <form
      className={styles.form}
      method="post"
      onSubmit={(event) => {
        void submit(event);
      }}
    >
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <label>
        Username
        <input
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={username}
          onChange={(event) => {
            setUsername(event.target.value);
          }}
        />
      </label>
      <label>
        Password
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          autoCapitalize="none"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
          }}
        />
      </label>
      <button className={styles.primary} type="submit" disabled={submitting}>
        {submitting ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
