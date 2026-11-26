import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireChild } from "@/server/identity-access/sessions";
import { readRulesQuiz } from "@/server/recommendation/quiz-submission";
import { QUIZ_RECEIVED } from "@/shared/recommendation/quiz";
import styles from "../../child.module.css";
import { CHILD_HOME_PATH, CHILD_SIGN_IN_PATH } from "../../paths";
import { submitRecommendationQuiz } from "./actions";
import { QuizForm } from "./quiz-form";

export default async function RecommendationQuizPage() {
  const session = await requireChild({ countsAsActivity: false });
  if (!session.ok) {
    if (session.error.code === "NOT_SIGNED_IN") redirect(CHILD_SIGN_IN_PATH);
    notFound();
  }
  const status = await readRulesQuiz(session.data.childId);
  return (
    <main className={styles.page}>
      <h1>Get recommendations</h1>
      {status.ok ? (
        status.data === "received" ? (
          <p>{QUIZ_RECEIVED}</p>
        ) : (
          <QuizForm
            initialRequestId={randomUUID()}
            submitAction={submitRecommendationQuiz}
          />
        )
      ) : (
        <p role="status">{status.error.message}</p>
      )}
      <Link href={CHILD_HOME_PATH} className={styles.secondary}>
        Back
      </Link>
    </main>
  );
}
