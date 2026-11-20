import "server-only";
import { getDb } from "@/server/lib/db";

// The Catalog's two narrow reads for the onboarding book picker (design/rec.md). The
// collection, import and admin functions belong to UC-ADM-add-content; this file only
// assumes its `books` shape: a string `_id`, `title`, `author` and a `status` of draft,
// active or blocked (DI-catalog-status). Only active books are ever returned, so draft
// and blocked books never reach a picker.
const BOOKS = "books";

export type PickerBook = { id: string; title: string; author: string };

type BookFields = {
  _id: string;
  title: string;
  author: string;
  status: "draft" | "active" | "blocked";
};

/** Active books for the picker, sorted by title. */
export async function listPickerBooks(): Promise<PickerBook[]> {
  const books = await getDb()
    .collection<BookFields>(BOOKS)
    .find({ status: "active" }, { projection: { title: 1, author: 1 } })
    .sort({ title: 1, _id: 1 })
    .toArray();
  return books.map((book) => ({
    id: book._id,
    title: book.title,
    author: book.author,
  }));
}

/** The subset of `ids` that are active catalog books. */
export async function findActiveBookIds(ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const books = await getDb()
    .collection<BookFields>(BOOKS)
    .find({ _id: { $in: ids }, status: "active" }, { projection: { _id: 1 } })
    .toArray();
  return books.map((book) => book._id);
}
