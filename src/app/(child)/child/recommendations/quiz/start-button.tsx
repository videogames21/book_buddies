"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { QUIZ_RECEIVED } from "@/shared/recommendation/quiz";
import styles from "../../child.module.css";
import { CHILD_QUIZ_PATH } from "../../paths";
import { startRecommendationQuiz } from "./actions";

export function StartRecommendationQuizButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();

  async function start() {
    setMessage(undefined);
    setBusy(true);
    try {
      const result = await startRecommendationQuiz();
      if (!result.ok) setMessage(result.error.message);
      else if (result.data === "received") setMessage(QUIZ_RECEIVED);
      else router.push(CHILD_QUIZ_PATH);
    } catch {
      setMessage("We couldn’t open the quiz. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        className={styles.primary}
        disabled={busy}
        type="button"
        onClick={() => {
          void start();
        }}
      >
        Get recommendations
      </button>
      {message && <p role="status">{message}</p>}
    </>
  );
}
