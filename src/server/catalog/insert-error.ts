import "server-only";
import { MongoServerError } from "mongodb";
import type { BookStatus } from "./books-collection";

// Tells a duplicate-key error from every other failure when a book is inserted
// (design/adm.md, Key decisions). Pure apart from the lookup it is given.

export type ExistingBook = {
  title: string;
  author: string;
  year: number;
  status: BookStatus;
};

export type InsertOutcome =
  { kind: "duplicate"; existing: ExistingBook } | { kind: "failed" };

type MatchField = "isbn" | "matchKey";

/**
 * MongoDB error 11000 is a duplicate; everything else is a failure with no retry (the
 * driver already retried transient conflicts). For a duplicate the matching book is
 * found by the field the error's keyPattern names; if it names both fields or neither,
 * the ISBN first (when the new book has one), then the matchKey. No book found is a failure.
 */
export async function classifyInsertError(
  error: unknown,
  book: { isbn?: string; matchKey: string },
  findExisting: (
    field: MatchField,
    value: string,
  ) => Promise<ExistingBook | null>,
): Promise<InsertOutcome> {
  if (!(error instanceof MongoServerError) || error.code !== 11000)
    return { kind: "failed" };

  const pattern = (error.keyPattern ?? {}) as Record<string, unknown>;
  const namesIsbn = "isbn" in pattern;
  const namesKey = "matchKey" in pattern;
  // One field named: look only there. Both or neither: the ISBN first, then the matchKey.
  const order: MatchField[] =
    namesKey && !namesIsbn
      ? ["matchKey"]
      : namesIsbn && !namesKey
        ? ["isbn"]
        : ["isbn", "matchKey"];

  for (const field of order) {
    const value = field === "isbn" ? book.isbn : book.matchKey;
    if (value === undefined) continue;
    const existing = await findExisting(field, value);
    if (existing) return { kind: "duplicate", existing };
  }
  return { kind: "failed" };
}
