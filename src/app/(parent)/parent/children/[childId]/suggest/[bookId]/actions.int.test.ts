import { randomUUID } from "node:crypto";
import { ObjectId } from "mongodb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { insertBook } from "../../../../../../../../tests/fixtures/catalog";
import { insertChild } from "../../../../../../../../tests/fixtures/children";
import { insertConsentRecord } from "../../../../../../../../tests/fixtures/family";
import {
  insertParent,
  insertUserWithRole,
} from "../../../../../../../../tests/fixtures/users";
import { resetDatabase } from "../../../../../../../../tests/integration/db";

// UC-PAR-suggest-book, the suggestBook action (design/par.md, Tests): main through the
// action, 3b, the check order, and the session refusals. The write itself is tested in
// suggestions.int.test.ts. Invented data only.

vi.mock("@/server/identity-access/auth", () => ({ auth: vi.fn() }));
// The release gate (README) is off by default; these tests turn it on.
vi.mock("@/server/lib/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/lib/config")>();
  return { ...actual, areParentSuggestionsEnabled: () => true };
});
// The real write, wrapped so the check-order test can see it was never called.
vi.mock("@/server/accounts-family/suggestions", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/server/accounts-family/suggestions")
    >();
  return { ...actual, createSuggestion: vi.fn(actual.createSuggestion) };
});

const { auth } = await import("@/server/identity-access/auth");
const { createSuggestion } =
  await import("@/server/accounts-family/suggestions");
const { insertChildIdentity } =
  await import("@/server/child-identity/child-identity");
const { getDb, withTransaction } = await import("@/server/lib/db");
const { resetClock, setClock } = await import("@/server/lib/clock");
const { suggestBook } = await import("./actions");

const mockedAuth = vi.mocked(
  auth as unknown as () => Promise<{ user: { id: string } } | null>,
);
const signInAs = (userId: string | null) => {
  mockedAuth.mockResolvedValue(userId ? { user: { id: userId } } : null);
};

const AT = new Date("2026-11-26T15:00:00Z");
const stored = () =>
  getDb()
    .collection("parentSuggestions")
    .find({}, { projection: { _id: 0 } })
    .toArray();

async function family() {
  const main = await insertParent({ parentRole: "main" });
  await insertConsentRecord(main, true);
  const sub = await insertParent({
    parentRole: "sub",
    familyId: new ObjectId(main.familyId),
  });
  const childId = await insertChild(main.familyId, { nickname: "Otterpop" });
  // 4a's released-batch read needs the age, as createChildAccount leaves it.
  await withTransaction((tx) =>
    insertChildIdentity(tx, { childId, age: 7, grade: "2" }),
  );
  const bookId = await insertBook("active", "Lantern Hill");
  return { main, sub, childId, bookId };
}

beforeEach(async () => {
  await resetDatabase();
  setClock(() => AT);
});
afterEach(() => {
  resetClock();
  mockedAuth.mockReset();
  vi.mocked(createSuggestion).mockClear();
});

describe("suggestBook (UC-PAR-suggest-book steps 3-4)", () => {
  it("main: a Main or Sub Parent suggests a book with a trimmed note", async () => {
    const { main, sub, childId, bookId } = await family();
    signInAs(main.userId);
    await expect(
      suggestBook({ childId, bookId, note: "  You'll like the fox  " }),
    ).resolves.toEqual({ ok: true, data: null });
    expect(await stored()).toEqual([
      { childId, bookId, note: "You'll like the fox", suggestedAt: AT },
    ]);

    // A Sub Parent of the family may suggest too (§8.1, OI-25).
    const other = await insertBook("active", "Otter Bay");
    signInAs(sub.userId);
    await expect(suggestBook({ childId, bookId: other })).resolves.toEqual({
      ok: true,
      data: null,
    });
    expect(await stored()).toHaveLength(2);
    // No shelf entry is made (POST-1, BR-parent-rec-not-forced).
    expect(await getDb().collection("shelfEntries").countDocuments()).toBe(0);
  });

  it("3b: a note over 250 characters is NOTE_TOO_LONG and nothing is stored", async () => {
    const { main, childId, bookId } = await family();
    signInAs(main.userId);
    const result = await suggestBook({
      childId,
      bookId,
      note: "a".repeat(251),
    });
    expect(result).toMatchObject({
      ok: false,
      error: { code: "NOTE_TOO_LONG" },
    });
    expect(await stored()).toEqual([]);
  });

  it("check order: an invalid note with a foreign child fails at the schema, before createSuggestion", async () => {
    await family();
    const stranger = await insertParent({ parentRole: "main" });
    await insertConsentRecord(stranger, true);
    const foreignChild = await insertChild(
      (await insertParent({ parentRole: "main" })).familyId,
    );
    signInAs(stranger.userId);
    const result = await suggestBook({
      childId: foreignChild,
      bookId: "any-book",
      note: "a".repeat(251),
    });
    expect(result).toMatchObject({ error: { code: "NOTE_TOO_LONG" } });
    expect(createSuggestion).not.toHaveBeenCalled();
  });

  it("authorization: a foreign, unknown or malformed child gets the same CHILD_NOT_FOUND", async () => {
    const { bookId } = await family();
    const stranger = await insertParent({ parentRole: "main" });
    await insertConsentRecord(stranger, true);
    const { childId: foreignChild } = await family();
    signInAs(stranger.userId);

    const answers = [];
    for (const childId of [foreignChild, randomUUID(), "not-a-child-id"]) {
      answers.push(await suggestBook({ childId, bookId }));
    }
    for (const answer of answers) {
      expect(answer).toEqual(answers[0]);
      expect(answer).toMatchObject({ error: { code: "CHILD_NOT_FOUND" } });
    }
    expect(await stored()).toEqual([]);
  });

  it("refuses no session, a child session and an admin session, and stores nothing", async () => {
    const { childId, bookId } = await family();
    signInAs(null);
    expect(await suggestBook({ childId, bookId })).toMatchObject({
      error: { code: "NOT_SIGNED_IN" },
    });
    for (const role of ["child", "admin"] as const) {
      signInAs((await insertUserWithRole(role)).userId);
      expect(await suggestBook({ childId, bookId })).toMatchObject({
        error: { code: "NOT_A_PARENT" },
      });
    }
    expect(createSuggestion).not.toHaveBeenCalled();
    expect(await stored()).toEqual([]);
  });

  it("answers input of the wrong type with INVALID_INPUT", async () => {
    const { main, childId, bookId } = await family();
    signInAs(main.userId);
    for (const input of [
      null,
      { childId, bookId, note: 5 },
      { childId, bookId, suggestAnyway: "yes" },
    ]) {
      expect(await suggestBook(input)).toMatchObject({
        error: { code: "INVALID_INPUT" },
      });
    }
    expect(await stored()).toEqual([]);
  });

  it("passes suggestAnyway through: a pending suggestion takes the new note", async () => {
    const { main, childId, bookId } = await family();
    signInAs(main.userId);
    await suggestBook({ childId, bookId, note: "First" });
    expect(
      await suggestBook({ childId, bookId, note: "Second" }),
    ).toMatchObject({ error: { code: "ALREADY_SUGGESTED" } });
    expect(
      await suggestBook({
        childId,
        bookId,
        note: "Second",
        suggestAnyway: true,
      }),
    ).toEqual({ ok: true, data: null });
    expect(await stored()).toEqual([
      { childId, bookId, note: "Second", suggestedAt: AT },
    ]);
  });
});
