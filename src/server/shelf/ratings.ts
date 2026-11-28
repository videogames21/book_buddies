import "server-only";
import { MongoError } from "mongodb";
import {
  getFamilyIdForChild,
  lockChildForWrite,
} from "@/server/accounts-family/child-accounts";
import { lockConsentForWrite } from "@/server/accounts-family/families";
import { findActiveBookIds, getBooksForShelf } from "@/server/catalog/books";
import type { ChildSession } from "@/server/identity-access/sessions";
import { fail, ok, type ActionResult } from "@/server/lib/action-result";
import { now } from "@/server/lib/clock";
import { getDb, type Tx, withTransaction } from "@/server/lib/db";
import { logUnexpectedError } from "@/server/lib/log";
import {
  FINISH_CONFIRMATIONS,
  RATINGS,
  SHELF_ENTRIES,
  type FinishConfirmationDocument,
  type RatingDocument,
  type RatingValue,
  type ShelfEntryDocument,
} from "./shelf-collections";

// UC-SHLF-kid-rate-book (design/shlf.md). The only code that writes `ratings`. The child
// is always the session's, never a parameter (§8.1). Step 6's follow-up books are
// deferred (OI-2, OI-32): nothing here calls Recommendation.

export type RatableBook = {
  bookId: string;
  title: string;
  /** The child's current rating of this book, if any. */
  rating: RatingValue | null;
};

export type RatingErrorCode =
  | "NOT_RATABLE"
  | "CHILD_NOT_FOUND"
  | "CONSENT_NOT_CONFIRMED"
  | "SAVE_FAILED"
  | "OUTCOME_UNKNOWN";

type RefusalCode = Exclude<RatingErrorCode, "SAVE_FAILED" | "OUTCOME_UNKNOWN">;

const ASK_A_GROWN_UP = "Something went wrong. Please ask a grown-up.";

const MESSAGES: Record<RatingErrorCode, string> = {
  NOT_RATABLE: "This book can’t be rated right now.",
  CHILD_NOT_FOUND: ASK_A_GROWN_UP,
  CONSENT_NOT_CONFIRMED: ASK_A_GROWN_UP,
  SAVE_FAILED: "That didn’t save. Tap your choice again.",
  OUTCOME_UNKNOWN:
    "We couldn’t check that it saved. Look at the book on your shelf, or tap your choice again.",
};

/** Ends the transaction with a refusal; it is not transient, so the driver does not rerun it. */
class RatingRefused extends Error {
  constructor(readonly code: RefusalCode) {
    super(code);
  }
}

/** The commit may have applied (5a, save not confirmed). Saving again replaces the same row. */
function isOutcomeUnknown(err: unknown): boolean {
  return (
    err instanceof MongoError &&
    err.hasErrorLabel("UnknownTransactionCommitResult")
  );
}

/** PRE-3: a parent confirmed the finish. With `tx` the read joins that snapshot. */
async function hasFinishConfirmation(
  childId: string,
  bookId: string,
  tx?: Tx,
): Promise<boolean> {
  const found = await getDb()
    .collection<FinishConfirmationDocument>(FINISH_CONFIRMATIONS)
    .findOne({ childId, bookId }, { projection: { _id: 1 }, session: tx });
  return found !== null;
}

/**
 * The rating page's read (steps 1 and 2). `null` for a book that is not on the child's
 * shelf, not in Finished, not confirmed or not active in the Catalog, and for an unknown
 * or malformed ID, so the page gives one 404 for all of them (1a, 1b). The checks are the
 * ones `recordRating` repeats inside its transaction.
 */
export async function getRatableBook(
  childSession: ChildSession,
  bookId: string,
): Promise<RatableBook | null> {
  const { childId } = childSession;
  const entry = await getDb()
    .collection<ShelfEntryDocument>(SHELF_ENTRIES)
    .findOne(
      { childId, bookId, category: "finished" },
      { projection: { _id: 1 } },
    );
  if (!entry || !(await hasFinishConfirmation(childId, bookId))) return null;

  const book = (await getBooksForShelf([bookId])).at(0);
  if (!book) return null;

  const rating = await getDb()
    .collection<RatingDocument>(RATINGS)
    .findOne({ childId, bookId }, { projection: { value: 1 } });
  return { bookId, title: book.title, rating: rating?.value ?? null };
}

/**
 * Steps 4 and 5, and 3a. One transaction (§8.2.8): the child lock, the consent lock, a
 * conditional write on the child's Finished entry, so a move, removal or block of that
 * entry conflicts with this rating and the rerun finds it gone (1a), the confirmation
 * (1b), the book still active, and the upsert that sets the value and `ratedAt`
 * together. The callback may run more than once, so it takes the time inside.
 */
export async function recordRating(
  childSession: ChildSession,
  input: { bookId: string; rating: RatingValue },
): Promise<ActionResult<{ rating: RatingValue }, RatingErrorCode>> {
  const { childId } = childSession;
  const { bookId, rating } = input;
  try {
    await withTransaction(async (tx) => {
      if (!(await lockChildForWrite(tx, childId))) {
        throw new RatingRefused("CHILD_NOT_FOUND");
      }
      const familyId = await getFamilyIdForChild(childId, tx);
      if (!familyId) throw new RatingRefused("CHILD_NOT_FOUND");
      if (!(await lockConsentForWrite(tx, familyId))) {
        throw new RatingRefused("CONSENT_NOT_CONFIRMED");
      }

      const db = getDb();
      const entry = await db
        .collection<ShelfEntryDocument>(SHELF_ENTRIES)
        .updateOne(
          { childId, bookId, category: "finished" },
          { $inc: { writeVersion: 1 } },
          { session: tx },
        );
      if (entry.matchedCount !== 1) throw new RatingRefused("NOT_RATABLE");
      if (!(await hasFinishConfirmation(childId, bookId, tx))) {
        throw new RatingRefused("NOT_RATABLE");
      }
      // No lockActiveBookForWrite: a rating shows the child nothing new (design/shlf.md,
      // "The save checks that the book is active, as the page does").
      if ((await findActiveBookIds([bookId])).length === 0) {
        throw new RatingRefused("NOT_RATABLE");
      }

      await db
        .collection<RatingDocument>(RATINGS)
        .updateOne(
          { childId, bookId },
          { $set: { value: rating, ratedAt: now() } },
          { upsert: true, session: tx },
        );
    });
    return ok({ rating });
  } catch (err) {
    if (err instanceof RatingRefused) return fail(err.code, MESSAGES[err.code]);
    if (isOutcomeUnknown(err)) {
      return fail(
        "OUTCOME_UNKNOWN",
        MESSAGES.OUTCOME_UNKNOWN,
        logUnexpectedError("recordRating", err),
      );
    }
    return fail(
      "SAVE_FAILED",
      MESSAGES.SAVE_FAILED,
      logUnexpectedError("recordRating", err),
    );
  }
}
