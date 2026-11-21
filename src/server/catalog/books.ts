import "server-only";
import type { Db } from "mongodb";
import { ensureCollection } from "@/server/lib/collections";
import { getDb } from "@/server/lib/db";

// The Catalog's two narrow reads for the onboarding book picker (design/rec.md). The
// collection, import and admin functions belong to UC-ADM-add-content; this file only
// assumes its `books` shape: a string `_id`, `title`, `author` and a `status` of draft,
// active or blocked (DI-catalog-status). Only active books are ever returned, so draft
// and blocked books never reach a picker.
const BOOKS = "books";

export const BOOKS_COLLECTION = BOOKS;

/**
 * The `books` collection's validator and unique indexes (design/adm.md, Data model).
 * The unique `matchKey` and the partial unique ISBN-13 index are the duplicate check
 * (5a). The validator is the backstop (�8.2.5); it does not list the approved tag
 * values, which live only in src/shared/catalog/tags.ts.
 */
export async function ensureBookIndexes(db: Db): Promise<void> {
  await ensureCollection(db, BOOKS, {
    bsonType: "object",
    required: [
      "_id",
      "title",
      "author",
      "matchKey",
      "year",
      "genres",
      "moods",
      "format",
      "length",
      "ageMin",
      "ageMax",
      "readingChallenge",
      "status",
      "createdAt",
    ],
    properties: {
      _id: { bsonType: "string" },
      title: { bsonType: "string" },
      author: { bsonType: "string" },
      matchKey: { bsonType: "string" },
      year: { bsonType: "int" },
      isbn: { bsonType: "string", pattern: "^[0-9]{13}$" },
      genres: { bsonType: "array", minItems: 1, items: { bsonType: "string" } },
      subjects: { bsonType: "array", items: { bsonType: "string" } },
      moods: { bsonType: "array", minItems: 1, items: { bsonType: "string" } },
      format: { bsonType: "string" },
      length: { bsonType: "string" },
      ageMin: { bsonType: "int" },
      ageMax: { bsonType: "int" },
      readingChallenge: { bsonType: "string" },
      readingLevel: { bsonType: "string" },
      customTags: { bsonType: "array", items: { bsonType: "string" } },
      status: { enum: ["draft", "active", "blocked"] },
      createdAt: { bsonType: "date" },
    },
  });
  const books = db.collection(BOOKS);
  await books.createIndex(
    { matchKey: 1 },
    { unique: true, name: "matchKey_unique" },
  );
  await books.createIndex(
    { isbn: 1 },
    {
      unique: true,
      name: "isbn_unique",
      partialFilterExpression: { isbn: { $type: "string" } },
    },
  );
}

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
