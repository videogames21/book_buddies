"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { RatingValue } from "@/server/shelf/shelf-collections";
import styles from "../../../child.module.css";
import { CHILD_SHELF_PATH, CHILD_SIGN_IN_PATH } from "../../../paths";
import shelf from "../../shelf.module.css";
import { saveRating } from "./actions";
import rate from "./rate.module.css";

export type RateView = {
  bookId: string;
  title: string;
  /** The child's current rating, if any. */
  rating: RatingValue | null;
  nickname: string;
};

// The glossary's labels, in the scale's order. The icons are placeholders until the
// client gives real ones (design/shlf.md, Open questions).
const CHOICES = [
  { value: "lovedIt", label: "Loved it", icon: "😍" },
  { value: "likedIt", label: "Liked it", icon: "🙂" },
  { value: "okay", label: "It was okay", icon: "😐" },
  { value: "notForMe", label: "Not for me", icon: "🙁" },
] as const satisfies readonly {
  value: RatingValue;
  label: string;
  icon: string;
}[];

const TRY_AGAIN = "That didn’t save. Tap your choice again.";

/**
 * Steps 2 to 5 and the 6b thank-you. Nothing is sent until a choice is tapped (2a). The
 * tapped choice stays selected if the save fails, so the child can tap it again (5a).
 * No score, count or other child's rating is shown (BR-kid-no-metrics, §8.2.11).
 */
export function RateForm({ view }: { view: RateView }) {
  const inFlight = useRef(false);
  const [selected, setSelected] = useState<RatingValue | null>(view.rating);
  const [saving, setSaving] = useState(false);
  const [thanked, setThanked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refused, setRefused] = useState<string | null>(null);

  async function choose(value: RatingValue) {
    if (inFlight.current) return;
    inFlight.current = true;
    setSelected(value);
    setSaving(true);
    setThanked(false);
    setError(null);
    try {
      const result = await saveRating({ bookId: view.bookId, rating: value });
      if (result.ok) {
        setSelected(result.data.rating);
        setThanked(true);
      } else {
        const { code, message } = result.error;
        if (code === "NOT_SIGNED_IN" || code === "NOT_A_CHILD") {
          window.location.replace(CHILD_SIGN_IN_PATH);
          return;
        }
        // The book is no longer ratable, or the account cannot save: no retry helps.
        if (
          code === "NOT_RATABLE" ||
          code === "CHILD_NOT_FOUND" ||
          code === "CONSENT_NOT_CONFIRMED"
        ) {
          setRefused(message);
        } else {
          setError(message);
        }
      }
    } catch {
      setError(TRY_AGAIN);
    }
    inFlight.current = false;
    setSaving(false);
  }

  if (refused) {
    return (
      <main className={styles.page}>
        <h1>{view.title}</h1>
        <p role="alert">{refused}</p>
        <Link
          className={styles.secondary}
          href={CHILD_SHELF_PATH}
          prefetch={false}
        >
          Back to My Shelf
        </Link>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <h1>{view.title}</h1>
      <p>How did you feel about this book?</p>
      <ul className={`${shelf.list} ${rate.choices}`}>
        {CHOICES.map((choice) => (
          <li key={choice.value}>
            <button
              type="button"
              className={`${shelf.book} ${rate.choice}`}
              aria-pressed={selected === choice.value}
              disabled={saving}
              onClick={() => {
                void choose(choice.value);
              }}
            >
              <span aria-hidden="true" className={rate.icon}>
                {choice.icon}
              </span>
              <span>{choice.label}</span>
            </button>
          </li>
        ))}
      </ul>
      {error && <p role="alert">{error}</p>}
      {/* 6b for every rating until step 6 is built (OI-2, OI-32, OI-74). */}
      {thanked && <p role="status">Thanks, {view.nickname}!</p>}
      <Link
        className={styles.secondary}
        href={CHILD_SHELF_PATH}
        prefetch={false}
      >
        Done
      </Link>
    </main>
  );
}
