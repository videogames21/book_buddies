import "server-only";
import { randomUUID } from "node:crypto";
import type { Db } from "mongodb";
import { appendAudit } from "@/server/audit/audit-log";
import type { AdminSession } from "@/server/identity-access/sessions";
import { fail, ok, type ActionResult } from "@/server/lib/action-result";
import { now } from "@/server/lib/clock";
import { ensureCollection } from "@/server/lib/collections";
import { getDb, withTransaction } from "@/server/lib/db";
import { logUnexpectedError } from "@/server/lib/log";
import type { NewBook } from "@/shared/catalog/new-book-schema";
import {
  BOOKS_COLLECTION,
  booksCollection,
  type BookStatus,
} from "./books-collection";
import { classifyInsertError, type ExistingBook } from "./insert-error";

// The Catalog's two narrow reads for the onboarding book picker (design/rec.md). The
// collection, import and admin functions belong to UC-ADM-add-content; this file only
// assumes its `books` shape: a string `_id`, `title`, `author` and a `status` of draft,
// active or blocked (DI-catalog-status). Only active books are ever returned, so draft
// and blocked books never reach a picker.
const BOOKS = BOOKS_COLLECTION;

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
  status: BookStatus;
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

// ---- UC-ADM-add-content (design/adm.md) -------------------------------------------
// The admin's own reads and the one write path. Every other Catalog read excludes
// blocked books and omits `customTags` and `readingLevel` by projection.

export type AddBookErrorCode = "BOOK_ALREADY_EXISTS" | "SAVE_FAILED";

/** The book and its audit entry are one transaction; the unique indexes are the duplicate check (5a). */
export async function addBook(
  session: AdminSession,
  input: NewBook,
): Promise<ActionResult<{ bookId: string }, AddBookErrorCode>> {
  const bookId = randomUUID();
  try {
    await withTransaction(
      async (tx) => {
        await booksCollection(getDb()).insertOne(
          { ...input, _id: bookId, status: "draft", createdAt: now() },
          { session: tx },
        );
        await appendAudit(tx, {
          event: "catalog.book_added",
          actorId: session.userId,
          actorRole: session.role,
          recordId: bookId,
        });
      },
      { timeoutMS: 5000 },
    );
    return ok({ bookId });
  } catch (error) {
    // Read outside the transaction, which has already aborted.
    const outcome = await classifyInsertError(
      error,
      input,
      async (field, value) =>
        booksCollection(getDb()).findOne(
          { [field]: value },
          { projection: { title: 1, author: 1, year: 1, status: 1 } },
        ),
    ).catch(() => ({ kind: "failed" as const }));
    if (outcome.kind === "duplicate")
      return fail("BOOK_ALREADY_EXISTS", duplicateMessage(outcome.existing));
    return fail(
      "SAVE_FAILED",
      "We couldn't save the book. Nothing was saved. Please try again.",
      logUnexpectedError("addBook", error),
    );
  }
}

function duplicateMessage(book: ExistingBook): string {
  return `This book is already in the catalog: ${book.title} by ${book.author} (${String(book.year)}), status ${book.status}.`;
}

export type AdminBookRow = {
  id: string;
  title: string;
  author: string;
  year: number;
  status: BookStatus;
};

/** Every book, blocked ones included, newest first (the catalog list, step 7). Admin pages only. */
export async function listBooksForAdmin(): Promise<AdminBookRow[]> {
  const books = await booksCollection(getDb())
    .find({}, { projection: { title: 1, author: 1, year: 1, status: 1 } })
    .sort({ createdAt: -1, _id: 1 })
    .toArray();
  return books.map((book) => ({
    id: book._id,
    title: book.title,
    author: book.author,
    year: book.year,
    status: book.status,
  }));
}

/** The distinct custom tags across all books, sorted. Admin pages only. */
export async function listCustomTags(): Promise<string[]> {
  const values: unknown[] =
    await booksCollection(getDb()).distinct("customTags");
  return values
    .filter((tag): tag is string => typeof tag === "string")
    .sort((a, b) => a.localeCompare(b));
}
