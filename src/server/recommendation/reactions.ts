import "server-only";
import { MongoError, ObjectId } from "mongodb";
import { isExcluded } from "@/server/accounts-family/book-reports";
import {
  getChildForFamily,
  getFamilyIdForChild,
  lockChildForWrite,
} from "@/server/accounts-family/child-accounts";
import { lockConsentForWrite } from "@/server/accounts-family/families";
import {
  listSuggestionsForChild,
  removeSuggestionInTx,
} from "@/server/accounts-family/suggestions";
import {
  getBooksForShelf,
  lockActiveBookForWrite,
} from "@/server/catalog/books";
import type { ChildSession } from "@/server/identity-access/sessions";
import { fail, ok, type ActionResult } from "@/server/lib/action-result";
import { now } from "@/server/lib/clock";
import { areParentSuggestionsEnabled } from "@/server/lib/config";
import { getDb, withTransaction, type Tx } from "@/server/lib/db";
import { logUnexpectedError } from "@/server/lib/log";
import { addShelfEntryInTx } from "@/server/shelf/shelf-entries";
import type {
  DeclineReason,
  Reaction,
} from "@/shared/recommendation/reactions";
import { listReleasedBatchesForChild } from "./batches";
import { RECOMMENDATION_REACTIONS } from "./recommendation-reaction-schema";

// UC-REC-kid-review (design/rec.md, Components): the only code that touches
// `recommendationReactions` (§8.2.4). A reaction is one dated document per answer, kept
// as the recommender's input (Key decisions, "Reactions are kept as a dated history").

export type ReactionDocument = {
  _id: ObjectId;
  childId: string;
  bookId: string;
  reaction: Reaction;
  declineReason?: DeclineReason;
  /** The released batches the book was waiting in; empty for a suggestion alone. */
  batchIds: ObjectId[];
  reactedAt: Date;
};

function reactions() {
  return getDb().collection<ReactionDocument>(RECOMMENDATION_REACTIONS);
}

/** One book in the child's recommendation list: book data, and for a suggestion its note and label (§8.2.11). */
export type RecommendationListItem = {
  bookId: string;
  title: string;
  author: string;
  note?: string;
  fromGrownUp?: true;
};

function answeredKey(batchId: string, bookId: string): string {
  return `${batchId}:${bookId}`;
}

/** Each (batch, book) pair that a reaction of the child already names. */
async function listAnswered(
  childId: string,
  batchIds: readonly string[],
  tx?: Tx,
): Promise<Set<string>> {
  if (batchIds.length === 0) return new Set();
  const answered = await reactions()
    .find(
      { childId, batchIds: { $in: batchIds.map((id) => new ObjectId(id)) } },
      { projection: { _id: 0, bookId: 1, batchIds: 1 }, session: tx },
    )
    .toArray();
  return new Set(
    answered.flatMap(({ bookId, batchIds: named }) =>
      named.map((id) => answeredKey(id.toHexString(), bookId)),
    ),
  );
}

/**
 * Steps 1–2 (design/rec.md, Components): the child's recommendation list. Pending
 * suggestions first, as `listSuggestionsForChild` orders and filters them, then the
 * books of released batches that have no reaction naming that batch, newest batch
 * first and in each batch's ranked order. A book that is suggested, or in more than one
 * released batch, appears once, at its first place. Takes the `requireChild()` result,
 * never a bare ID. Throws on any failed read, so the page shows no partial list.
 */
export async function getRecommendationListForChild(
  childSession: ChildSession,
): Promise<RecommendationListItem[]> {
  const { childId } = childSession;
  const suggestions = await listSuggestionsForChild(childSession);
  const batches = await listReleasedBatchesForChild(childId);
  const answered = await listAnswered(
    childId,
    batches.map((batch) => batch.batchId),
  );

  const seen = new Set(suggestions.map((suggestion) => suggestion.bookId));
  const batchBookIds: string[] = [];
  for (const batch of batches) {
    for (const bookId of batch.bookIds) {
      if (seen.has(bookId)) continue;
      if (answered.has(answeredKey(batch.batchId, bookId))) continue;
      seen.add(bookId);
      batchBookIds.push(bookId);
    }
  }
  const books = new Map(
    (await getBooksForShelf(batchBookIds)).map((book) => [book.id, book]),
  );

  return [
    ...suggestions.map(({ bookId, title, author, note }) => ({
      bookId,
      title,
      author,
      ...(note ? { note } : {}),
      fromGrownUp: true as const,
    })),
    ...batchBookIds.flatMap((bookId) => {
      const book = books.get(bookId);
      return book ? [{ bookId, title: book.title, author: book.author }] : [];
    }),
  ];
}

export type RecordReactionInput = {
  bookId: string;
  reaction: Reaction;
  declineReason?: DeclineReason;
};

export type ShelfOutcome = "added" | "alreadyOnShelf" | "none";

type RefusalCode =
  "CHILD_NOT_FOUND" | "CONSENT_NOT_CONFIRMED" | "BOOK_NOT_IN_LIST";

export type RecordReactionCode =
  RefusalCode | "SAVE_FAILED" | "OUTCOME_UNKNOWN";

const MESSAGES: Record<RecordReactionCode, string> = {
  CHILD_NOT_FOUND: "We couldn't find your account. Please ask a grown-up.",
  CONSENT_NOT_CONFIRMED:
    "We can't save answers right now. Please ask a grown-up.",
  BOOK_NOT_IN_LIST: "This book isn't in your list anymore.",
  SAVE_FAILED: "We couldn't save your answer. Please try again.",
  OUTCOME_UNKNOWN:
    "Your answer may have been saved. Check your shelf, or try again.",
};

/** Thrown inside the transaction and mapped after it, so the transaction aborts. */
class ReactionRefused extends Error {
  constructor(readonly code: RefusalCode) {
    super(code);
  }
}

/**
 * Steps 3–7, 4a, 6a and 7a (design/rec.md, Components): one transaction, in the
 * design's order. The child and consent locks come first (§8.2.8,
 * BR-coppa-parental-consent), then the Catalog's same-book write while the book is
 * active (OI-58), so a block or a return to draft conflicts with this reaction. The
 * server works out where the book is: its pending suggestion, counted only while
 * suggestions are enabled, as the list does, and the released batches that hold it with
 * no reaction naming them. A book in neither is `BOOK_NOT_IN_LIST`. Nothing is written
 * to a batch. An error whose commit result is unknown is `OUTCOME_UNKNOWN`; any other
 * error means nothing was committed and is `SAVE_FAILED`. Nothing about the reaction
 * is logged (§8.2.7).
 */
export async function recordReaction(
  childSession: ChildSession,
  input: RecordReactionInput,
): Promise<ActionResult<{ shelf: ShelfOutcome }, RecordReactionCode>> {
  const { childId } = childSession;
  const { bookId, reaction, declineReason } = input;
  try {
    const shelf = await withTransaction(async (tx): Promise<ShelfOutcome> => {
      if (!(await lockChildForWrite(tx, childId))) {
        throw new ReactionRefused("CHILD_NOT_FOUND");
      }
      const familyId = await getFamilyIdForChild(childId, tx);
      if (!familyId) throw new ReactionRefused("CHILD_NOT_FOUND");
      if (!(await lockConsentForWrite(tx, familyId))) {
        throw new ReactionRefused("CONSENT_NOT_CONFIRMED");
      }
      if (!(await lockActiveBookForWrite(tx, bookId))) {
        throw new ReactionRefused("BOOK_NOT_IN_LIST");
      }
      if (await isExcluded(childId, bookId, tx)) {
        throw new ReactionRefused("BOOK_NOT_IN_LIST");
      }
      // Step 7 for a suggestion. With suggestions disabled the list shows none, so none
      // is answered here either.
      const suggested =
        areParentSuggestionsEnabled() &&
        (await removeSuggestionInTx(tx, childId, bookId));
      const holding = (await listReleasedBatchesForChild(childId, tx))
        .filter((batch) => batch.bookIds.includes(bookId))
        .map((batch) => batch.batchId);
      const answered = await listAnswered(childId, holding, tx);
      const batchIds = holding.filter(
        (batchId) => !answered.has(answeredKey(batchId, bookId)),
      );
      if (!suggested && batchIds.length === 0) {
        throw new ReactionRefused("BOOK_NOT_IN_LIST");
      }

      const outcome: ShelfOutcome =
        reaction === "notForMe"
          ? "none"
          : await addShelfEntryInTx(
              tx,
              childId,
              bookId,
              reaction === "yes" ? "readingNow" : "maybeLater",
            );
      await reactions().insertOne(
        {
          _id: new ObjectId(),
          childId,
          bookId,
          reaction,
          ...(reaction === "notForMe" && declineReason
            ? { declineReason }
            : {}),
          batchIds: batchIds.map((id) => new ObjectId(id)),
          reactedAt: now(),
        },
        { session: tx },
      );
      return outcome;
    });
    return ok({ shelf });
  } catch (err) {
    if (err instanceof ReactionRefused) {
      return fail(err.code, MESSAGES[err.code]);
    }
    const errorId = logUnexpectedError("recordReaction", err);
    if (
      err instanceof MongoError &&
      err.hasErrorLabel("UnknownTransactionCommitResult")
    ) {
      return fail("OUTCOME_UNKNOWN", MESSAGES.OUTCOME_UNKNOWN, errorId);
    }
    return fail("SAVE_FAILED", MESSAGES.SAVE_FAILED, errorId);
  }
}

/** The most recent distinct books the quiz reads reactions for (design/rec-field-values.md). */
const SIGNAL_BOOK_LIMIT = 20;

export type ReactionSignal = Pick<
  ReactionDocument,
  "bookId" | "reaction" | "declineReason"
>;

/**
 * The quiz's reaction reader (UC-REC-recommend-quiz-rules; design/rec-field-values.md):
 * the latest reaction per book, by `reactedAt` descending then reaction ID ascending,
 * for the 20 most recent distinct books, newest first, then book ID ascending. Only the
 * given child's, on the quiz's transaction. A failed read throws.
 */
export async function listReactionsForSignals(
  childId: string,
  tx: Tx,
): Promise<ReactionSignal[]> {
  return reactions()
    .aggregate<ReactionSignal>(
      [
        { $match: { childId } },
        { $sort: { reactedAt: -1, _id: 1 } },
        { $group: { _id: "$bookId", latest: { $first: "$$ROOT" } } },
        { $sort: { "latest.reactedAt": -1, _id: 1 } },
        { $limit: SIGNAL_BOOK_LIMIT },
        // A path to a missing field leaves it out, so a decline with no reason has none.
        {
          $project: {
            _id: 0,
            bookId: "$_id",
            reaction: "$latest.reaction",
            declineReason: "$latest.declineReason",
          },
        },
      ],
      { session: tx },
    )
    .toArray();
}

export type ReactionForExport = Pick<
  ReactionDocument,
  "bookId" | "reaction" | "declineReason" | "reactedAt"
>;

/**
 * The reactions part of the "Recommendations/reactions" row of UC-PAR-review-child-data
 * (design/par.md), inside the caller's snapshot transaction: every reaction of the
 * child, newest first, with its decline reason (OI-73). A child outside the family gets
 * none. No caller until that use case is built.
 */
export async function listReactionsForExport(
  familyId: string,
  childId: string,
  tx: Tx,
): Promise<ReactionForExport[]> {
  const child = await getChildForFamily(familyId, childId, tx);
  if (!child) return [];
  return reactions()
    .find<ReactionForExport>(
      { childId },
      {
        projection: {
          _id: 0,
          bookId: 1,
          reaction: 1,
          declineReason: 1,
          reactedAt: 1,
        },
        sort: { reactedAt: -1, _id: 1 },
        session: tx,
      },
    )
    .toArray();
}

/**
 * This file's part of the §8.2.8 deletion contract: every reaction of the child. It is
 * in `child-deletion.ts`'s list (UC-PAR-delete-kid-account), and UC-PAR-delete-child-data
 * and the inactivity purge call it too.
 */
export async function deleteChildRecords(
  tx: Tx,
  childId: string,
): Promise<void> {
  await reactions().deleteMany({ childId }, { session: tx });
}
