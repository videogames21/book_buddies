"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type SubmitEvent } from "react";
import {
  FORGOT_PASSWORD_PATH,
  SIGN_UP_PATH,
} from "@/app/(parent)/parent/onboarding/paths";
import { signInParent } from "./actions";
import styles from "./sign-in.module.css";

export function SignInForm({ passwordChanged }: { passwordChanged: boolean }) {
  const router = useRouter();
  const inFlight = useRef(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const result = await signInParent({ email, password });
      if (result.ok) {
        router.replace("/parent");
        return;
      }
      setPassword("");
      setError(result.error.message);
    } catch {
      setError("We couldn't sign you in. Please try again.");
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        void submit(event);
      }}
    >
      <p className={styles.brand}>BOOKBUDDIES</p>
      <h1>Parent sign in</h1>
      {passwordChanged && !error && (
        <p role="status">
          Your password was changed. Sign in with your new password.
        </p>
      )}
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
      <label>
        Password
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          maxLength={128}
          required
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
          }}
        />
      </label>
      <button type="submit" disabled={submitting}>
        {submitting ? "Signing in..." : "Sign in"}
      </button>
      <p>
        <Link href={FORGOT_PASSWORD_PATH}>Forgot password?</Link>
      </p>
      <p>
        New to BookBuddies? <Link href={SIGN_UP_PATH}>Create Account</Link>
      </p>
    </form>
  );
}
