import "server-only";
import { getBooksForShelf } from "@/server/catalog/books";
import { peekUnseenChildNotices } from "@/server/notification/child-notices";
import { listShelfCategories } from "./shelf-entries";
import type { RatingValue, ShelfCategory } from "./shelf-collections";

export type ChildShelfBook = {
  id: string;
  title: string;
  author: string;
  seriesName?: string;
  confirmed: boolean;
  rating: RatingValue | null;
  actions: ("move" | "remove" | "rate")[];
};

export type ChildShelfView = {
  categories: { category: ShelfCategory; entries: ChildShelfBook[] }[];
  notices: {
    id: string;
    kind: "book-removed" | "finish-declined";
    title?: string;
  }[];
};

export async function getShelfForChild(
  childId: string,
): Promise<ChildShelfView> {
  const notices = await peekUnseenChildNotices(childId);
  const noticeBookIds = notices.flatMap(({ bookId }) =>
    bookId ? [bookId] : [],
  );
  const booksById = new Map<string, string>();
  const categories = await listShelfCategories(childId, async (ids) => {
    const books = await getBooksForShelf([
      ...new Set([...ids, ...noticeBookIds]),
    ]);
    for (const { id, title } of books) booksById.set(id, title);
    return books;
  });

  return {
    categories: categories.map(({ category, entries }) => ({
      category,
      entries: entries.map(({ book, confirmed, rating }) => ({
        ...book,
        confirmed,
        rating,
        actions: confirmed ? ["move", "remove", "rate"] : ["move", "remove"],
      })),
    })),
    notices: notices.map(({ id, kind, bookId }) => ({
      id,
      kind,
      ...(bookId && { title: booksById.get(bookId) }),
    })),
  };
}
