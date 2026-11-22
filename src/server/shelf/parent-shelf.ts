import "server-only";
import { getChildForFamily } from "@/server/accounts-family/child-accounts";
import { getBooksForShelf } from "@/server/catalog/books";
import { getDb } from "@/server/lib/db";
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

// UC-SHLF-parent-view-shelf (design/shlf.md). Read-only: nothing here writes (POST-2).

/** One shelf entry as the parent sees it. No dates, counts or IDs of any parent (BR-kid-no-metrics). */
export type ShelfBookView = {
  bookId: string;
  title: string;
  author: string;
  /** A confirmation record exists for this child and book, in any category (UC-SHLF-par-finish-book POST-1). */
  confirmed: boolean;
  /** Shown only for a confirmed book that the child rated. */
  rating: RatingValue | null;
};

export type ParentShelfView = {
  child: { nickname: string };
  /** All four categories, always in the fixed order, each newest move first. */
  categories: { category: ShelfCategory; entries: ShelfBookView[] }[];
};

/**
 * Step 2 of the use case. The child is checked against the caller's family first, so
 * another family's child, an unknown ID and a malformed ID all give `null` (2c). Any
 * failed read throws and no partial shelf is returned (2b). A shelf entry whose book the
 * Catalog does not return (blocked, draft or gone) is left out and the rest is shown (5b).
 */
export async function getShelfForParent(
  familyId: string,
  childId: string,
): Promise<ParentShelfView | null> {
  const child = await getChildForFamily(familyId, childId);
  if (!child) return null;

  const db = getDb();
  const entries = await db
    .collection<ShelfEntryDocument>(SHELF_ENTRIES)
    .find({ childId })
    .sort({ movedAt: -1, bookId: 1 })
    .toArray();
  const bookIds = entries.map((entry) => entry.bookId);

  const [books, ratings, confirmations] = await Promise.all([
    getBooksForShelf(bookIds),
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

  const bookById = new Map(books.map((book) => [book.id, book]));
  const ratingByBook = new Map(ratings.map((r) => [r.bookId, r.value]));
  const confirmedBookIds = new Set(confirmations.map((c) => c.bookId));

  const grouped = new Map<ShelfCategory, ShelfBookView[]>(
    SHELF_CATEGORIES.map((category) => [category, []]),
  );
  for (const entry of entries) {
    const book = bookById.get(entry.bookId);
    if (!book) continue;
    const confirmed = confirmedBookIds.has(entry.bookId);
    grouped.get(entry.category)?.push({
      bookId: entry.bookId,
      title: book.title,
      author: book.author,
      confirmed,
      // A rating needs a confirmation: a stray rating row is never shown.
      rating: confirmed ? (ratingByBook.get(entry.bookId) ?? null) : null,
    });
  }

  return {
    child: { nickname: child.nickname },
    categories: SHELF_CATEGORIES.map((category) => ({
      category,
      entries: grouped.get(category) ?? [],
    })),
  };
}
