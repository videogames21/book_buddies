import { MongoServerError } from "mongodb";
import { describe, expect, it, vi } from "vitest";
import { classifyInsertError, type ExistingBook } from "./insert-error";

// UC-ADM-add-content 6a, classifier (design/adm.md, Tests).

const EXISTING: ExistingBook = {
  title: "Moon Garden",
  author: "A. Writer",
  year: 2001,
  status: "active",
};
const BOOK = { isbn: "9780439023481", matchKey: "moon garden\u001fa writer" };

function duplicate(keyPattern?: Record<string, number>) {
  return new MongoServerError({
    message: "E11000 duplicate key",
    code: 11000,
    keyPattern,
  });
}

describe("classifyInsertError", () => {
  it("maps code 11000 to a duplicate, with the book the lookup found", async () => {
    const find = vi.fn().mockResolvedValue(EXISTING);
    expect(
      await classifyInsertError(duplicate({ isbn: 1 }), BOOK, find),
    ).toEqual({ kind: "duplicate", existing: EXISTING });
  });

  it.each([
    ["a plain error", new Error("boom")],
    [
      "a non-duplicate write error",
      new MongoServerError({ message: "x", code: 121 }),
    ],
    ["a value that is not an error", "nope"],
  ])("maps %s to a failure", async (_name, error) => {
    const find = vi.fn();
    expect(await classifyInsertError(error, BOOK, find)).toEqual({
      kind: "failed",
    });
    expect(find).not.toHaveBeenCalled();
  });

  it("is a failure when the duplicate's lookup finds nothing", async () => {
    const find = vi.fn().mockResolvedValue(null);
    expect(
      await classifyInsertError(duplicate({ isbn: 1 }), BOOK, find),
    ).toEqual({ kind: "failed" });
  });

  it("looks only at the field the keyPattern names", async () => {
    const find = vi.fn().mockResolvedValue(EXISTING);
    await classifyInsertError(duplicate({ matchKey: 1 }), BOOK, find);
    expect(find.mock.calls).toEqual([["matchKey", BOOK.matchKey]]);
  });

  it("looks only at the ISBN when the keyPattern names only the ISBN, even if nothing is found", async () => {
    const find = vi.fn().mockResolvedValue(null);
    await classifyInsertError(duplicate({ isbn: 1 }), BOOK, find);
    expect(find.mock.calls).toEqual([["isbn", BOOK.isbn]]);
  });

  it("looks at the ISBN first, then the matchKey, when both or neither are named", async () => {
    const patterns: (Record<string, number> | undefined)[] = [
      { isbn: 1, matchKey: 1 },
      {},
      undefined,
    ];
    for (const pattern of patterns) {
      const find = vi.fn().mockResolvedValue(null);
      await classifyInsertError(duplicate(pattern), BOOK, find);
      expect(find.mock.calls.map((call: unknown[]) => String(call[0]))).toEqual(
        ["isbn", "matchKey"],
      );
    }
  });

  it("skips the ISBN when the new book has none", async () => {
    const find = vi.fn().mockResolvedValue(EXISTING);
    await classifyInsertError(duplicate({}), { matchKey: BOOK.matchKey }, find);
    expect(find.mock.calls).toEqual([["matchKey", BOOK.matchKey]]);
  });
});
