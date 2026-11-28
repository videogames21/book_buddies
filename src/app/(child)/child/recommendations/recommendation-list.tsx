"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
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
 * When a card leaves, keyboard focus moves to the next card's first button, or with no
 * next card to the status line when it has something to say, then to the empty
 * message, then to the card before. Opening the reasons focuses the first reason, and
 * Back focuses that card's Not for me again.
 */
export function RecommendationList({
  items,
}: {
  items: RecommendationListItem[];
}) {
  const router = useRouter();
  const inFlight = useRef(false);
  /** The card the child last answered, and its place, until focus has been placed. */
  const focusAfter = useRef<{ bookId: string; index: number } | null>(null);
  /** The card whose reason step just opened or closed, until focus has been placed. */
  const reasonStepToggled = useRef<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const emptyRef = useRef<HTMLParagraphElement>(null);
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

  // Runs after every render, and acts once the answer and any refresh have settled, so
  // the button it focuses is enabled again.
  useEffect(() => {
    const request = focusAfter.current;
    if (!request || busy) return;
    focusAfter.current = null;
    const cards = listRef.current?.querySelectorAll("li") ?? [];
    const stayed = shown.findIndex((item) => item.bookId === request.bookId);
    if (stayed !== -1) {
      // The card stayed (a failed or unconfirmed save): back to it, to try again.
      cards[stayed]?.querySelector("button")?.focus();
      return;
    }
    const next = cards[request.index]?.querySelector("button");
    if (next) next.focus();
    else if (status) statusRef.current?.focus();
    else if (cards.length === 0) emptyRef.current?.focus();
    else cards[cards.length - 1]?.querySelector("button")?.focus();
  });

  // The reason step swaps the card's buttons, so the focused button is gone.
  useEffect(() => {
    const bookId = reasonStepToggled.current;
    if (!bookId) return;
    reasonStepToggled.current = null;
    const index = shown.findIndex((item) => item.bookId === bookId);
    const card = listRef.current?.querySelectorAll("li")[index];
    const target =
      choosingReason === bookId
        ? card?.querySelector("button")
        : card?.querySelector<HTMLButtonElement>(
            'button[data-reaction="notForMe"]',
          );
    target?.focus();
  });

  /** Opens or closes a card's reason step. */
  function toggleReasonStep(bookId: string, open: boolean) {
    reasonStepToggled.current = bookId;
    setChoosingReason(open ? bookId : null);
  }

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
    focusAfter.current = {
      bookId,
      index: shown.findIndex((item) => item.bookId === bookId),
    };
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
      <p className={list.status} role="status" ref={statusRef} tabIndex={-1}>
        {status}
      </p>
      {shown.length === 0 ? (
        <>
          <p ref={emptyRef} tabIndex={-1}>
            {EMPTY}
          </p>
          <Link
            className={styles.primary}
            href={CHILD_QUIZ_PATH}
            prefetch={false}
          >
            Get recommendations
          </Link>
        </>
      ) : (
        <ul className={list.list} ref={listRef}>
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
                      toggleReasonStep(item.bookId, false);
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
                      data-reaction={reaction}
                      type="button"
                      className={styles.secondary}
                      disabled={busy}
                      onClick={() => {
                        if (reaction === "notForMe") {
                          toggleReasonStep(item.bookId, true);
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
