import "server-only";
import { listExcludedBookIds } from "@/server/accounts-family/book-reports";
import { listLatestNoteInterestKeys } from "@/server/accounts-family/parent-notes";
import {
  listRuleCandidates,
  listRuleHistoryTags,
} from "@/server/catalog/rule-candidates";
import { getRuleQuizProfile } from "@/server/child-identity/child-identity";
import type { Tx } from "@/server/lib/db";
import {
  listRecentRatingSignals,
  listRecentShelfSignalBookIds,
} from "@/server/shelf/recommendation-signals";
import type { QuizAnswers } from "@/shared/recommendation/quiz";
import { catalogKeysForInterest } from "./interests";
import { getQuizOnboardingSignals } from "./reading-profiles";
import { rankRuleCandidates } from "./rules";

type QuizRanking =
  | { outcome: "ranked"; bookIds: string[] }
  | { outcome: "profileIncomplete" | "noMatches" };

const ratingWeights = {
  lovedIt: 1,
  likedIt: 1,
  okay: 0,
  notForMe: -1,
} as const;

/**
 * The read and ranking step of a submission. The eventual batch writer checks the
 * child session and takes the child and consent locks before calling this with its
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

  const onboarding = await getQuizOnboardingSignals(childId, tx);
  const noteKeys = await listLatestNoteInterestKeys(childId, tx);
  const shelfBookIds = await listRecentShelfSignalBookIds(childId, tx);
  const ratings = await listRecentRatingSignals(childId, tx);
  const favorites = new Set(onboarding?.favoriteBookIds);
  const history = await listRuleHistoryTags(
    [...favorites, ...shelfBookIds, ...ratings.map(({ bookId }) => bookId)],
    tx,
  );

  const byTag = new Map<string, number>();
  function add(keys: readonly string[], weight: number) {
    for (const key of keys) byTag.set(key, (byTag.get(key) ?? 0) + weight);
  }
  for (const interest of new Set(onboarding?.interests)) {
    add(catalogKeysForInterest(interest), 2);
  }
  for (const id of favorites) add(history.get(id) ?? [], 1);
  add(noteKeys, 1);
  for (const id of shelfBookIds) add(history.get(id) ?? [], 1);
  for (const { bookId, value } of ratings) {
    add(history.get(bookId) ?? [], ratingWeights[value]);
  }

  // The child-reaction owner is not implemented yet. No inference is made
  // from other records in its place.
  const bookIds = rankRuleCandidates(candidates, profile, {
    byTag,
    byLength: new Map(),
    declinedBookIds: new Set(),
  });
  return { outcome: "ranked", bookIds };
}
