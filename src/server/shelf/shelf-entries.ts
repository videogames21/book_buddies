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
  type ShelfEntryDocument,
} from "./shelf-collections";

// Shelf's reads and writes of single shelf entries, for the use cases outside Shelf that
// act on one child's book (UC-PAR-report-book; reused by UC-SHLF-parent-remove-book).
// Ratings and finish confirmations are separate collections and are never touched here
// (design/shlf.md, "Ratings and finish confirmations are stored apart from the shelf entry").

/** Whether the book is on the child's shelf. Callers check the child's family first. */
export async function isOnShelf(
  childId: string,
  bookId: string,
): Promise<boolean> {
  const entry = await getDb()
    .collection<ShelfEntryDocument>(SHELF_ENTRIES)
    .findOne({ childId, bookId }, { projection: { _id: 1 } });
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

/** Shared shelf order, visibility, confirmation and rating rules for both views. */
export async function listShelfCategories<Book extends { id: string }>(
  childId: string,
  readBooks: (bookIds: string[]) => Promise<Book[]>,
) {
  const db = getDb();
  const entries = await db
    .collection<ShelfEntryDocument>(SHELF_ENTRIES)
    .find({ childId })
    .sort({ movedAt: -1, bookId: 1 })
    .toArray();
  const bookIds = entries.map(({ bookId }) => bookId);
  const filter = { childId, bookId: { $in: bookIds } };
  const [books, ratings, confirmations] = await Promise.all([
    readBooks(bookIds),
    db
      .collection<RatingDocument>(RATINGS)
      .find(filter, { projection: { bookId: 1, value: 1 } })
      .toArray(),
    db
      .collection<FinishConfirmationDocument>(FINISH_CONFIRMATIONS)
      .find(filter, { projection: { bookId: 1 } })
      .toArray(),
  ]);

  const byId = new Map(books.map((book) => [book.id, book]));
  const ratingById = new Map(
    ratings.map(({ bookId, value }) => [bookId, value]),
  );
  const confirmedIds = new Set(confirmations.map(({ bookId }) => bookId));
  const grouped = SHELF_CATEGORIES.map((category) => ({
    category,
    entries: [] as {
      book: Book;
      confirmed: boolean;
      rating: RatingValue | null;
    }[],
  }));
  const byCategory = new Map(
    grouped.map(({ category, entries }) => [category, entries]),
  );
  for (const entry of entries) {
    const book = byId.get(entry.bookId);
    if (!book) continue;
    const confirmed = confirmedIds.has(entry.bookId);
    byCategory.get(entry.category)?.push({
      book,
      confirmed,
      rating: confirmed ? (ratingById.get(entry.bookId) ?? null) : null,
    });
  }
  return grouped;
}
