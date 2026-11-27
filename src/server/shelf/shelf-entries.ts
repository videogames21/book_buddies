import "server-only";
import type { ObjectId } from "mongodb";
import { getDb, type Tx } from "@/server/lib/db";
import {
  FINISH_CONFIRMATIONS,
  RATINGS,
  SHELF_CATEGORIES,
  SHELF_ENTRIES,
  type FinishConfirmationDocument,
  type RatingDocument,
  type RatingValue,
  type ShelfCategory,
  type ShelfEntryDocument,
} from "./shelf-collections";

// Shelf's reads of a child's entries, shared by the parent's and the child's views, and
// its reads and writes of single entries for the use cases outside Shelf that act on one
// child's book (UC-PAR-report-book; reused by UC-SHLF-parent-remove-book). Ratings and
// finish confirmations are separate collections, never written here (design/shlf.md,
// "Ratings and finish confirmations are stored apart from the shelf entry").

export type ShelfEntryState = {
  bookId: string;
  category: ShelfCategory;
  /** A confirmation record exists for this child and book, in any category (UC-SHLF-par-finish-book POST-1). */
  confirmed: boolean;
  /** Only for a confirmed book that the child rated: a stray rating row is never shown. */
  rating: RatingValue | null;
};

/**
 * Every entry on the child's shelf, newest move first. The one place both views learn
 * which entries are confirmed, so they cannot disagree. Callers check who is asking.
 */
export async function listEntries(childId: string): Promise<ShelfEntryState[]> {
  const db = getDb();
  const entries = await db
    .collection<ShelfEntryDocument>(SHELF_ENTRIES)
    .find({ childId })
    .sort({ movedAt: -1, bookId: 1 })
    .toArray();
  const bookIds = entries.map((entry) => entry.bookId);

  const [ratings, confirmations] = await Promise.all([
    db
      .collection<RatingDocument>(RATINGS)
      .find(
        { childId, bookId: { $in: bookIds } },
        { projection: { bookId: 1, value: 1 } },
      )
      .toArray(),
    db
      .collection<FinishConfirmationDocument>(FINISH_CONFIRMATIONS)
      .find(
        { childId, bookId: { $in: bookIds } },
        { projection: { bookId: 1 } },
      )
      .toArray(),
  ]);
  const ratingByBook = new Map(ratings.map((r) => [r.bookId, r.value]));
  const confirmedBookIds = new Set(confirmations.map((c) => c.bookId));

  return entries.map(({ bookId, category }) => {
    const confirmed = confirmedBookIds.has(bookId);
    return {
      bookId,
      category,
      confirmed,
      rating: confirmed ? (ratingByBook.get(bookId) ?? null) : null,
    };
  });
}

/** All four categories, always in the fixed order, each keeping the entries' order. */
export function groupByCategory<Entry>(
  entries: readonly { category: ShelfCategory; view: Entry }[],
): { category: ShelfCategory; entries: Entry[] }[] {
  return SHELF_CATEGORIES.map((category) => ({
    category,
    entries: entries
      .filter((entry) => entry.category === category)
      .map((entry) => entry.view),
  }));
}

/**
 * Whether the book is on the child's shelf, in any category. Callers check the child's
 * family first. With `tx` the read joins that transaction's snapshot (UC-PAR-suggest-book 4a).
 */
export async function isOnShelf(
  childId: string,
  bookId: string,
  tx?: Tx,
): Promise<boolean> {
  const entry = await getDb()
    .collection<ShelfEntryDocument>(SHELF_ENTRIES)
    .findOne({ childId, bookId }, { projection: { _id: 1 }, session: tx });
  return entry !== null;
}

/**
 * Deletes the child's shelf entry for the book inside the caller's transaction. Returns
 * the deleted entry's ID, or `null` if there was none: the caller uses that answer as
 * its proof that the book was on the shelf at the moment of the save.
 */
export async function removeShelfEntryInTx(
  tx: Tx,
  childId: string,
  bookId: string,
): Promise<ObjectId | null> {
  const deleted = await getDb()
    .collection<ShelfEntryDocument>(SHELF_ENTRIES)
    .findOneAndDelete(
      { childId, bookId },
      { projection: { _id: 1 }, session: tx },
    );
  return deleted?._id ?? null;
}
