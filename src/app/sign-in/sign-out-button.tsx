"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SIGN_IN_PATH } from "@/app/(parent)/parent/onboarding/paths";
import { signOutParent } from "./actions";

/** Sign-out (OI-44), shown on /parent and check-email. */
export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function signOut() {
    setBusy(true);
    setFailed(false);
    try {
      const result = await signOutParent();
      if (result.ok || result.error.code === "NOT_SIGNED_IN") {
        router.replace(SIGN_IN_PATH);
        router.refresh();
        return;
      }
      setFailed(true);
    } catch {
      setFailed(true);
    }
    setBusy(false);
  }

  return (
    <form
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        void signOut();
      }}
    >
      <button type="submit" disabled={busy}>
        {busy ? "Signing out..." : "Sign out"}
      </button>
      {failed && (
        <p role="alert">We couldn&apos;t sign you out. Please try again.</p>
      )}
    </form>
  );
}
