import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/server/lib/db";
import { resetClock, setClock } from "@/server/lib/clock";
import {
  buildNewBookSchema,
  type NewBook,
} from "@/shared/catalog/new-book-schema";
import { TAG_LISTS } from "@/shared/catalog/tags";
import { insertBook } from "../../../tests/fixtures/catalog";
import { resetDatabase } from "../../../tests/integration/db";
import {
  addBook,
  findActiveBookIds,
  listBooksForAdmin,
  listCustomTags,
  listPickerBooks,
} from "./books";

const NOW = new Date("2026-03-01T10:00:00Z");
const ADMIN = { userId: "64b7f0f0f0f0f0f0f0f0f0f0", role: "admin" } as const;

const rawBook = {
  title: "The Moon Garden",
  author: "A. Writer",
  year: 2001,
  isbn: "9780439023481",
  noIsbn: false,
  genres: ["fantasy"],
  subjects: ["animals"],
  moods: ["calm"],
  format: "picture book",
  length: "quick read",
  ageMin: 6,
  ageMax: 8,
  readingChallenge: "reading independently",
  readingLevel: "650L",
  customTags: ["cute"],
};

/** A validated book, built the way the action builds it. */
function newBook(change: Record<string, unknown> = {}): NewBook {
  return buildNewBookSchema({ tags: TAG_LISTS, now: NOW }).parse({
    ...rawBook,
    ...change,
  });
}

const books = () => getDb().collection("books");
const audit = () => getDb().collection("auditLog");

beforeEach(async () => {
  await resetDatabase();
  setClock(() => NOW);
});
afterEach(() => {
  resetClock();
});

describe("addBook, main", () => {
  it("saves one draft book with a UUID, the entered values and the clock's time, and one audit entry", async () => {
    const result = await addBook(ADMIN, newBook());
    if (!result.ok) throw new Error(result.error.code);

    const stored = await books().find().toArray();
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      _id: result.data.bookId,
      title: "The Moon Garden",
      author: "A. Writer",
      year: 2001,
      isbn: "9780439023481",
      genres: ["fantasy"],
      subjects: ["animals"],
      moods: ["calm"],
      format: "picture book",
      length: "quick read",
      ageMin: 6,
      ageMax: 8,
      readingChallenge: "reading independently",
      readingLevel: "650L",
      customTags: ["cute"],
      status: "draft",
      createdAt: NOW,
    });
    expect(result.data.bookId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(await audit().countDocuments()).toBe(1);
  });

  it("saves a book as draft even with every required tag", async () => {
    await addBook(ADMIN, newBook());
    expect((await books().findOne({}))?.status).toBe("draft");
  });

  it("saves with no ISBN, subjects, reading level or custom tags, leaving them absent", async () => {
    const result = await addBook(
      ADMIN,
      newBook({
        isbn: "",
        noIsbn: true,
        subjects: [],
        readingLevel: "",
        customTags: [],
      }),
    );
    expect(result.ok).toBe(true);
    const stored = await books().findOne({});
    for (const field of ["isbn", "subjects", "readingLevel", "customTags"])
      expect(stored).not.toHaveProperty(field);
  });

  it("saves two books that both have no ISBN", async () => {
    const none = { isbn: "", noIsbn: true };
    expect((await addBook(ADMIN, newBook({ ...none, title: "One" }))).ok).toBe(
      true,
    );
    expect((await addBook(ADMIN, newBook({ ...none, title: "Two" }))).ok).toBe(
      true,
    );
    expect(await books().countDocuments()).toBe(2);
  });
});

describe("addBook, POST-3 audit", () => {
  it("records the admin, role, action, book ID and time, and no title, author or tag", async () => {
    const result = await addBook(ADMIN, newBook());
    if (!result.ok) throw new Error(result.error.code);
    const entries = await audit().find().toArray();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({
      _id: entries[0]._id,
      actorId: expect.objectContaining({}) as unknown,
      actorRole: "admin",
      event: "catalog.book_added",
      recordId: result.data.bookId,
      occurredAt: NOW,
    });
    expect(String(entries[0].actorId)).toBe(ADMIN.userId);
    const text = JSON.stringify(entries[0]);
    for (const secret of ["Moon Garden", "Writer", "cute", "fantasy"])
      expect(text).not.toContain(secret);
  });
});

describe("addBook, 4d custom tags", () => {
  it("keeps one stored tag for Friend, ' friend ' and FRIEND, and lists it once", async () => {
    await addBook(
      ADMIN,
      newBook({ customTags: ["Friend", " friend "], isbn: "", noIsbn: true }),
    );
    await addBook(
      ADMIN,
      newBook({
        title: "Another",
        customTags: ["FRIEND", "Zebra"],
        isbn: "",
        noIsbn: true,
      }),
    );
    const stored = await books().find({ title: "The Moon Garden" }).toArray();
    expect(stored[0].customTags).toEqual(["friend"]);
    expect(await listCustomTags(ADMIN)).toEqual(["friend", "zebra"]);
  });
});

describe("listCustomTags", () => {
  it("returns each distinct tag once, sorted, whatever order the books were added in", async () => {
    await insertBook("draft", "One", { customTags: ["zebra", "mango"] });
    await insertBook("blocked", "Two", { customTags: ["apple", "mango"] });
    await insertBook("active", "Three", {});
    expect(await listCustomTags(ADMIN)).toEqual(["apple", "mango", "zebra"]);
  });
});

describe("addBook, 5a duplicates", () => {
  it("reports a second book with the same ISBN, entered as ISBN-10 then ISBN-13, and adds nothing", async () => {
    await addBook(ADMIN, newBook({ isbn: "0439023483" }));
    const second = await addBook(
      ADMIN,
      newBook({ title: "Other Title", isbn: "9780439023481" }),
    );
    expect(second).toMatchObject({
      ok: false,
      error: { code: "BOOK_ALREADY_EXISTS" },
    });
    if (!second.ok) {
      expect(second.error.message).toContain("The Moon Garden");
      expect(second.error.message).toContain("A. Writer");
      expect(second.error.message).toContain("2001");
      expect(second.error.message).toContain("draft");
    }
    expect(await books().countDocuments()).toBe(1);
    expect(await audit().countDocuments()).toBe(1);
  });

  it.each([
    ["case", "THE MOON GARDEN", "a. writer"],
    ["accents", "The Moön Gården", "Á. Writer"],
    ["punctuation", "The Moon Garden!", "A Writer"],
    ["extra spaces", "  The   Moon  Garden ", "A.   Writer"],
  ])(
    "reports the same title and author differing in %s",
    async (_n, title, author) => {
      await addBook(ADMIN, newBook({ isbn: "", noIsbn: true }));
      const second = await addBook(
        ADMIN,
        newBook({ title, author, isbn: "", noIsbn: true }),
      );
      expect(second).toMatchObject({
        ok: false,
        error: { code: "BOOK_ALREADY_EXISTS" },
      });
      expect(await books().countDocuments()).toBe(1);
    },
  );

  it("reports a book that matches a blocked book, which stays blocked", async () => {
    await insertBook("blocked", "The Moon Garden", {
      author: "A. Writer",
      matchKey: "the moon garden\u001fa writer",
    });
    const result = await addBook(ADMIN, newBook({ isbn: "", noIsbn: true }));
    expect(result).toMatchObject({
      ok: false,
      error: { code: "BOOK_ALREADY_EXISTS" },
    });
    if (!result.ok) expect(result.error.message).toContain("blocked");
    expect(await books().countDocuments()).toBe(1);
    expect((await books().findOne({}))?.status).toBe("blocked");
    expect(await audit().countDocuments()).toBe(0);
  });

  it("leaves exactly one book and one audit entry when two admins add one book at once", async () => {
    for (let round = 0; round < 3; round++) {
      await resetDatabase();
      const results = await Promise.all([
        addBook(ADMIN, newBook()),
        addBook(ADMIN, newBook()),
      ]);
      const winners = results.filter((r) => r.ok);
      const losers = results.filter((r) => !r.ok);
      expect(winners).toHaveLength(1);
      expect(losers).toHaveLength(1);
      expect(losers[0]).toMatchObject({
        error: { code: "BOOK_ALREADY_EXISTS" },
      });
      expect(await books().countDocuments()).toBe(1);
      expect(await audit().countDocuments()).toBe(1);
    }
  });
});

describe("Catalog reads", () => {
  it("lists every status, blocked included, newest first, ties in a stable order", async () => {
    const created = (iso: string) => ({ createdAt: new Date(iso) });
    const old = await insertBook(
      "active",
      "Old",
      created("2026-01-01T00:00:00Z"),
    );
    const blocked = await insertBook(
      "blocked",
      "Blocked",
      created("2026-02-01T00:00:00Z"),
    );
    const tieA = await insertBook(
      "draft",
      "Tie A",
      created("2026-03-01T00:00:00Z"),
    );
    const tieB = await insertBook(
      "draft",
      "Tie B",
      created("2026-03-01T00:00:00Z"),
    );

    const rows = await listBooksForAdmin(ADMIN);
    const [firstTie, secondTie] = [tieA, tieB].sort();
    expect(rows.map((row) => row.id)).toEqual([
      firstTie,
      secondTie,
      blocked,
      old,
    ]);
    expect(rows[0]).toEqual({
      id: firstTie,
      title: expect.any(String) as unknown,
      author: "A. Writer",
      year: 2001,
      status: "draft",
    });
    expect(rows.map((row) => row.status)).toContain("blocked");
  });

  it("returns custom tags and reading level from no read for a child, a parent or a search", async () => {
    const id = await insertBook("active", "Tagged", {
      customTags: ["secret"],
      readingLevel: "650L",
    });
    const picker = await listPickerBooks();
    const found = await findActiveBookIds([id]);
    expect(found).toEqual([id]);
    expect(JSON.stringify(picker)).not.toMatch(
      /secret|650L|customTags|readingLevel/,
    );
    // The admin list shows neither either: it is title, author, year and status.
    expect(JSON.stringify(await listBooksForAdmin(ADMIN))).not.toMatch(
      /secret|650L|customTags|readingLevel/,
    );
  });
});

describe("Admin boundary", () => {
  it("adds a book without reading or writing any other collection", async () => {
    await addBook(ADMIN, newBook());
    const names = (await getDb().listCollections().toArray()).map(
      (c) => c.name,
    );
    for (const name of names) {
      if (name === "books" || name === "auditLog") continue;
      expect(await getDb().collection(name).countDocuments()).toBe(0);
    }
  });

  it("imports no child, parent or family code", () => {
    for (const file of ["books.ts", "books-collection.ts", "insert-error.ts"]) {
      const source = readFileSync(`src/server/catalog/${file}`, "utf8");
      expect(source).not.toMatch(
        /accounts-family|child-identity|recommendation|safety-flagging/,
      );
    }
  });
});

describe("Logging", () => {
  it("logs nothing about a successful add", async () => {
    const spies = (["log", "info", "warn", "error"] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation(() => undefined),
    );
    await addBook(ADMIN, newBook());
    await addBook(ADMIN, newBook()); // a duplicate
    const logged = JSON.stringify(spies.flatMap((spy) => spy.mock.calls));
    for (const secret of ["Moon Garden", "Writer", "cute", "fantasy"])
      expect(logged).not.toContain(secret);
    spies.forEach((spy) => {
      spy.mockRestore();
    });
  });
});
