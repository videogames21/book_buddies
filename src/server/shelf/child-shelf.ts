import "server-only";
import { getBooksForShelf } from "@/server/catalog/books";
import {
  peekUnseenChildNotices,
  type ChildNoticeKind,
} from "@/server/notification/child-notices";
import type { RatingValue, ShelfCategory } from "./shelf-collections";
import { groupByCategory, listEntries } from "./shelf-entries";

// UC-SHLF-kid-view-shelf (design/shlf.md). Read-only: nothing here writes, so loading
// the shelf leaves every notice unseen (POST-2). Nothing here is a count, date, reading
// level or ID of any person (BR-kid-no-metrics, §8.2.11).

export type ChildShelfAction = "move" | "remove" | "rate";

export type ChildShelfEntry = {
  bookId: string;
  title: string;
  author: string;
  /** Only for a book in a series. */
  seriesName?: string;
  confirmed: boolean;
  /** The child's own, and only for a confirmed book. */
  rating: RatingValue | null;
  /** What the book's state allows (5a); the screen offers nothing else. */
  actions: ChildShelfAction[];
};

export type ChildShelfNotice = {
  id: string;
  kind: ChildNoticeKind;
  /** A removed book's title, when the Catalog still returns the book (3f). */
  title?: string;
};

export type ChildShelfView = {
  /** All four categories, always in the fixed order, each newest move first. */
  categories: { category: ShelfCategory; entries: ChildShelfEntry[] }[];
  notices: ChildShelfNotice[];
  /** 2a: there is no book to show. */
  showFindBookMessage: boolean;
};

/**
 * Step 2 of the use case. `childId` is the one from the child's own session, never from a
 * request. Any failed read throws, so no partial shelf is returned (2b). A book the
 * Catalog does not return, such as a blocked one, is left out (3b).
 */
export async function getShelfForChild(
  childId: string,
): Promise<ChildShelfView> {
  const [entries, notices] = await Promise.all([
    listEntries(childId),
    peekUnseenChildNotices(childId),
  ]);
  const books = await getBooksForShelf([
    ...entries.map((entry) => entry.bookId),
    ...notices.flatMap((notice) => notice.bookId ?? []),
  ]);
  const bookById = new Map(books.map((book) => [book.id, book]));

  const shown = entries.flatMap(({ bookId, category, confirmed, rating }) => {
    const book = bookById.get(bookId);
    if (!book) return [];
    const view: ChildShelfEntry = {
      bookId,
      title: book.title,
      author: book.author,
      ...(book.seriesName && { seriesName: book.seriesName }),
      confirmed,
      rating,
      // An entry awaiting confirmation can still be moved or removed (3c). Only a
      // confirmed book in Finished can be rated (UC-SHLF-kid-rate-book PRE-2, OI-75).
      actions:
        confirmed && category === "finished"
          ? ["move", "remove", "rate"]
          : ["move", "remove"],
    };
    return { category, view };
  });

  return {
    categories: groupByCategory(shown),
    notices: notices.map(({ id, kind, bookId }) => {
      const title = bookId ? bookById.get(bookId)?.title : undefined;
      return { id, kind, ...(title && { title }) };
    }),
    showFindBookMessage: shown.length === 0,
  };
}
