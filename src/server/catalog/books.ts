import "server-only";
import { getDb } from "@/server/lib/db";

// The Catalog's narrow reads: two for the onboarding book picker (design/rec.md) and one
// for the parent's shelf view (design/shlf.md). The
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

export type ShelfBook = { id: string; title: string; author: string };

/**
 * The title and author of each active book in `ids`, for the shelf view. A book that is
 * blocked, still a draft or missing is simply absent from the result, so the caller
 * drops its shelf entry (UC-SHLF-parent-view-shelf 5b). One query for every ID: it
 * returns all it found or throws, never part of an outage. The use case asks for a cover
 * too, but no catalog document defines one yet (see OPEN-ISSUES).
 */
export async function getBooksForShelf(ids: string[]): Promise<ShelfBook[]> {
  if (ids.length === 0) return [];
  const books = await getDb()
    .collection<BookFields>(BOOKS)
    .find(
      { _id: { $in: ids }, status: "active" },
      { projection: { title: 1, author: 1 } },
    )
    .toArray();
  return books.map((book) => ({
    id: book._id,
    title: book.title,
    author: book.author,
  }));
}
