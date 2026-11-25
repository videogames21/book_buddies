"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type SubmitEvent } from "react";
import {
  FORGOT_PASSWORD_PATH,
  PASSWORD_CHANGED_FLAG,
  SIGN_IN_PATH,
} from "@/app/(parent)/parent/onboarding/paths";
import { resetPassword } from "./actions";
import styles from "@/app/sign-in/sign-in.module.css";

/** The token is in the URL fragment, which the browser never sends to the server. */
function tokenFromFragment(): string {
  return new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "";
}

export function ResetForm() {
  const router = useRouter();
  const inFlight = useRef(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<"invalid" | "weak" | "failed" | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const result = await resetPassword({
        token: tokenFromFragment(),
        password,
      });
      if (result.ok) {
        router.replace(`${SIGN_IN_PATH}?${PASSWORD_CHANGED_FLAG}=1`);
        return;
      }
      setError(
        result.error.code === "RESET_LINK_INVALID"
          ? "invalid"
          : result.error.code === "WEAK_PASSWORD"
            ? "weak"
            : "failed",
      );
    } catch {
      setError("failed");
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
      <h1>Choose a new password</h1>
      {error === "invalid" && (
        <p className={styles.error} role="alert">
          This link no longer works.{" "}
          <Link href={FORGOT_PASSWORD_PATH}>Ask for a new one</Link>.
        </p>
      )}
      {error === "weak" && (
        <p className={styles.error} role="alert">
          Use 8 to 128 characters, and not your email address.
        </p>
      )}
      {error === "failed" && (
        <p className={styles.error} role="alert">
          We couldn&apos;t change your password. Please try again.
        </p>
      )}
      <label>
        New password
        <input
          type="password"
          name="password"
          autoComplete="new-password"
          maxLength={128}
          required
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
          }}
        />
      </label>
      <button type="submit" disabled={submitting}>
        {submitting ? "Saving..." : "Save new password"}
      </button>
    </form>
  );
}
