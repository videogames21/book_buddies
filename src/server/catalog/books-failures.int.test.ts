import { MongoServerError } from "mongodb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/server/lib/db";
import { resetClock, setClock } from "@/server/lib/clock";
import { buildNewBookSchema } from "@/shared/catalog/new-book-schema";
import { TAG_LISTS } from "@/shared/catalog/tags";
import { insertBook } from "../../../tests/fixtures/catalog";
import { resetDatabase } from "../../../tests/integration/db";

// UC-ADM-add-content 6a and the 5a "both keys" row. The in-memory server cannot be made
// to fail on demand, so these tests reach failures through the two seams the design names:
// booksCollection(db), wrapped in a Proxy whose insertOne throws, and appendAudit.

const hooks = vi.hoisted(
  (): { insertError?: Error; auditError?: Error } => ({}),
);

vi.mock("./books-collection", async (importOriginal) => {
  const original = await importOriginal<typeof import("./books-collection")>();
  return {
    ...original,
    booksCollection: (db: Parameters<typeof original.booksCollection>[0]) => {
      const real = original.booksCollection(db);
      return new Proxy(real, {
        get(target, property) {
          const failure = hooks.insertError;
          if (property === "insertOne" && failure)
            return () => Promise.reject(failure);
          const value = Reflect.get(target, property) as unknown;
          return typeof value === "function"
            ? (value as (...args: unknown[]) => unknown).bind(target)
            : value;
        },
      });
    },
  };
});

vi.mock("@/server/audit/audit-log", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/server/audit/audit-log")>();
  return {
    ...original,
    appendAudit: (...args: Parameters<typeof original.appendAudit>) =>
      hooks.auditError !== undefined
        ? Promise.reject(hooks.auditError)
        : original.appendAudit(...args),
  };
});

const { addBook } = await import("./books");

const NOW = new Date("2026-03-01T10:00:00Z");
const ADMIN = { userId: "64b7f0f0f0f0f0f0f0f0f0f0", role: "admin" } as const;

function newBook(change: Record<string, unknown> = {}) {
  return buildNewBookSchema({ tags: TAG_LISTS, now: NOW }).parse({
    title: "The Moon Garden",
    author: "A. Writer",
    year: 2001,
    isbn: "9780439023481",
    noIsbn: false,
    genres: ["fantasy"],
    moods: ["calm"],
    format: "picture book",
    length: "quick read",
    ageMin: 6,
    ageMax: 8,
    readingChallenge: "reading independently",
    customTags: ["cute"],
    ...change,
  });
}

const books = () => getDb().collection("books");
const audit = () => getDb().collection("auditLog");

beforeEach(async () => {
  await resetDatabase();
  setClock(() => NOW);
  hooks.insertError = undefined;
  hooks.auditError = undefined;
});
afterEach(() => {
  resetClock();
});

describe("6a saving fails", () => {
  it("returns SAVE_FAILED with an error ID and leaves no book and no audit entry when the insert throws", async () => {
    hooks.insertError = new Error("disk on fire: The Moon Garden");
    const result = await addBook(ADMIN, newBook());
    expect(result).toMatchObject({
      ok: false,
      error: { code: "SAVE_FAILED", errorId: expect.any(String) as unknown },
    });
    if (!result.ok) expect(result.error.message).not.toMatch(/disk on fire/);
    expect(await books().countDocuments()).toBe(0);
    expect(await audit().countDocuments()).toBe(0);
  });

  it("leaves no book when the audit append fails after the insert", async () => {
    hooks.auditError = new Error("audit down");
    const result = await addBook(ADMIN, newBook());
    expect(result).toMatchObject({ ok: false, error: { code: "SAVE_FAILED" } });
    expect(await books().countDocuments()).toBe(0);
    expect(await audit().countDocuments()).toBe(0);
  });

  it("logs the error ID but no title, author or tag", async () => {
    hooks.insertError = new Error(
      "The Moon Garden by A. Writer, cute, fantasy",
    );
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await addBook(ADMIN, newBook());
    const logged = JSON.stringify(spy.mock.calls);
    expect(logged).toContain("errorId");
    for (const secret of ["Moon Garden", "Writer", "cute", "fantasy"])
      expect(logged).not.toContain(secret);
    spy.mockRestore();
  });
});

describe("5a both keys disagree", () => {
  function duplicate(keyPattern: Record<string, number>) {
    return new MongoServerError({
      message: "E11000 duplicate key",
      code: 11000,
      keyPattern,
    });
  }

  async function setUp() {
    // Book A has the new book's ISBN; book B has its title and author.
    await insertBook("active", "Book A", {
      author: "Author A",
      isbn: "9780439023481",
    });
    await insertBook("blocked", "The Moon Garden", {
      author: "A. Writer",
      matchKey: "the moon garden\u001fa writer",
    });
  }

  it.each([
    ["isbn", { isbn: 1 }, "Book A"],
    ["matchKey", { matchKey: 1 }, "The Moon Garden"],
    ["both", { isbn: 1, matchKey: 1 }, "Book A"],
  ])(
    "reports the book the %s keyPattern names (both: the ISBN's)",
    async (_name, keyPattern, title) => {
      await setUp();
      hooks.insertError = duplicate(keyPattern);
      const result = await addBook(ADMIN, newBook());
      expect(result).toMatchObject({
        ok: false,
        error: { code: "BOOK_ALREADY_EXISTS" },
      });
      if (!result.ok) expect(result.error.message).toContain(title);
    },
  );

  it("is SAVE_FAILED when the duplicate names a book that is not there", async () => {
    hooks.insertError = duplicate({ isbn: 1 });
    expect(await addBook(ADMIN, newBook())).toMatchObject({
      ok: false,
      error: { code: "SAVE_FAILED" },
    });
  });
});
