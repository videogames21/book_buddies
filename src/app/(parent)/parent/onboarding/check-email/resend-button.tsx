"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { PARENT_HOME_PATH } from "../paths";
import { resendConsentEmail } from "./actions";
import styles from "@/app/sign-in/sign-in.module.css";

type Notice = "sent" | "not-sent" | "failed";

/** 6b: sends a new link, which replaces the earlier one. 5b shows "not-sent" at once. */
export function ResendButton({ notSentAtStart }: { notSentAtStart: boolean }) {
  const router = useRouter();
  const inFlight = useRef(false);
  const [notice, setNotice] = useState<Notice | null>(
    notSentAtStart ? "not-sent" : null,
  );
  const [sending, setSending] = useState(false);

  async function resend() {
    if (inFlight.current) return;
    inFlight.current = true;
    setSending(true);
    try {
      const result = await resendConsentEmail();
      if (result.ok) {
        setNotice("sent");
      } else if (result.error.code === "SEND_FAILED") {
        setNotice("not-sent");
      } else if (
        result.error.code === "ALREADY_CONFIRMED" ||
        result.error.code === "SIGN_UP_EXPIRED"
      ) {
        router.replace(PARENT_HOME_PATH);
        router.refresh();
      } else {
        setNotice("failed");
      }
    } catch {
      setNotice("failed");
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  }

  return (
    <>
      {notice === "not-sent" && (
        <p className={styles.error} role="alert">
          We couldn&apos;t send the email. Your account is saved. Press Send it
          again to try once more.
        </p>
      )}
      {notice === "failed" && (
        <p className={styles.error} role="alert">
          Something went wrong. Please try again.
        </p>
      )}
      {notice === "sent" && (
        <p role="status">
          We sent a new email. Use the link in the newest one; earlier links no
          longer work.
        </p>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void resend();
        }}
      >
        <button type="submit" disabled={sending}>
          {sending ? "Sending..." : "Send it again"}
        </button>
      </form>
    </>
  );
}
