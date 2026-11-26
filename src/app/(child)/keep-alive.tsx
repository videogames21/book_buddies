"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { keepChildSessionAlive } from "./actions";
import { CHILD_SIGN_IN_PATH } from "./child/paths";

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "scroll"] as const;

/**
 * Tells the server every few seconds that a child page is still open, and whether the
 * child touched it since the last time. Closing the page stops it, which ends the visit.
 * Nothing is sent from the sign-in page.
 */
export function KeepAlive({ seconds }: { seconds: number }) {
  const router = useRouter();
  const signingIn = usePathname() === CHILD_SIGN_IN_PATH;

  useEffect(() => {
    if (signingIn) return;
    let active = false;
    const touched = () => {
      active = true;
    };
    // Capture, so a scroll inside any element counts too.
    const options = { capture: true, passive: true };
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, touched, options);
    }

    async function send() {
      const report = active;
      active = false;
      try {
        const result = await keepChildSessionAlive({ active: report });
        if (result.ok) return;
        // Over, or the browser is now signed in as someone else.
        const { code } = result.error;
        if (code === "NOT_SIGNED_IN" || code === "NOT_A_CHILD") {
          router.replace(CHILD_SIGN_IN_PATH);
          return;
        }
      } catch {
        // Offline for a moment; the next one tries again.
      }
      // Not delivered, so the activity is reported next time.
      active ||= report;
    }
    const timer = window.setInterval(() => {
      void send();
    }, seconds * 1000);

    return () => {
      window.clearInterval(timer);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, touched, options);
      }
    };
  }, [signingIn, seconds, router]);

  return null;
}
