"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  NEW_CHILD_PATH,
  SIGN_IN_PATH,
  SIGN_UP_PATH,
} from "@/app/(parent)/parent/onboarding/paths";
import { confirmConsent } from "./actions";
import styles from "@/app/sign-in/sign-in.module.css";

type Outcome = "confirmed" | "invalid" | "expired" | "failed";

/** The token is in the URL fragment, which the browser never sends to the server. */
function tokenFromFragment(): string {
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  return fragment.get("token") ?? "";
}

export function ConfirmForm() {
  const router = useRouter();
  const inFlight = useRef(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function confirm() {
    if (inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    setOutcome(null);
    try {
      const result = await confirmConsent(tokenFromFragment());
      if (result.ok) {
        if (result.data.next === NEW_CHILD_PATH) {
          router.replace(NEW_CHILD_PATH);
          return;
        }
        setOutcome("confirmed");
      } else if (result.error.code === "LINK_EXPIRED") {
        setOutcome("expired");
      } else if (result.error.code === "LINK_INVALID") {
        setOutcome("invalid");
      } else {
        setOutcome("failed");
      }
    } catch {
      setOutcome("failed");
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  if (outcome === "confirmed") {
    return (
      <div className={styles.form}>
        <p className={styles.brand}>BOOKBUDDIES</p>
        <h1>Consent confirmed</h1>
        <p>
          Thank you. <Link href={SIGN_IN_PATH}>Sign in</Link> to add your child.
        </p>
      </div>
    );
  }
  if (outcome === "expired") {
    return (
      <div className={styles.form}>
        <p className={styles.brand}>BOOKBUDDIES</p>
        <h1>This link has expired</h1>
        <p>
          Your sign-up expired, please{" "}
          <Link href={SIGN_UP_PATH}>start again</Link>.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.form}>
      <p className={styles.brand}>BOOKBUDDIES</p>
      <h1>Confirm your consent</h1>
      <p>Press Confirm to finish giving consent for your family.</p>
      {outcome === "invalid" && (
        <p className={styles.error} role="alert">
          This link no longer works. Use the newest email we sent you. If your
          sign-up expired, please <Link href={SIGN_UP_PATH}>start again</Link>.
          Already have an account? <Link href={SIGN_IN_PATH}>Sign in</Link>.
        </p>
      )}
      {outcome === "failed" && (
        <p className={styles.error} role="alert">
          We couldn&apos;t confirm your consent. Please try again.
        </p>
      )}
      <button
        type="button"
        disabled={submitting}
        onClick={() => {
          void confirm();
        }}
      >
        {submitting ? "Confirming..." : "Confirm"}
      </button>
    </div>
  );
}
