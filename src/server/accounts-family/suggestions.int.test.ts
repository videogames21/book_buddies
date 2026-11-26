import { randomUUID } from "node:crypto";
import { Collection, MongoServerError, ObjectId } from "mongodb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { insertBook } from "../../../tests/fixtures/catalog";
import { insertChild } from "../../../tests/fixtures/children";
import { insertConsentRecord } from "../../../tests/fixtures/family";
import { insertShelfEntry } from "../../../tests/fixtures/shelf";
import { insertSuggestion } from "../../../tests/fixtures/suggestions";
import { insertParent } from "../../../tests/fixtures/users";
import { resetDatabase } from "../../../tests/integration/db";

// The release gate (README) is off by default; these tests turn it on, and one turns it off.
const gate = vi.hoisted(() => ({ enabled: true }));
vi.mock("@/server/lib/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/lib/config")>();
  return { ...actual, areParentSuggestionsEnabled: () => gate.enabled };
});

// A hook that runs right after the Catalog's book check, so a test can block the book
// or set it back to draft between that check and the transaction.
const afterBookCheck = vi.hoisted(() => ({
  run: null as null | (() => Promise<void>),
}));
vi.mock("@/server/catalog/books", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/server/catalog/books")>();
  return {
    ...actual,
    findActiveBookIds: async (ids: string[]) => {
      const found = await actual.findActiveBookIds(ids);
      if (afterBookCheck.run) await afterBookCheck.run();
      return found;
    },
  };
});

const { createSuggestion, getSuggestionConflict } =
  await import("./suggestions");
const { getDb, getMongoClient } = await import("@/server/lib/db");
const { resetClock, setClock } = await import("@/server/lib/clock");

// Invented data only.
const AT = new Date("2026-11-25T15:00:00Z");
const NOTE = "You loved the last one about dragons";

async function consentedFamily() {
  const main = await insertParent({ parentRole: "main" });
  await insertConsentRecord(main, true);
  const sub = await insertParent({
    parentRole: "sub",
    familyId: new ObjectId(main.familyId),
  });
  const childId = await insertChild(main.familyId, { nickname: "Otterpop" });
  return {
    main: { ...main, parentRole: "main" as const },
    sub: { ...sub, parentRole: "sub" as const },
    childId,
    familyId: main.familyId,
  };
}

const col = (name: string) => getDb().collection(name);
const count = (name: string, filter = {}) => col(name).countDocuments(filter);
const stored = () =>
  col("parentSuggestions")
    .find({}, { projection: { _id: 0 } })
    .toArray();

/** Makes the first insert into parentSuggestions run `before`, then fail with `error`. */
function failFirstSuggestionInsert(
  error: Error,
  before: () => Promise<void> = async () => {},
) {
  // eslint-disable-next-line @typescript-eslint/unbound-method -- called with apply(this)
  const original = Collection.prototype.insertOne;
  let fired = false;
  return vi
    .spyOn(Collection.prototype, "insertOne")
    .mockImplementation(async function (
      this: Collection,
      ...args: Parameters<Collection["insertOne"]>
    ) {
      if (this.collectionName === "parentSuggestions" && !fired) {
        fired = true;
        await before();
        throw error;
      }
      return original.apply(this, args);
    });
}

/** Commits a suggestion outside any transaction, as a racing request would. */
async function commitRacingSuggestion(
  childId: string,
  bookId: string,
  note?: string,
) {
  await getMongoClient()
    .db(getDb().databaseName)
    .collection("parentSuggestions")
    .insertOne({
      _id: new ObjectId(),
      childId,
      bookId,
      ...(note ? { note } : {}),
      suggestedAt: new Date("2026-11-25T14:59:00Z"),
    });
}

describe("createSuggestion (UC-PAR-suggest-book)", () => {
  beforeEach(async () => {
    await resetDatabase();
    setClock(() => AT);
    afterBookCheck.run = null;
    gate.enabled = true;
  });
  afterEach(() => {
    vi.restoreAllMocks();
    resetClock();
  });

  it("main: stores one suggestion with the child, the book, the note and now(), and no shelf entry", async () => {
    const { main, childId } = await consentedFamily();
    const bookId = await insertBook("active");

    const result = await createSuggestion(main, {
      childId,
      bookId,
      note: NOTE,
      suggestAnyway: false,
    });

    expect(result).toEqual({ ok: true, data: null });
    expect(await stored()).toEqual([
      { childId, bookId, note: NOTE, suggestedAt: AT },
    ]);
    // POST-1, BR-parent-rec-not-forced: nothing goes on the shelf.
    expect(await count("shelfEntries")).toBe(0);
  });

  it("main, no note: the suggestion has no note field", async () => {
    const { main, childId } = await consentedFamily();
    const bookId = await insertBook("active");

    await createSuggestion(main, { childId, bookId, suggestAnyway: false });

    expect(await stored()).toEqual([{ childId, bookId, suggestedAt: AT }]);
  });

  it("release gate: with the gate off nothing is read or stored", async () => {
    const { main, childId } = await consentedFamily();
    const bookId = await insertBook("active");
    gate.enabled = false;
    const find = vi.spyOn(Collection.prototype, "findOne");

    const result = await createSuggestion(main, {
      childId,
      bookId,
      note: NOTE,
      suggestAnyway: false,
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "SUGGESTIONS_UNAVAILABLE" },
    });
    expect(find).not.toHaveBeenCalled();
    expect(await count("parentSuggestions")).toBe(0);
  });

  it("1b: a book excluded for the child is BOOK_EXCLUDED, and a sibling can still get it", async () => {
    const { main, childId, familyId } = await consentedFamily();
    const sibling = await insertChild(familyId, { nickname: "Pebble" });
    const bookId = await insertBook("active");
    await col("childBookExclusions").insertOne({
      childId,
      bookId,
      reportId: new ObjectId(),
      createdAt: AT,
    });

    const refused = await createSuggestion(main, {
      childId,
      bookId,
      suggestAnyway: true,
    });
    expect(refused).toMatchObject({
      ok: false,
      error: { code: "BOOK_EXCLUDED" },
    });
    expect(await count("parentSuggestions")).toBe(0);

    const allowed = await createSuggestion(main, {
      childId: sibling,
      bookId,
      suggestAnyway: false,
    });
    expect(allowed.ok).toBe(true);
    expect(await count("parentSuggestions", { childId: sibling })).toBe(1);
  });

  it("PRE-3: an unknown, draft or blocked book is INVALID_BOOK and nothing is stored", async () => {
    const { main, childId } = await consentedFamily();
    for (const bookId of [
      randomUUID(),
      await insertBook("draft"),
      await insertBook("blocked"),
    ]) {
      expect(
        await createSuggestion(main, { childId, bookId, suggestAnyway: true }),
      ).toMatchObject({ ok: false, error: { code: "INVALID_BOOK" } });
    }
    expect(await count("parentSuggestions")).toBe(0);
  });

  it("4a, on shelf: ALREADY_ON_SHELF with no write; suggest anyway saves it and leaves the shelf entry", async () => {
    const { main, childId } = await consentedFamily();
    const bookId = await insertBook("active");
    await insertShelfEntry(childId, bookId, "wantToRead");
    const entry = await col("shelfEntries").findOne({ childId, bookId });

    expect(
      await createSuggestion(main, { childId, bookId, suggestAnyway: false }),
    ).toMatchObject({ ok: false, error: { code: "ALREADY_ON_SHELF" } });
    expect(await count("parentSuggestions")).toBe(0);
    expect(await getSuggestionConflict(main.familyId, childId, bookId)).toBe(
      "onShelf",
    );

    const anyway = await createSuggestion(main, {
      childId,
      bookId,
      note: NOTE,
      suggestAnyway: true,
    });
    expect(anyway.ok).toBe(true);
    expect(await count("parentSuggestions")).toBe(1);
    expect(await col("shelfEntries").find({ childId }).toArray()).toEqual([
      entry,
    ]);
  });

  it("4a, already suggested: ALREADY_SUGGESTED first, even when on the shelf; suggest anyway updates the one document", async () => {
    const { main, childId } = await consentedFamily();
    const bookId = await insertBook("active");
    await insertShelfEntry(childId, bookId, "wantToRead");
    await insertSuggestion(childId, bookId, { note: "old note" });

    expect(
      await createSuggestion(main, {
        childId,
        bookId,
        note: NOTE,
        suggestAnyway: false,
      }),
    ).toMatchObject({ ok: false, error: { code: "ALREADY_SUGGESTED" } });
    expect(await getSuggestionConflict(main.familyId, childId, bookId)).toBe(
      "suggested",
    );

    await createSuggestion(main, {
      childId,
      bookId,
      note: NOTE,
      suggestAnyway: true,
    });
    expect(await stored()).toEqual([
      { childId, bookId, note: NOTE, suggestedAt: AT },
    ]);

    // Suggest anyway with no note removes the old note.
    const later = new Date("2026-11-26T09:00:00Z");
    setClock(() => later);
    await createSuggestion(main, { childId, bookId, suggestAnyway: true });
    expect(await stored()).toEqual([{ childId, bookId, suggestedAt: later }]);
  });

  it("4a: getSuggestionConflict says nothing about another family's child", async () => {
    const mine = await consentedFamily();
    const theirs = await consentedFamily();
    const bookId = await insertBook("active");
    await insertSuggestion(theirs.childId, bookId);

    expect(
      await getSuggestionConflict(mine.familyId, theirs.childId, bookId),
    ).toBeNull();
  });

  it("4a, duplicate key with suggest anyway: the second transaction updates the winner's document", async () => {
    const { main, childId } = await consentedFamily();
    const bookId = await insertBook("active");
    const duplicate = new MongoServerError({
      message: "E11000 duplicate key error",
      code: 11000,
      keyPattern: { childId: 1, bookId: 1 },
    });
    failFirstSuggestionInsert(duplicate, () =>
      commitRacingSuggestion(childId, bookId, "the winner's note"),
    );

    const result = await createSuggestion(main, {
      childId,
      bookId,
      note: NOTE,
      suggestAnyway: true,
    });

    expect(result).toEqual({ ok: true, data: null });
    expect(await stored()).toEqual([
      { childId, bookId, note: NOTE, suggestedAt: AT },
    ]);
  });

  it("4a, duplicate key without suggest anyway: ALREADY_SUGGESTED, not logged", async () => {
    const { main, childId } = await consentedFamily();
    const bookId = await insertBook("active");
    failFirstSuggestionInsert(
      new MongoServerError({
        message: "E11000 duplicate key error",
        code: 11000,
        keyPattern: { childId: 1, bookId: 1 },
      }),
      () => commitRacingSuggestion(childId, bookId),
    );
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(
      await createSuggestion(main, { childId, bookId, suggestAnyway: false }),
    ).toMatchObject({ ok: false, error: { code: "ALREADY_SUGGESTED" } });
    expect(error).not.toHaveBeenCalled();
    expect(await count("parentSuggestions")).toBe(1);
  });

  it("4a, concurrent: without suggest anyway one wins and the other is ALREADY_SUGGESTED", async () => {
    const { main, sub, childId } = await consentedFamily();
    const bookId = await insertBook("active");

    const results = await Promise.all([
      createSuggestion(main, {
        childId,
        bookId,
        note: "a",
        suggestAnyway: false,
      }),
      createSuggestion(sub, {
        childId,
        bookId,
        note: "b",
        suggestAnyway: false,
      }),
    ]);

    const codes = results.map((r) => (r.ok ? "ok" : r.error.code)).sort();
    expect(codes).toEqual(["ALREADY_SUGGESTED", "ok"]);
    expect(await count("parentSuggestions")).toBe(1);
  });

  it("4a, concurrent: with suggest anyway on both, both are ok and one document holds one of the notes", async () => {
    const { main, sub, childId } = await consentedFamily();
    const bookId = await insertBook("active");

    const results = await Promise.all([
      createSuggestion(main, {
        childId,
        bookId,
        note: "a",
        suggestAnyway: true,
      }),
      createSuggestion(sub, {
        childId,
        bookId,
        note: "b",
        suggestAnyway: true,
      }),
    ]);

    expect(results.map((r) => r.ok)).toEqual([true, true]);
    const docs = await stored();
    expect(docs).toHaveLength(1);
    expect(["a", "b"]).toContain(docs[0]?.note);
  });

  it("4a, rerun: a rerun after a transient error reads the conflict and now() again", async () => {
    const { main, childId } = await consentedFamily();
    const bookId = await insertBook("active");
    const transient = new MongoServerError({
      message: "WriteConflict",
      code: 112,
    });
    transient.addErrorLabel("TransientTransactionError");
    failFirstSuggestionInsert(transient, () =>
      commitRacingSuggestion(childId, bookId, "first"),
    );

    expect(
      await createSuggestion(main, {
        childId,
        bookId,
        note: NOTE,
        suggestAnyway: false,
      }),
    ).toMatchObject({ ok: false, error: { code: "ALREADY_SUGGESTED" } });
    expect(await stored()).toEqual([
      {
        childId,
        bookId,
        note: "first",
        suggestedAt: new Date("2026-11-25T14:59:00Z"),
      },
    ]);
  });

  it("suggest again after a reaction: once the suggestion is gone, the same book is inserted with no warning", async () => {
    const { main, childId } = await consentedFamily();
    const bookId = await insertBook("active");
    await createSuggestion(main, { childId, bookId, suggestAnyway: false });
    // UC-REC-kid-review's reaction deletes it through removeSuggestionInTx (its own test).
    await col("parentSuggestions").deleteMany({ childId, bookId });

    expect(
      await createSuggestion(main, { childId, bookId, suggestAnyway: false }),
    ).toEqual({ ok: true, data: null });
    expect(await count("parentSuggestions")).toBe(1);
  });

  it("block race, block then suggest: a block that commits after the book check makes it INVALID_BOOK", async () => {
    const { main, childId } = await consentedFamily();
    const bookId = await insertBook("active");
    afterBookCheck.run = async () => {
      afterBookCheck.run = null;
      await col("books").updateOne(
        { _id: bookId as never },
        { $set: { status: "blocked" } },
      );
    };

    expect(
      await createSuggestion(main, { childId, bookId, suggestAnyway: false }),
    ).toMatchObject({ ok: false, error: { code: "INVALID_BOOK" } });
    expect(await count("parentSuggestions")).toBe(0);
  });

  it("block race: a suggestion that meets an uncommitted block retries and is INVALID_BOOK once it commits", async () => {
    const { main, childId } = await consentedFamily();
    const bookId = await insertBook("active");
    const block = getMongoClient().startSession();
    block.startTransaction();
    await col("books").updateOne(
      { _id: bookId as never },
      { $set: { status: "blocked" } },
      { session: block },
    );

    const pending = createSuggestion(main, {
      childId,
      bookId,
      suggestAnyway: false,
    });
    await new Promise((resolve) => setTimeout(resolve, 300));
    await block.commitTransaction();
    await block.endSession();

    expect(await pending).toMatchObject({
      ok: false,
      error: { code: "INVALID_BOOK" },
    });
    expect(await count("parentSuggestions")).toBe(0);
  });

  it("draft race, draft then suggest: a return to draft after the book check makes it INVALID_BOOK", async () => {
    const { main, childId } = await consentedFamily();
    const bookId = await insertBook("active");
    afterBookCheck.run = async () => {
      afterBookCheck.run = null;
      await col("books").updateOne(
        { _id: bookId as never },
        { $set: { status: "draft" } },
      );
    };

    expect(
      await createSuggestion(main, { childId, bookId, suggestAnyway: false }),
    ).toMatchObject({ ok: false, error: { code: "INVALID_BOOK" } });
    expect(await count("parentSuggestions")).toBe(0);
  });

  it("5a: no deadline is stored", async () => {
    const { main, childId } = await consentedFamily();
    const bookId = await insertBook("active");
    await createSuggestion(main, { childId, bookId, suggestAnyway: false });

    const doc = await col("parentSuggestions").findOne({ childId });
    expect(Object.keys(doc ?? {}).sort()).toEqual([
      "_id",
      "bookId",
      "childId",
      "suggestedAt",
    ]);
  });

  it("write failure: SAVE_FAILED with an error ID, a generic message, and nothing stored", async () => {
    const { main, childId } = await consentedFamily();
    const bookId = await insertBook("active");
    failFirstSuggestionInsert(new Error("suggestion store down"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await createSuggestion(main, {
      childId,
      bookId,
      note: NOTE,
      suggestAnyway: false,
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "SAVE_FAILED", errorId: expect.any(String) as unknown },
    });
    expect(JSON.stringify(result)).not.toContain("suggestion store down");
    expect(await count("parentSuggestions")).toBe(0);
  });

  it("consent: unconfirmed or revoked consent is CONSENT_NOT_CONFIRMED and nothing is stored", async () => {
    const unconfirmed = await insertParent({ parentRole: "main" });
    await insertConsentRecord(unconfirmed, false);
    const unconfirmedChild = await insertChild(unconfirmed.familyId);
    const bookId = await insertBook("active");
    expect(
      await createSuggestion(
        { ...unconfirmed, parentRole: "main" },
        { childId: unconfirmedChild, bookId, suggestAnyway: false },
      ),
    ).toMatchObject({ ok: false, error: { code: "CONSENT_NOT_CONFIRMED" } });

    const { main, childId, familyId } = await consentedFamily();
    await col("consentRecords").updateOne(
      { familyId: new ObjectId(familyId) },
      { $set: { revokedAt: AT } },
    );
    expect(
      await createSuggestion(main, { childId, bookId, suggestAnyway: false }),
    ).toMatchObject({ ok: false, error: { code: "CONSENT_NOT_CONFIRMED" } });
    expect(await count("parentSuggestions")).toBe(0);
  });

  it("revocation race: a suggestion that meets an uncommitted revocation is refused once it commits", async () => {
    const { main, childId, familyId } = await consentedFamily();
    const bookId = await insertBook("active");
    // A fixture revocation in its own transaction, until UC-PAR-revoke-consent is built.
    const revocation = getMongoClient().startSession();
    revocation.startTransaction();
    await col("consentRecords").updateOne(
      { familyId: new ObjectId(familyId) },
      { $set: { revokedAt: AT } },
      { session: revocation },
    );

    const pending = createSuggestion(main, {
      childId,
      bookId,
      suggestAnyway: false,
    });
    await new Promise((resolve) => setTimeout(resolve, 300));
    await revocation.commitTransaction();
    await revocation.endSession();

    expect(await pending).toMatchObject({
      ok: false,
      error: { code: "CONSENT_NOT_CONFIRMED" },
    });
    expect(await count("parentSuggestions")).toBe(0);
  });

  it("racing child deletion: a suggestion that meets an uncommitted deletion is CHILD_NOT_FOUND once it commits", async () => {
    const { main, childId } = await consentedFamily();
    const bookId = await insertBook("active");
    // A fixture deletion in its own transaction, until UC-PAR-delete-kid-account merges.
    const deletion = getMongoClient().startSession();
    deletion.startTransaction();
    await col("children").deleteOne(
      { _id: childId as never },
      { session: deletion },
    );

    const pending = createSuggestion(main, {
      childId,
      bookId,
      suggestAnyway: false,
    });
    await new Promise((resolve) => setTimeout(resolve, 300));
    await deletion.commitTransaction();
    await deletion.endSession();

    expect(await pending).toMatchObject({
      ok: false,
      error: { code: "CHILD_NOT_FOUND" },
    });
    expect(await count("parentSuggestions", { childId })).toBe(0);
  });

  it("authorization: another family's, an unknown and a malformed child are all the same CHILD_NOT_FOUND", async () => {
    const mine = await consentedFamily();
    const theirs = await consentedFamily();
    const bookId = await insertBook("active");

    const results = await Promise.all(
      [theirs.childId, randomUUID(), "not-a-child-id"].map((childId) =>
        createSuggestion(mine.main, { childId, bookId, suggestAnyway: false }),
      ),
    );

    for (const result of results) {
      expect(result).toEqual(results[0]);
      expect(result).toMatchObject({
        ok: false,
        error: { code: "CHILD_NOT_FOUND" },
      });
    }
    expect(await count("parentSuggestions")).toBe(0);
  });

  it("authorization: a Sub Parent of the family may suggest", async () => {
    const { sub, childId } = await consentedFamily();
    const bookId = await insertBook("active");

    expect(
      await createSuggestion(sub, { childId, bookId, suggestAnyway: false }),
    ).toEqual({ ok: true, data: null });
  });

  it("logging: refusals are not logged, and a failure logs no note, nickname or child ID", async () => {
    const { main, childId } = await consentedFamily();
    const bookId = await insertBook("active");
    const calls: unknown[][] = [];
    for (const level of ["log", "info", "warn", "error", "debug"] as const) {
      vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
        calls.push(args);
      });
    }

    await createSuggestion(main, {
      childId,
      bookId,
      note: NOTE,
      suggestAnyway: false,
    });
    await createSuggestion(main, {
      childId,
      bookId,
      note: NOTE,
      suggestAnyway: false,
    });
    expect(calls).toEqual([]);

    const otherBook = await insertBook("active");
    failFirstSuggestionInsert(new Error(`${NOTE} ${childId}`));
    await createSuggestion(main, {
      childId,
      bookId: otherBook,
      note: NOTE,
      suggestAnyway: false,
    });
    expect(calls).toHaveLength(1);
    const logged = JSON.stringify(calls);
    for (const secret of [NOTE, "Otterpop", childId, otherBook]) {
      expect(logged).not.toContain(secret);
    }
  });
});
