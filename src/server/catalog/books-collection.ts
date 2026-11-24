import "server-only";
import type { Collection, Db } from "mongodb";

// The one place the Catalog gets its `books` collection (design/adm.md, Tests). Tests
// replace this module to make an insert fail on purpose, since the in-memory server
// cannot be made to fail on demand.

export type BookStatus = "draft" | "active" | "blocked";

export type BookDocument = {
  _id: string;
  title: string;
  author: string;
  matchKey: string;
  year: number;
  isbn?: string;
  genres: string[];
  subjects?: string[];
  moods: string[];
  format: string;
  length: string;
  ageMin: number;
  ageMax: number;
  readingChallenge: string;
  readingLevel?: string;
  customTags?: string[];
  status: BookStatus;
  createdAt: Date;
};

export const BOOKS_COLLECTION = "books";

export function booksCollection(db: Db): Collection<BookDocument> {
  return db.collection<BookDocument>(BOOKS_COLLECTION);
}
