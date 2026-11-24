import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/server/lib/db";
import { resetClock, setClock } from "@/server/lib/clock";
import {
  insertParent,
  insertUserWithRole,
} from "../../../../../../tests/fixtures/users";
import { resetDatabase } from "../../../../../../tests/integration/db";

// auth() needs a real Next.js request, so the session is mocked here; the real auth() and
// the pages are covered by tests/e2e/add-content.spec.ts.
vi.mock("@/server/identity-access/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { addCatalogBook } = await import("./actions");
const { auth } = await import("@/server/identity-access/auth");
const { revalidatePath } = await import("next/cache");
const mockedAuth = vi.mocked(
  auth as unknown as () => Promise<{ user: { id: string } } | null>,
);

const book = {
  title: "The Moon Garden",
  author: "A. Writer",
  year: 2001,
  isbn: "",
  noIsbn: true,
  genres: ["fantasy"],
  moods: ["calm"],
  format: "picture book",
  length: "quick read",
  ageMin: 6,
  ageMax: 8,
  readingChallenge: "reading independently",
};

const signInAs = (userId: string) => {
  mockedAuth.mockResolvedValue({ user: { id: userId } });
};
const count = (name: string) => getDb().collection(name).countDocuments();

beforeEach(async () => {
  await resetDatabase();
  setClock(() => new Date("2026-03-01T10:00:00Z"));
  vi.mocked(revalidatePath).mockClear();
});
afterEach(() => {
  resetClock();
  mockedAuth.mockReset();
});

describe("addCatalogBook (UC-ADM-add-content)", () => {
  it("main: an admin adds a draft book and the list is revalidated", async () => {
    signInAs((await insertUserWithRole("admin")).userId);

    const result = await addCatalogBook(book);

    expect(result.ok).toBe(true);
    const stored = await getDb().collection("books").findOne({});
    expect(stored).toMatchObject({ title: "The Moon Garden", status: "draft" });
    expect(await count("auditLog")).toBe(1);
    expect(revalidatePath).toHaveBeenCalledWith("/admin/catalog");
  });

  it("status: a status in the request is dropped and the book is draft", async () => {
    signInAs((await insertUserWithRole("admin")).userId);

    await addCatalogBook({ ...book, status: "active" });

    expect(await getDb().collection("books").findOne({})).toMatchObject({
      status: "draft",
    });
  });

  it("1a: no session, a parent, a sub parent and a child are refused and nothing is stored", async () => {
    mockedAuth.mockResolvedValue(null);
    const none = await addCatalogBook(book);
    expect(none).toMatchObject({ ok: false, error: { code: "NOT_SIGNED_IN" } });

    for (const userId of [
      (await insertParent({ parentRole: "main" })).userId,
      (await insertParent({ parentRole: "sub" })).userId,
      (await insertUserWithRole("child")).userId,
    ]) {
      signInAs(userId);
      expect(await addCatalogBook(book)).toMatchObject({
        ok: false,
        error: { code: "NOT_AN_ADMIN" },
      });
    }
    expect(await count("books")).toBe(0);
    expect(await count("auditLog")).toBe(0);
  });

  it("4a to 4h: a failing field returns its code and stores nothing", async () => {
    signInAs((await insertUserWithRole("admin")).userId);

    const result = await addCatalogBook({ ...book, title: "" });
    const future = await addCatalogBook({ ...book, year: 2027 });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "TITLE_REQUIRED" },
    });
    expect(future).toMatchObject({
      ok: false,
      error: { code: "INVALID_YEAR" },
    });
    expect(await count("books")).toBe(0);
  });

  it("4i: an age outside 0 to 21 still saves", async () => {
    signInAs((await insertUserWithRole("admin")).userId);

    const result = await addCatalogBook({ ...book, ageMin: 25, ageMax: 30 });

    expect(result.ok).toBe(true);
    expect(await getDb().collection("books").findOne({})).toMatchObject({
      ageMin: 25,
      ageMax: 30,
    });
  });

  it("4c: the year is checked against the server's clock, not the real date", async () => {
    signInAs((await insertUserWithRole("admin")).userId);

    setClock(() => new Date("2020-06-01T00:00:00Z"));
    const future = await addCatalogBook({ ...book, year: 2021 });
    setClock(() => new Date("2030-06-01T00:00:00Z"));
    const past = await addCatalogBook({ ...book, year: 2029 });

    expect(future).toMatchObject({
      ok: false,
      error: { code: "INVALID_YEAR" },
    });
    expect(past.ok).toBe(true);
  });

  it("5a: a duplicate returns BOOK_ALREADY_EXISTS naming the existing book", async () => {
    signInAs((await insertUserWithRole("admin")).userId);
    await addCatalogBook(book);

    const again = await addCatalogBook({ ...book, title: "the moon garden!" });

    expect(again).toMatchObject({
      ok: false,
      error: { code: "BOOK_ALREADY_EXISTS" },
    });
    expect(!again.ok && again.error.message).toContain("The Moon Garden");
    expect(await count("books")).toBe(1);
    expect(revalidatePath).toHaveBeenCalledTimes(1);
  });
});
