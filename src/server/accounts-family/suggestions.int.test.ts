import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import {
  ClientSession,
  Collection,
  MongoNetworkTimeoutError,
  MongoServerError,
  ObjectId,
} from "mongodb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { insertBatch } from "../../../tests/fixtures/batches";
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

const {
  createSuggestion,
  deleteChildRecords,
  deleteSuggestionsForBookInTx,
  getSuggestionConflict,
  listSuggestionsForChild,
  listSuggestionsForExport,
  removeSuggestionInTx,
} = await import("./suggestions");
const { getDb, getMongoClient, withTransaction } =
  await import("@/server/lib/db");
const { resetClock, setClock } = await import("@/server/lib/clock");
const { insertChildIdentity } =
  await import("@/server/child-identity/child-identity");

// Invented data only.
const AT = new Date("2026-11-25T15:00:00Z");
const NOTE = "You loved the last one about dragons";

/**
 * A child with its Child Identity Store record, as `createChildAccount` makes it: 4a's
 * released-batch read needs the age (design/rec.md).
 */
async function insertChildWithAge(
  familyId: string,
  overrides: { nickname?: string } = {},
) {
  const childId = await insertChild(familyId, overrides);
  await withTransaction((tx) =>
    insertChildIdentity(tx, { childId, age: 7, grade: "2" }),
  );
  return childId;
}

async function consentedFamily() {
  const main = await insertParent({ parentRole: "main" });
  await insertConsentRecord(main, true);
  const sub = await insertParent({
    parentRole: "sub",
    familyId: new ObjectId(main.familyId),
  });
  const childId = await insertChildWithAge(main.familyId, {
    nickname: "Otterpop",
  });
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
    const sibling = await insertChildWithAge(familyId, { nickname: "Pebble" });
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

  it("4a, released batch: ALREADY_RECOMMENDED with no write, also when on the shelf; suggest anyway saves it and leaves the batch", async () => {
    const { main, childId } = await consentedFamily();
    const bookId = await insertBook("active");
    const onBoth = await insertBook("active", "Tide Pool");
    await insertShelfEntry(childId, onBoth, "wantToRead");
    const batchId = await insertBatch({
      childId,
      bookIds: [bookId, onBoth],
      status: "released",
      releasedAt: new Date("2026-11-25T12:00:00Z"),
    });
    const batch = await col("recommendationBatches").findOne({
      _id: new ObjectId(batchId),
    });

    for (const id of [bookId, onBoth]) {
      expect(
        await createSuggestion(main, {
          childId,
          bookId: id,
          suggestAnyway: false,
        }),
      ).toMatchObject({ ok: false, error: { code: "ALREADY_RECOMMENDED" } });
      expect(await getSuggestionConflict(main.familyId, childId, id)).toBe(
        "recommended",
      );
    }
    expect(await count("parentSuggestions")).toBe(0);

    const anyway = await createSuggestion(main, {
      childId,
      bookId,
      note: NOTE,
      suggestAnyway: true,
    });
    expect(anyway.ok).toBe(true);
    expect(await stored()).toEqual([
      { childId, bookId, note: NOTE, suggestedAt: AT },
    ]);
    expect(
      await col("recommendationBatches").findOne({
        _id: new ObjectId(batchId),
      }),
    ).toEqual(batch);
  });

  it("4a, released batch: a book only in a pending batch, or left out of a released batch by its read, gives no warning", async () => {
    const { main, childId } = await consentedFamily();
    const pendingOnly = await insertBook("active", "Pending Only");
    // The window has not closed at AT, so this batch is still pending.
    await insertBatch({
      childId,
      bookIds: [pendingOnly],
      createdAt: new Date("2026-11-25T14:00:00Z"),
      handoffDeadline: new Date("2026-11-26T14:00:00Z"),
    });
    const excluded = await insertBook("active", "Excluded");
    await col("childBookExclusions").insertOne({
      childId,
      bookId: excluded,
      reportId: new ObjectId(),
      createdAt: AT,
    });
    const blocked = await insertBook("blocked", "Blocked");
    const draft = await insertBook("draft", "Draft");
    // The child is 7.
    const outOfBand = await insertBook("active", "Too Old", {
      ageMin: 9,
      ageMax: 11,
    });
    await insertBatch({
      childId,
      bookIds: [excluded, blocked, draft, outOfBand],
      status: "released",
      releasedAt: new Date("2026-11-25T12:00:00Z"),
    });

    for (const id of [pendingOnly, excluded, blocked, draft, outOfBand]) {
      expect(await getSuggestionConflict(main.familyId, childId, id)).toBe(
        null,
      );
    }
    // The books createSuggestion does not refuse first (1b, PRE-3) are saved.
    for (const id of [pendingOnly, outOfBand]) {
      expect(
        await createSuggestion(main, {
          childId,
          bookId: id,
          suggestAnyway: false,
        }),
      ).toEqual({ ok: true, data: null });
    }
    expect(await count("parentSuggestions")).toBe(2);
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

  it("outcome unknown: a commit that applied but reports UnknownTransactionCommitResult is OUTCOME_UNKNOWN, and a retry is ALREADY_SUGGESTED", async () => {
    const { main, childId } = await consentedFamily();
    const bookId = await insertBook("active");
    // The driver adds this label when it retried a commit to its time limit without
    // learning the outcome. Here the real transaction commits first, then the label
    // arrives, which is the case where "nothing was saved" would be false.
    // eslint-disable-next-line @typescript-eslint/unbound-method -- called with apply(this)
    const original = ClientSession.prototype.withTransaction;
    const spy = vi
      .spyOn(ClientSession.prototype, "withTransaction")
      .mockImplementationOnce(async function (
        this: ClientSession,
        ...args: Parameters<ClientSession["withTransaction"]>
      ) {
        await original.apply(this, args);
        const err = new MongoNetworkTimeoutError("commit outcome unknown");
        err.addErrorLabel("UnknownTransactionCommitResult");
        throw err;
      });
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await createSuggestion(main, {
      childId,
      bookId,
      note: NOTE,
      suggestAnyway: false,
    });

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "OUTCOME_UNKNOWN",
        errorId: expect.any(String) as unknown,
      },
    });
    if (!result.ok) expect(result.error.message).not.toMatch(/nothing/i);
    expect(JSON.stringify(result)).not.toContain("commit outcome unknown");
    expect(await stored()).toEqual([
      { childId, bookId, note: NOTE, suggestedAt: AT },
    ]);

    spy.mockRestore();
    expect(
      await createSuggestion(main, { childId, bookId, suggestAnyway: false }),
    ).toMatchObject({ ok: false, error: { code: "ALREADY_SUGGESTED" } });
  });

  it("outcome unknown, suggest anyway: the same label on the second transaction is OUTCOME_UNKNOWN too", async () => {
    const { main, childId } = await consentedFamily();
    const bookId = await insertBook("active");
    // The first insert meets a racing request's committed suggestion (duplicate key),
    // so suggest anyway runs a second transaction; that one reports the label.
    failFirstSuggestionInsert(
      new MongoServerError({
        message: "duplicate",
        code: 11000,
        keyPattern: { childId: 1, bookId: 1 },
      }),
      () => commitRacingSuggestion(childId, bookId),
    );
    // eslint-disable-next-line @typescript-eslint/unbound-method -- called with apply(this)
    const original = ClientSession.prototype.withTransaction;
    let calls = 0;
    vi.spyOn(ClientSession.prototype, "withTransaction").mockImplementation(
      async function (
        this: ClientSession,
        ...args: Parameters<ClientSession["withTransaction"]>
      ) {
        calls += 1;
        const value: unknown = await original.apply(this, args);
        if (calls === 2) {
          const err = new MongoNetworkTimeoutError("commit outcome unknown");
          err.addErrorLabel("UnknownTransactionCommitResult");
          throw err;
        }
        return value;
      },
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await createSuggestion(main, {
      childId,
      bookId,
      note: NOTE,
      suggestAnyway: true,
    });

    expect(calls).toBe(2);
    expect(result).toMatchObject({
      ok: false,
      error: { code: "OUTCOME_UNKNOWN" },
    });
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

describe("listSuggestionsForChild (UC-PAR-suggest-book step 5)", () => {
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

  const asChild = (childId: string) => ({
    userId: new ObjectId().toHexString(),
    childId,
    sessionId: new ObjectId(),
  });

  it("step 5: book ID, title, author, the note and fromGrownUp, newest first, and no other field", async () => {
    const { main, childId, familyId } = await consentedFamily();
    const sibling = await insertChild(familyId, { nickname: "Pebble" });
    const older = await insertBook("active", "Older Book");
    const newer = await insertBook("active", "Newer Book");
    await createSuggestion(main, {
      childId,
      bookId: older,
      note: NOTE,
      suggestAnyway: false,
    });
    setClock(() => new Date("2026-11-25T16:00:00Z"));
    await createSuggestion(main, {
      childId,
      bookId: newer,
      suggestAnyway: false,
    });
    await createSuggestion(main, {
      childId: sibling,
      bookId: older,
      note: "for the sibling",
      suggestAnyway: false,
    });

    expect(await listSuggestionsForChild(asChild(childId))).toEqual([
      {
        bookId: newer,
        title: "Newer Book",
        author: "A. Writer",
        fromGrownUp: true,
      },
      {
        bookId: older,
        title: "Older Book",
        author: "A. Writer",
        note: NOTE,
        fromGrownUp: true,
      },
    ]);
  });

  it("step 5, later report or block: an excluded or blocked book is no longer returned", async () => {
    const { main, childId } = await consentedFamily();
    const reported = await insertBook("active", "Reported");
    const blocked = await insertBook("active", "Blocked");
    const kept = await insertBook("active", "Kept");
    for (const bookId of [reported, blocked, kept]) {
      await createSuggestion(main, { childId, bookId, suggestAnyway: false });
    }
    await col("childBookExclusions").insertOne({
      childId,
      bookId: reported,
      reportId: new ObjectId(),
      createdAt: AT,
    });
    await col("books").updateOne(
      { _id: blocked as never },
      { $set: { status: "blocked" } },
    );

    const list = await listSuggestionsForChild(asChild(childId));
    expect(list.map((item) => item.bookId)).toEqual([kept]);
  });

  it("step 5, draft, and draft race suggest then draft: the suggestion stays stored but is not returned", async () => {
    const { main, childId } = await consentedFamily();
    const bookId = await insertBook("active");
    await createSuggestion(main, { childId, bookId, suggestAnyway: false });
    await col("books").updateOne(
      { _id: bookId as never },
      { $set: { status: "draft" } },
    );

    expect(await listSuggestionsForChild(asChild(childId))).toEqual([]);
    expect(await count("parentSuggestions", { childId })).toBe(1);
  });

  it("5a: with the clock a year on and the child still active, the suggestion is still returned", async () => {
    const { main, childId } = await consentedFamily();
    const bookId = await insertBook("active");
    await createSuggestion(main, { childId, bookId, suggestAnyway: false });
    setClock(() => new Date("2027-11-25T15:00:00Z"));

    expect(await listSuggestionsForChild(asChild(childId))).toHaveLength(1);
  });

  it("release gate: with the gate off a stored suggestion is not returned", async () => {
    const { childId } = await consentedFamily();
    const bookId = await insertBook("active");
    await insertSuggestion(childId, bookId, { note: NOTE });
    gate.enabled = false;

    expect(await listSuggestionsForChild(asChild(childId))).toEqual([]);
  });
});

describe("suggestion contracts (UC-PAR-suggest-book)", () => {
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

  /** A fixture block in one transaction, as UC-ADM-block-content's will be (design/adm.md). */
  const blockBook = (bookId: string) =>
    withTransaction(async (tx) => {
      await col("books").updateOne(
        { _id: bookId as never },
        { $set: { status: "blocked" }, $inc: { writeVersion: 1 } },
        { session: tx },
      );
      await deleteSuggestionsForBookInTx(tx, bookId);
    });

  /** A fixture child deletion, until UC-PAR-delete-kid-account (#125) merges. */
  const deleteChild = (childId: string) =>
    withTransaction(async (tx) => {
      await col("children").deleteOne(
        { _id: childId as never },
        { session: tx },
      );
      await deleteChildRecords(tx, childId);
    });

  it("suggest again after a reaction: removeSuggestionInTx deletes it, and a new suggestion has no warning", async () => {
    const { main, childId } = await consentedFamily();
    const bookId = await insertBook("active");
    await createSuggestion(main, { childId, bookId, suggestAnyway: false });

    expect(
      await withTransaction((tx) => removeSuggestionInTx(tx, childId, bookId)),
    ).toBe(true);
    expect(
      await withTransaction((tx) => removeSuggestionInTx(tx, childId, bookId)),
    ).toBe(false);
    expect(
      await createSuggestion(main, { childId, bookId, suggestAnyway: false }),
    ).toEqual({ ok: true, data: null });
  });

  it("block deletes suggestions: every child's suggestion of that book and no other; an abort deletes none", async () => {
    const one = await consentedFamily();
    const two = await consentedFamily();
    const bookId = await insertBook("active");
    const otherBook = await insertBook("active");
    await insertSuggestion(one.childId, bookId);
    await insertSuggestion(two.childId, bookId);
    await insertSuggestion(one.childId, otherBook);

    await expect(
      withTransaction(async (tx) => {
        await deleteSuggestionsForBookInTx(tx, bookId);
        throw new Error("abort the fixture transaction");
      }),
    ).rejects.toThrow();
    expect(await count("parentSuggestions")).toBe(3);

    await withTransaction((tx) => deleteSuggestionsForBookInTx(tx, bookId));
    expect((await stored()).map((doc) => String(doc.bookId))).toEqual([
      otherBook,
    ]);
  });

  it("block race, suggest then block: the block's transaction deletes the committed suggestion", async () => {
    const { main, childId } = await consentedFamily();
    const bookId = await insertBook("active");
    await createSuggestion(main, { childId, bookId, suggestAnyway: false });

    await blockBook(bookId);

    expect(await count("parentSuggestions", { bookId })).toBe(0);
  });

  it("block race, concurrent: every interleaving ends with no suggestion of the blocked book", async () => {
    for (let run = 0; run < 5; run += 1) {
      const { main, childId } = await consentedFamily();
      const bookId = await insertBook("active");

      const [suggested] = await Promise.all([
        createSuggestion(main, { childId, bookId, suggestAnyway: false }),
        blockBook(bookId),
      ]);

      expect(await count("parentSuggestions", { bookId })).toBe(0);
      if (!suggested.ok) expect(suggested.error.code).toBe("INVALID_BOOK");
    }
  });

  it("racing child deletion: a suggestion that commits first is deleted with the child, and one after is CHILD_NOT_FOUND", async () => {
    const { main, childId } = await consentedFamily();
    const bookId = await insertBook("active");
    await createSuggestion(main, { childId, bookId, suggestAnyway: false });

    await deleteChild(childId);
    expect(await count("parentSuggestions", { childId })).toBe(0);

    expect(
      await createSuggestion(main, { childId, bookId, suggestAnyway: false }),
    ).toMatchObject({ ok: false, error: { code: "CHILD_NOT_FOUND" } });
    expect(await count("parentSuggestions", { childId })).toBe(0);
  });

  it("racing child deletion, concurrent: whichever commits, no suggestion for the child remains", async () => {
    for (let run = 0; run < 5; run += 1) {
      const { main, childId } = await consentedFamily();
      const bookId = await insertBook("active");

      const [suggested] = await Promise.all([
        createSuggestion(main, { childId, bookId, suggestAnyway: false }),
        deleteChild(childId),
      ]);

      expect(await count("parentSuggestions", { childId })).toBe(0);
      if (!suggested.ok) expect(suggested.error.code).toBe("CHILD_NOT_FOUND");
    }
  });

  it("deleteChildRecords deletes only that child's suggestions", async () => {
    const { childId, familyId } = await consentedFamily();
    const sibling = await insertChild(familyId);
    const bookId = await insertBook("active");
    await insertSuggestion(childId, bookId);
    await insertSuggestion(sibling, bookId);

    await withTransaction((tx) => deleteChildRecords(tx, childId));

    expect((await stored()).map((doc) => String(doc.childId))).toEqual([
      sibling,
    ]);
  });

  it("review and export: every suggestion of the child, a draft book's included; another family gets none", async () => {
    const mine = await consentedFamily();
    const theirs = await consentedFamily();
    const draftLater = await insertBook("active", "Back To Draft");
    await createSuggestion(mine.main, {
      childId: mine.childId,
      bookId: draftLater,
      note: NOTE,
      suggestAnyway: false,
    });
    await col("books").updateOne(
      { _id: draftLater as never },
      { $set: { status: "draft" } },
    );

    expect(
      await withTransaction((tx) =>
        listSuggestionsForExport(mine.familyId, mine.childId, tx),
      ),
    ).toEqual([{ bookId: draftLater, note: NOTE, suggestedAt: AT }]);
    expect(
      await withTransaction((tx) =>
        listSuggestionsForExport(theirs.familyId, mine.childId, tx),
      ),
    ).toEqual([]);
  });

  it("admin boundary: no admin or Catalog code imports suggestions.ts", () => {
    const srcRoot = join(process.cwd(), "src");
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) walk(path);
        else if (
          /\.tsx?$/.test(entry.name) &&
          !/\.test\.tsx?$/.test(entry.name)
        )
          files.push(path);
      }
    };
    walk(srcRoot);
    const importPattern =
      /from "(\.\/suggestions|@\/server\/accounts-family\/suggestions)"/;
    const importers = files
      .filter((file) => importPattern.test(readFileSync(file, "utf8")))
      .map((file) => relative(srcRoot, file).split(sep).join("/"));

    // reportBook is the one caller today; the PR 2 pages and action join it.
    expect(importers).toContain("server/accounts-family/book-reports.ts");
    for (const importer of importers) {
      expect(importer).not.toMatch(/(^|\/)(\(admin\)|admin|catalog)\//);
    }
  });
});
