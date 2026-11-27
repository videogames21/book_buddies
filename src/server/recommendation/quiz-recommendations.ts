import "server-only";
import { listExcludedBookIds } from "@/server/accounts-family/book-reports";
import { listLatestNoteInterestKeys } from "@/server/accounts-family/parent-notes";
import {
  interestKeys,
  listRuleCandidates,
  listRuleHistoryTags,
} from "@/server/catalog/rule-candidates";
import { getRuleQuizProfile } from "@/server/child-identity/child-identity";
import type { Tx } from "@/server/lib/db";
import {
  listRecentRatingSignals,
  listRecentShelfSignalBookIds,
} from "@/server/shelf/recommendation-signals";
import type { LENGTHS } from "@/shared/catalog/tags";
import type { QuizAnswers } from "@/shared/recommendation/quiz";
import type { DeclineReason } from "@/shared/recommendation/reactions";
import { listReactionsForSignals } from "./reactions";
import { getQuizOnboardingWeights } from "./reading-profiles";
import { rankRuleCandidates } from "./rules";

type BookLength = (typeof LENGTHS)[number];

type QuizRanking =
  | { outcome: "ranked"; bookIds: string[] }
  | { outcome: "profileIncomplete" | "noMatches" };

/** A difficulty or length decline gives +1 to the opposite length only. */
const declineLengths: Partial<Record<DeclineReason, BookLength>> = {
  tooEasy: "longer story",
  tooHard: "quick read",
};

const ratingWeights = {
  lovedIt: 1,
  likedIt: 1,
  okay: 0,
  notForMe: -1,
} as const;

/**
 * The read and ranking step of a submission. The server action checks the
 * child session and the batch writer takes the child and consent locks before calling this with its
 * transaction. Owner read errors propagate so a failed read can never save a batch.
 */
export async function rankQuizBooks(
  childId: string,
  answers: QuizAnswers,
  tx: Tx,
): Promise<QuizRanking> {
  const profile = await getRuleQuizProfile(childId, tx);
  if (!profile) return { outcome: "profileIncomplete" };

  const excluded = await listExcludedBookIds(childId, tx);
  const candidates = await listRuleCandidates(
    profile.age,
    answers,
    excluded,
    tx,
  );
  if (candidates.length === 0) return { outcome: "noMatches" };

  const byTag = await getQuizOnboardingWeights(childId, tx);
  const noteKeys = await listLatestNoteInterestKeys(childId, tx);
  const shelfBookIds = await listRecentShelfSignalBookIds(childId, tx);
  const ratings = await listRecentRatingSignals(childId, tx);
  const reactions = await listReactionsForSignals(childId, tx);
  const history = await listRuleHistoryTags(
    [
      ...shelfBookIds,
      ...ratings.map(({ bookId }) => bookId),
      ...reactions.map(({ bookId }) => bookId),
    ],
    tx,
  );

  function add(keys: readonly string[], weight: number) {
    for (const key of keys) byTag.set(key, (byTag.get(key) ?? 0) + weight);
  }
  add(noteKeys, 1);
  for (const id of shelfBookIds) add(interestKeys(history.get(id)), 1);
  for (const { bookId, value } of ratings) {
    add(interestKeys(history.get(bookId)), ratingWeights[value]);
  }

  // The latest reaction per book (design/rec-field-values.md, ranking signals).
  const byLength = new Map<BookLength, number>();
  const declinedBookIds = new Set<string>();
  for (const { bookId, reaction, declineReason } of reactions) {
    const tags = history.get(bookId);
    if (reaction === "yes") add(interestKeys(tags), 2);
    if (reaction === "maybeLater") add(interestKeys(tags), 1);
    if (reaction !== "notForMe") continue;
    declinedBookIds.add(bookId);
    if (declineReason === "notInterested" && tags) {
      add(tags.subjects.length > 0 ? tags.subjects : tags.genres, -2);
    }
    if (declineReason === "notMyStyle" && tags) add(tags.genres, -2);
    const length = declineReason && declineLengths[declineReason];
    if (length) byLength.set(length, (byLength.get(length) ?? 0) + 1);
  }

  const bookIds = rankRuleCandidates(candidates, profile, {
    byTag,
    byLength,
    declinedBookIds,
  });
  return { outcome: "ranked", bookIds };
}
