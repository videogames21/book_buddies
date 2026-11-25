"use client";

import Link from "next/link";
import { useRef, useState, type SubmitEvent } from "react";
import { SIGN_IN_PATH } from "@/app/(parent)/parent/onboarding/paths";
import { requestPasswordReset } from "./actions";
import styles from "@/app/sign-in/sign-in.module.css";

export function ForgotPasswordForm() {
  const inFlight = useRef(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const result = await requestPasswordReset({ email });
      if (result.ok) setSent(true);
      else setError(result.error.message);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className={styles.form}>
        <p className={styles.brand}>BOOKBUDDIES</p>
        <h1>Check your email</h1>
        <p role="status">
          If a parent account uses that email, we have sent a link to reset the
          password. It works for one hour.
        </p>
        <p>
          <Link href={SIGN_IN_PATH}>Back to sign in</Link>
        </p>
      </div>
    );
  }

  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        void submit(event);
      }}
    >
      <p className={styles.brand}>BOOKBUDDIES</p>
      <h1>Forgot your password?</h1>
      <p>Enter your email and we will send you a link to choose a new one.</p>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <label>
        Email
        <input
          type="email"
          name="email"
          autoComplete="email"
          maxLength={254}
          required
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
          }}
        />
      </label>
      <button type="submit" disabled={submitting}>
        {submitting ? "Sending..." : "Send the link"}
      </button>
      <p>
        <Link href={SIGN_IN_PATH}>Back to sign in</Link>
      </p>
    </form>
  );
}
