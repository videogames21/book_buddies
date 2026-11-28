"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import type { RecommendationListItem } from "@/server/recommendation/reactions";
import {
  DECLINE_REASON_LABELS,
  DECLINE_REASONS,
  REACTION_LABELS,
  REACTIONS,
  type DeclineReason,
  type Reaction,
} from "@/shared/recommendation/reactions";
import styles from "../child.module.css";
import { CHILD_QUIZ_PATH, CHILD_SIGN_IN_PATH } from "../paths";
import { reactToRecommendation } from "./actions";
import list from "./recommendations.module.css";

const EMPTY = "No new picks right now. You can ask again.";
const ALREADY_ON_SHELF = "This book is already on your shelf.";
const MAY_HAVE_SAVED =
  "Your answer may have been saved. Check your shelf, or try again.";

/**
 * UC-REC-kid-review steps 2–8, 3a, 4a, 6a and 7a (design/rec.md, Components). One card
 * per book. Nothing is sent until the child picks Yes, Maybe later, a reason or Skip.
 * After an unconfirmed outcome the page is read again and the refreshed list decides:
 * a book gone from it was answered. No count or position is shown (BR-kid-no-metrics).
 */
export function RecommendationList({
  items,
}: {
  items: RecommendationListItem[];
}) {
  const router = useRouter();
  const inFlight = useRef(false);
  const [sending, setSending] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const [answered, setAnswered] = useState<ReadonlySet<string>>(new Set());
  const [choosingReason, setChoosingReason] = useState<string | null>(null);
  const [messages, setMessages] = useState<ReadonlyMap<string, string>>(
    new Map(),
  );
  const [status, setStatus] = useState<string | null>(null);

  const busy = sending || refreshing;
  const shown = items.filter((item) => !answered.has(item.bookId));

  function setMessage(bookId: string, message: string | null) {
    setMessages((before) => {
      const next = new Map(before);
      if (message === null) next.delete(bookId);
      else next.set(bookId, message);
      return next;
    });
  }

  function leave(bookId: string) {
    setAnswered((before) => new Set(before).add(bookId));
    setChoosingReason(null);
  }

  /** Reads the list and the shelf again (7a); the card stays only if the book is still listed. */
  function refresh() {
    startRefresh(() => {
      router.refresh();
    });
  }

  async function react(
    bookId: string,
    reaction: Reaction,
    declineReason?: DeclineReason,
  ) {
    if (inFlight.current) return;
    inFlight.current = true;
    setSending(true);
    setMessage(bookId, null);
    setStatus(null);
    try {
      const result = await reactToRecommendation({
        bookId,
        reaction,
        ...(declineReason ? { declineReason } : {}),
      });
      if (result.ok) {
        leave(bookId);
        if (result.data.shelf === "alreadyOnShelf") setStatus(ALREADY_ON_SHELF);
        return;
      }
      switch (result.error.code) {
        case "NOT_SIGNED_IN":
        case "NOT_A_CHILD":
          window.location.replace(CHILD_SIGN_IN_PATH);
          return;
        case "BOOK_NOT_IN_LIST":
          // Already answered, or no longer in the list: it leaves with no error.
          leave(bookId);
          refresh();
          return;
        case "OUTCOME_UNKNOWN":
          setMessage(bookId, MAY_HAVE_SAVED);
          setChoosingReason(null);
          refresh();
          return;
        default:
          setMessage(bookId, result.error.message);
      }
    } catch {
      // A network failure or a crash: the transaction may still have committed.
      setMessage(bookId, MAY_HAVE_SAVED);
      setChoosingReason(null);
      refresh();
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  }

  return (
    <>
      <p className={list.status} role="status">
        {status}
      </p>
      {shown.length === 0 ? (
        <>
          <p>{EMPTY}</p>
          <Link
            className={styles.primary}
            href={CHILD_QUIZ_PATH}
            prefetch={false}
          >
            Get recommendations
          </Link>
        </>
      ) : (
        <ul className={list.list}>
          {shown.map((item) => (
            <li key={item.bookId} className={list.card}>
              <h2 className={list.title}>{item.title}</h2>
              <p className={list.author}>by {item.author}</p>
              {item.fromGrownUp && (
                <p className={list.label}>From your grown-up</p>
              )}
              {item.note && <p className={list.note}>{item.note}</p>}
              {/* Shown once the refresh has decided the book is still listed. */}
              {!refreshing && messages.get(item.bookId) && (
                <p className={styles.error} role="alert">
                  {messages.get(item.bookId)}
                </p>
              )}
              {choosingReason === item.bookId ? (
                <div
                  className={list.choices}
                  role="group"
                  aria-label={`Why not ${item.title}?`}
                >
                  {DECLINE_REASONS.map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      className={styles.secondary}
                      disabled={busy}
                      onClick={() => {
                        void react(item.bookId, "notForMe", reason);
                      }}
                    >
                      {DECLINE_REASON_LABELS[reason]}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={styles.secondary}
                    disabled={busy}
                    onClick={() => {
                      void react(item.bookId, "notForMe");
                    }}
                  >
                    Skip
                  </button>
                  <button
                    type="button"
                    className={list.back}
                    disabled={busy}
                    onClick={() => {
                      setChoosingReason(null);
                    }}
                  >
                    Back
                  </button>
                </div>
              ) : (
                <div
                  className={list.choices}
                  role="group"
                  aria-label={`Do you want to read ${item.title}?`}
                >
                  {REACTIONS.map((reaction) => (
                    <button
                      key={reaction}
                      type="button"
                      className={styles.secondary}
                      disabled={busy}
                      onClick={() => {
                        if (reaction === "notForMe") {
                          setChoosingReason(item.bookId);
                          return;
                        }
                        void react(item.bookId, reaction);
                      }}
                    >
                      {REACTION_LABELS[reaction]}
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
