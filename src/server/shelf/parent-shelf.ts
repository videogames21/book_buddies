import "server-only";
import { getChildForFamily } from "@/server/accounts-family/child-accounts";
import { getBooksForShelf } from "@/server/catalog/books";
import type { RatingValue, ShelfCategory } from "./shelf-collections";
import { groupByCategory, listEntries } from "./shelf-entries";

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

  const entries = await listEntries(childId);
  const books = await getBooksForShelf(entries.map((entry) => entry.bookId));
  const bookById = new Map(books.map((book) => [book.id, book]));

  return {
    child: { nickname: child.nickname },
    categories: groupByCategory(
      entries.flatMap(({ bookId, category, confirmed, rating }) => {
        const book = bookById.get(bookId);
        if (!book) return [];
        const { title, author } = book;
        return {
          category,
          view: { bookId, title, author, confirmed, rating },
        };
      }),
    ),
  };
}
