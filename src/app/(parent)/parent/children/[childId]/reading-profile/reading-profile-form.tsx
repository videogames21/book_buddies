"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type SubmitEvent } from "react";
import type { PickerBook } from "@/server/catalog/books";
import { saveReadingProfile } from "./actions";
import { onboardingCompletePath } from "./paths";
import {
  firstErrorCode,
  MAX_FAVORITE_BOOKS,
  READING_PROFILE_MESSAGES,
  readingProfileSchema,
} from "./schema";
import styles from "./reading-profile.module.css";

type InterestOption = { key: string; label: string };

// Placeholder notice, to be replaced by the client's text (design/rec.md, Components).
// One small component, so swapping in the real notice changes nothing else.
function PrivacyNoticeBlock({
  privacyNoticeUrl,
  agreed,
  onAgreedChange,
}: {
  privacyNoticeUrl: string;
  agreed: boolean;
  onAgreedChange: (agreed: boolean) => void;
}) {
  return (
    <section className={styles.notice} aria-labelledby="notice-heading">
      <h2 id="notice-heading">Privacy notice</h2>
      <p>
        We collect your child’s reading interests and favorite books. We use
        them only to recommend books. You can review and delete them at any
        time. Read the full{" "}
        {/* Opens in a new tab, so the parent's choices stay on this page. Same
            location as the Add a child form. */}
        <a href={privacyNoticeUrl} target="_blank" rel="noopener noreferrer">
          privacy notice
        </a>
        .
      </p>
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={agreed}
          onChange={(event) => {
            onAgreedChange(event.target.checked);
          }}
        />
        I have read this notice and agree to share this information about my
        child
      </label>
    </section>
  );
}

export function ReadingProfileForm({
  childId,
  interests,
  books,
  privacyNoticeUrl,
}: {
  childId: string;
  interests: InterestOption[];
  books: PickerBook[];
  privacyNoticeUrl: string;
}) {
  const inFlight = useRef(false);
  const router = useRouter();
  // Every selection lives here, so it survives a failed save (5a).
  const [chosenInterests, setChosenInterests] = useState<string[]>([]);
  const [chosenBooks, setChosenBooks] = useState<string[]>([]);
  // Held in the form only and never stored: consent is already recorded by PAR.
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || !agreed) return;
    const input = {
      childId,
      interests: chosenInterests,
      favoriteBookIds: chosenBooks,
    };
    const parsed = readingProfileSchema.safeParse(input);
    if (!parsed.success) {
      setError(READING_PROFILE_MESSAGES[firstErrorCode(parsed.error)]);
      return;
    }
    setError(null);
    inFlight.current = true;
    setSubmitting(true);
    try {
      const result = await saveReadingProfile(input);
      if (result.ok) {
        router.push(onboardingCompletePath(childId)); // step 6
        return;
      }
      inFlight.current = false;
      setError(
        result.error.errorId
          ? `${result.error.message} (Error ID: ${result.error.errorId})`
          : result.error.message,
      );
    } catch {
      inFlight.current = false;
      setError("We couldn't save the reading profile. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={(event) => {
        void onSubmit(event);
      }}
    >
      <h1>Reading profile</h1>
      <p className={styles.hint}>
        Choose what your child likes to read. Everything here is optional.
      </p>

      <fieldset>
        <legend>Reading interests</legend>
        {interests.map((option) => (
          <label key={option.key} className={styles.check}>
            <input
              type="checkbox"
              checked={chosenInterests.includes(option.key)}
              onChange={() => {
                setChosenInterests((list) => toggle(list, option.key));
              }}
            />
            {option.label}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>Favorite books already read</legend>
        <p className={styles.hint}>
          Choose up to {MAX_FAVORITE_BOOKS}. {chosenBooks.length} chosen.
        </p>
        {books.length === 0 ? (
          <p className={styles.hint}>No books are available to choose yet.</p>
        ) : (
          <div className={styles.books}>
            {books.map((book) => (
              <label key={book.id} className={styles.check}>
                <input
                  type="checkbox"
                  checked={chosenBooks.includes(book.id)}
                  onChange={() => {
                    setChosenBooks((list) => toggle(list, book.id));
                  }}
                />
                {book.title}{" "}
                <span className={styles.hint}>by {book.author}</span>
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <PrivacyNoticeBlock
        privacyNoticeUrl={privacyNoticeUrl}
        agreed={agreed}
        onAgreedChange={setAgreed}
      />

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <div className={styles.actions}>
        <button type="submit" disabled={submitting || !agreed}>
          {submitting ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
