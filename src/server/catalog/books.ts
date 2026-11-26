import "server-only";
import { randomUUID } from "node:crypto";
import type { Db } from "mongodb";
import { appendAudit } from "@/server/audit/audit-log";
import type { AdminSession } from "@/server/identity-access/sessions";
import { fail, ok, type ActionResult } from "@/server/lib/action-result";
import { now } from "@/server/lib/clock";
import { ensureCollection } from "@/server/lib/collections";
import { getDb, withTransaction, type Tx } from "@/server/lib/db";
import { logUnexpectedError } from "@/server/lib/log";
import type { NewBook } from "@/shared/catalog/new-book-schema";
import {
  BOOKS_COLLECTION,
  booksCollection,
  type BookDocument,
  type BookStatus,
} from "./books-collection";
import { classifyInsertError, type ExistingBook } from "./insert-error";

// The Catalog's `books` collection: its validator and indexes, the two narrow picker reads
// (design/rec.md), and the admin's add path and reads (design/adm.md). The picker reads
// return only active books (DI-catalog-status), so draft and blocked books never reach a picker.
const BOOKS = BOOKS_COLLECTION;

/**
 * The `books` collection's validator and unique indexes (design/adm.md, Data model).
 * The unique `matchKey` and the partial unique ISBN-13 index are the duplicate check
 * (5a). The validator is the backstop (§8.2.5); it does not list the approved tag
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
      // lockActiveBookForWrite's counter; absent means 0 (OI-58).
      writeVersion: { bsonType: ["int", "long"] },
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

/**
 * The same-book conditional write `OI-58` proposes (design/adm.md, "Check races with the
 * owning use cases"; design/par.md, the block race key decision). A write that puts a book
 * in front of a child calls it inside its own transaction: it increments `writeVersion` only
 * while the book is active, and returns whether it matched. A block or a return to draft
 * writes the same document, so the two transactions conflict and MongoDB reruns or refuses
 * the later one; a snapshot read of the status alone would not conflict. `false` means the
 * book is no longer active (or never was), and the caller refuses the write.
 * Pending team sign-off on `OI-58` (callers and contention).
 */
export async function lockActiveBookForWrite(
  tx: Tx,
  bookId: string,
): Promise<boolean> {
  const result = await getDb()
    .collection<{ _id: string; status: BookStatus; writeVersion?: number }>(
      BOOKS,
    )
    .updateOne(
      { _id: bookId, status: "active" },
      { $inc: { writeVersion: 1 } },
      { session: tx },
    );
  return result.matchedCount === 1;
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

/** Every stored field of a book, as the admin sees it. */
export type AdminBookRow = Omit<BookDocument, "_id"> & { id: string };

/** Every book with every field, blocked ones included, newest first (the catalog list, step 7). Needs an admin session (§8.1). */
export async function listBooksForAdmin(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the type is the check
  _session: AdminSession,
): Promise<AdminBookRow[]> {
  const books = await booksCollection(getDb())
    .find({})
    .sort({ createdAt: -1, _id: 1 })
    .toArray();
  return books.map(({ _id, ...book }) => ({ id: _id, ...book }));
}

/** The distinct custom tags across all books, sorted. Needs an admin session (§8.1). */
export async function listCustomTags(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the type is the check
  _session: AdminSession,
): Promise<string[]> {
  const values: unknown[] =
    await booksCollection(getDb()).distinct("customTags");
  return values
    .filter((tag): tag is string => typeof tag === "string")
    .sort((a, b) => a.localeCompare(b));
}
