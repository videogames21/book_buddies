"use client";

import { useState, type SubmitEvent } from "react";
import type { ActionResult } from "@/server/lib/action-result";
import {
  QUIZ_LABELS,
  QUIZ_RECEIVED,
  quizAnswersSchema,
  type QuizAnswers,
  type QuizSubmission,
} from "@/shared/recommendation/quiz";
import childStyles from "../../child.module.css";
import styles from "./quiz.module.css";

type Question = keyof QuizAnswers;
type SubmitResult = ActionResult<null>;
const questions = {
  mood: "What kind of story sounds good?",
  length: "How long a book do you want?",
} satisfies Record<Question, string>;

export function QuizForm({
  initialRequestId,
  submitAction,
}: {
  initialRequestId: string;
  submitAction: (submission: QuizSubmission) => Promise<SubmitResult>;
}) {
  const [answers, setAnswers] = useState<Partial<QuizAnswers>>({});
  const [requestId, setRequestId] = useState(initialRequestId);
  const [attempted, setAttempted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [received, setReceived] = useState(false);
  const [invalid, setInvalid] = useState<Question>();
  const [problem, setProblem] = useState<{
    text: string;
    restart?: boolean;
  }>();

  function change<QuestionKey extends Question>(
    question: QuestionKey,
    value: QuizAnswers[QuestionKey],
  ) {
    if (answers[question] === value) return;
    if (attempted) setRequestId(crypto.randomUUID());
    setAttempted(false);
    setAnswers((previous) => ({ ...previous, [question]: value }));
    setInvalid(undefined);
    setProblem(undefined);
  }

  function restart() {
    setAnswers({});
    setRequestId(crypto.randomUUID());
    setAttempted(false);
    setInvalid(undefined);
    setProblem(undefined);
    document.getElementById("quiz-mood-0")?.focus();
  }

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const checked = quizAnswersSchema.safeParse(answers);
    if (!checked.success) {
      const field =
        checked.error.issues[0].path[0] === "length" ? "length" : "mood";
      setInvalid(field);
      setProblem({ text: "Choose one answer for each question." });
      event.currentTarget
        .querySelector<HTMLInputElement>(`input[name="${field}"]`)
        ?.focus();
      return;
    }

    setAttempted(true);
    setBusy(true);
    setProblem(undefined);
    try {
      const result = await submitAction({ ...checked.data, requestId });
      if (result.ok) {
        setReceived(true);
      } else {
        setProblem({
          text: result.error.message,
          restart: result.error.code === "NO_MATCHES",
        });
      }
    } catch {
      setProblem({
        text: "We couldn’t check if that saved. Try sending your choices again.",
      });
    } finally {
      setBusy(false);
    }
  }

  if (received) return <p role="status">{QUIZ_RECEIVED}</p>;

  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        void submit(event);
      }}
      noValidate
    >
      {(Object.keys(questions) as Question[]).map((question) => (
        <fieldset
          key={question}
          className={styles.group}
          disabled={busy}
          aria-invalid={invalid === question || undefined}
          aria-describedby={invalid === question ? "quiz-problem" : undefined}
        >
          <legend>{questions[question]}</legend>
          <div className={styles.options}>
            {Object.entries(QUIZ_LABELS[question]).map(
              ([value, label], index) => (
                <label className={styles.option} key={value}>
                  <input
                    type="radio"
                    name={question}
                    id={`quiz-${question}-${String(index)}`}
                    value={value}
                    required
                    checked={answers[question] === value}
                    onChange={() => {
                      change(question, value as QuizAnswers[typeof question]);
                    }}
                  />
                  {label}
                </label>
              ),
            )}
          </div>
        </fieldset>
      ))}
      {problem && (
        <p id="quiz-problem" role="alert">
          {problem.text}
        </p>
      )}
      {problem?.restart ? (
        <button
          type="button"
          className={childStyles.secondary}
          onClick={restart}
        >
          Start again
        </button>
      ) : (
        <button type="submit" className={childStyles.secondary} disabled={busy}>
          {busy ? "Sending…" : "Send my choices"}
        </button>
      )}
    </form>
  );
}
