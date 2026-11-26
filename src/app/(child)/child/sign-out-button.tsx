"use client";

import { useState } from "react";
import styles from "./child.module.css";
import { CHILD_SIGN_IN_PATH } from "./paths";
import { signOutChild } from "./sign-in/actions";

export function SignOutButton() {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function signOut() {
    setBusy(true);
    setFailed(false);
    try {
      const result = await signOutChild();
      if (result.ok || result.error.code === "NOT_SIGNED_IN") {
        // A full load drops the router's cache, so Back cannot show a child page.
        window.location.replace(CHILD_SIGN_IN_PATH);
        return;
      }
      setFailed(true);
    } catch {
      setFailed(true);
    }
    setBusy(false);
  }

  return (
    <>
      <button
        type="button"
        className={styles.secondary}
        disabled={busy}
        onClick={() => {
          void signOut();
        }}
      >
        Sign out
      </button>
      {failed && (
        <p role="alert">That didn’t work. Try again or ask a grown-up.</p>
      )}
    </>
  );
}
