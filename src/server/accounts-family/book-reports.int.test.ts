import { Collection, MongoServerError, ObjectId } from "mongodb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { insertBatch } from "../../../tests/fixtures/batches";
import { insertBook } from "../../../tests/fixtures/catalog";
import { insertChild } from "../../../tests/fixtures/children";
import { insertConsentRecord } from "../../../tests/fixtures/family";
import {
  insertFinishConfirmation,
  insertRating,
  insertShelfEntry,
} from "../../../tests/fixtures/shelf";
import { insertSuggestion } from "../../../tests/fixtures/suggestions";
import { insertParent } from "../../../tests/fixtures/users";
import { resetDatabase } from "../../../tests/integration/db";

// A hook that runs right after the Catalog's book check, so a test can apply a block
// between that check and the transaction (the "blocked mid-report" row).
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

const bookReportsModule = await import("./book-reports");
const { reportBook, isExcluded, listExcludedBookIds } = bookReportsModule;
const { getDb, getMongoClient } = await import("@/server/lib/db");
const { resetClock, setClock } = await import("@/server/lib/clock");

// Invented data only.
const AT = new Date("2026-11-24T15:00:00Z");

async function consentedFamily() {
  const main = await insertParent({ parentRole: "main" });
  await insertConsentRecord(main, true);
  const sub = await insertParent({
    parentRole: "sub",
    familyId: new ObjectId(main.familyId),
  });
  const childId = await insertChild(main.familyId);
  const asMain = { ...main, parentRole: "main" as const };
  const asSub = { ...sub, parentRole: "sub" as const };
  return { main: asMain, sub: asSub, childId, familyId: main.familyId };
}

async function bookOnShelf(childId: string) {
  const bookId = await insertBook("active");
  await insertShelfEntry(childId, bookId, "readingNow");
  return bookId;
}

const col = (name: string) => getDb().collection(name);
const count = (name: string, filter = {}) => col(name).countDocuments(filter);

async function expectNothingWritten(childId: string, bookId: string) {
  expect(await count("bookReports")).toBe(0);
  expect(await count("childBookExclusions")).toBe(0);
  expect(await count("childNotices")).toBe(0);
  expect(await count("auditLog")).toBe(0);
  expect(await isExcluded(childId, bookId)).toBe(false);
}

describe("reportBook (UC-PAR-report-book)", () => {
  beforeEach(async () => {
    await resetDatabase();
    setClock(() => AT);
    afterBookCheck.run = null;
  });
  afterEach(() => {
    vi.restoreAllMocks();
    resetClock();
  });

  it("main: writes the report, the exclusion, the removal, one notice and two IDs-only audit entries", async () => {
    const { main, childId } = await consentedFamily();
    const bookId = await bookOnShelf(childId);
    const entry = await col("shelfEntries").findOne({ childId, bookId });

    const result = await reportBook(main, {
      childId,
      bookId,
      reason: "inappropriate-content",
      comment: "Too scary for bedtime",
    });

    expect(result).toEqual({ ok: true, data: { removedFromShelf: true } });
    const reports = await col("bookReports").find().toArray();
    expect(reports).toEqual([
      {
        _id: expect.any(ObjectId) as unknown,
        childId,
        bookId,
        reportedByUserId: new ObjectId(main.userId),
        reason: "inappropriate-content",
        comment: "Too scary for bedtime",
        status: "open",
        reportedAt: AT,
      },
    ]);
    const reportId = reports[0]?._id;
    expect(await col("childBookExclusions").find().toArray()).toEqual([
      {
        _id: expect.any(ObjectId) as unknown,
        childId,
        bookId,
        reportId,
        createdAt: AT,
      },
    ]);
    expect(await count("shelfEntries", { childId, bookId })).toBe(0);
    expect(
      await col("childNotices")
        .find({}, { projection: { _id: 0 } })
        .toArray(),
    ).toEqual([{ childId, kind: "book-removed", bookId, createdAt: AT }]);
    const audit = await col("auditLog")
      .find({}, { projection: { _id: 0 } })
      .sort({ event: 1 })
      .toArray();
    expect(audit).toEqual([
      {
        actorId: new ObjectId(main.userId),
        actorRole: "parent",
        event: "book.reported",
        childId,
        recordId: reportId,
        occurredAt: AT,
      },
      {
        actorId: new ObjectId(main.userId),
        actorRole: "parent",
        event: "shelf.parent-removed",
        childId,
        recordId: entry?._id,
        bookId,
        occurredAt: AT,
      },
    ]);
  });

  it("main, Sub Parent: saved the same way, with the Sub Parent as the reporting parent", async () => {
    const { sub, childId } = await consentedFamily();
    const bookId = await bookOnShelf(childId);

    const result = await reportBook(sub, {
      childId,
      bookId,
      reason: "other",
    });

    expect(result.ok).toBe(true);
    const report = await col("bookReports").findOne({ childId, bookId });
    expect(report?.reportedByUserId).toEqual(new ObjectId(sub.userId));
    // A blank comment reaches here as none, and nothing is stored for it.
    expect(report).not.toHaveProperty("comment");
  });

  it("POST-2: the book is excluded for the reported child and not for a sibling", async () => {
    const { main, childId, familyId } = await consentedFamily();
    const sibling = await insertChild(familyId, { nickname: "Comet" });
    const bookId = await bookOnShelf(childId);

    await reportBook(main, { childId, bookId, reason: "too-difficult" });

    expect(await listExcludedBookIds(childId)).toEqual([bookId]);
    expect(await listExcludedBookIds(sibling)).toEqual([]);
  });

  it("POST-6: the rating and finish confirmation stay, and another child's entry is untouched", async () => {
    const { main, childId, familyId } = await consentedFamily();
    const sibling = await insertChild(familyId, { nickname: "Comet" });
    const bookId = await bookOnShelf(childId);
    await insertRating(childId, bookId, "notForMe");
    await insertFinishConfirmation(childId, bookId);
    await insertShelfEntry(sibling, bookId, "wantToRead");

    await reportBook(main, {
      childId,
      bookId,
      reason: "inappropriate-content",
    });

    expect(await count("ratings", { childId, bookId })).toBe(1);
    expect(await count("finishConfirmations", { childId, bookId })).toBe(1);
    expect(await count("shelfEntries", { childId: sibling, bookId })).toBe(1);
  });

  it("POST-7: no exported function changes a report's status, and only the child-deletion contract deletes an exclusion", () => {
    // deleteChildRecords is UC-PAR-delete-kid-account's: it deletes the child's
    // exclusions with the rest of the child's data and keeps each report, status
    // included, without its child and comment (design/par.md, Components).
    expect(Object.keys(bookReportsModule).sort()).toEqual([
      "deleteChildRecords",
      "isExcluded",
      "listExcludedBookIds",
      "reportBook",
    ]);
  });

  it("7a: when the notice insert fails, nothing is kept and a retry succeeds", async () => {
    const { main, childId } = await consentedFamily();
    const bookId = await bookOnShelf(childId);
    // eslint-disable-next-line @typescript-eslint/unbound-method -- called with apply(this)
    const original = Collection.prototype.insertOne;
    const spy = vi
      .spyOn(Collection.prototype, "insertOne")
      .mockImplementation(function (
        this: Collection,
        ...args: Parameters<Collection["insertOne"]>
      ) {
        if (this.collectionName === "childNotices") {
          return Promise.reject(new Error("notice store down"));
        }
        return original.apply(this, args);
      });
    vi.spyOn(console, "error").mockImplementation(() => {});

    const failed = await reportBook(main, {
      childId,
      bookId,
      reason: "other",
      comment: "secret words",
    });

    expect(failed).toMatchObject({
      ok: false,
      error: { code: "SAVE_FAILED", errorId: expect.any(String) as unknown },
    });
    // The parent sees a generic message, never the exception's own (§8.2.1).
    expect(JSON.stringify(failed)).not.toContain("notice store down");
    await expectNothingWritten(childId, bookId);
    expect(await count("shelfEntries", { childId, bookId })).toBe(1);

    spy.mockRestore();
    const retried = await reportBook(main, {
      childId,
      bookId,
      reason: "other",
    });
    expect(retried.ok).toBe(true);
  });

  it("PRE-3: an active book on neither the shelf nor a pending batch is refused, and nothing is written", async () => {
    const { main, childId } = await consentedFamily();
    const bookId = await insertBook("active");

    const result = await reportBook(main, { childId, bookId, reason: "other" });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "NOT_ON_SHELF_OR_BATCH" },
    });
    await expectNothingWritten(childId, bookId);
  });

  it("7b (pending OI-54): the entry removed after the page loaded is refused today, and nothing is written", async () => {
    const { main, childId } = await consentedFamily();
    const bookId = await bookOnShelf(childId);
    // The child removed the book after the parent opened the report screen.
    await col("shelfEntries").deleteOne({ childId, bookId });

    const result = await reportBook(main, { childId, bookId, reason: "other" });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "NOT_ON_SHELF_OR_BATCH" },
    });
    await expectNothingWritten(childId, bookId);
  });

  it("7c before PRE-3: a book already reported, and so off the shelf, gets ALREADY_REPORTED", async () => {
    const { main, sub, childId } = await consentedFamily();
    const bookId = await bookOnShelf(childId);
    await reportBook(main, { childId, bookId, reason: "other" });

    for (const parent of [main, sub]) {
      const again = await reportBook(parent, {
        childId,
        bookId,
        reason: "too-difficult",
      });
      expect(again).toMatchObject({
        ok: false,
        error: { code: "ALREADY_REPORTED" },
      });
    }
    expect(await count("bookReports")).toBe(1);
    expect(await count("childBookExclusions")).toBe(1);
    expect(await count("auditLog")).toBe(2);
  });

  it("UC-PAR-suggest-book: a report deletes the child's pending suggestion of the book and leaves a sibling's", async () => {
    const { main, childId, familyId } = await consentedFamily();
    const sibling = await insertChild(familyId);
    const bookId = await bookOnShelf(childId);
    await insertSuggestion(childId, bookId, { note: "from a grown-up" });
    await insertSuggestion(sibling, bookId);

    const result = await reportBook(main, { childId, bookId, reason: "other" });

    expect(result.ok).toBe(true);
    expect(await count("parentSuggestions", { childId })).toBe(0);
    expect(await count("parentSuggestions", { childId: sibling })).toBe(1);
  });

  it("UC-PAR-suggest-book: a failure later in the report leaves the suggestion in place", async () => {
    const { main, childId } = await consentedFamily();
    const bookId = await bookOnShelf(childId);
    await insertSuggestion(childId, bookId);
    // eslint-disable-next-line @typescript-eslint/unbound-method -- called with apply(this)
    const original = Collection.prototype.insertOne;
    vi.spyOn(Collection.prototype, "insertOne").mockImplementation(function (
      this: Collection,
      ...args: Parameters<Collection["insertOne"]>
    ) {
      if (this.collectionName === "childNotices") {
        return Promise.reject(new Error("notice store down"));
      }
      return original.apply(this, args);
    });
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await reportBook(main, { childId, bookId, reason: "other" });

    expect(result).toMatchObject({ ok: false, error: { code: "SAVE_FAILED" } });
    expect(await count("parentSuggestions", { childId, bookId })).toBe(1);
  });

  it("UC-PAR-suggest-book: a book that is only suggested is still NOT_ON_SHELF_OR_BATCH and nothing is deleted", async () => {
    const { main, childId } = await consentedFamily();
    const bookId = await insertBook("active");
    await insertSuggestion(childId, bookId);

    const result = await reportBook(main, { childId, bookId, reason: "other" });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "NOT_ON_SHELF_OR_BATCH" },
    });
    expect(await count("parentSuggestions", { childId, bookId })).toBe(1);
    await expectNothingWritten(childId, bookId);
  });

  it("7c: two simultaneous reports leave exactly one report and one exclusion", async () => {
    const { main, sub, childId } = await consentedFamily();
    const bookId = await bookOnShelf(childId);

    const results = await Promise.all([
      reportBook(main, { childId, bookId, reason: "other" }),
      reportBook(sub, { childId, bookId, reason: "inappropriate-content" }),
    ]);

    const codes = results.map((r) => (r.ok ? "ok" : r.error.code)).sort();
    expect(codes).toEqual(["ALREADY_REPORTED", "ok"]);
    expect(await count("bookReports")).toBe(1);
    expect(await count("childBookExclusions")).toBe(1);
    expect(await count("childNotices")).toBe(1);
  });

  it("7c, error mapping: only a duplicate on the exclusions index is ALREADY_REPORTED", async () => {
    const { main, childId } = await consentedFamily();
    const bookId = await bookOnShelf(childId);
    // eslint-disable-next-line @typescript-eslint/unbound-method -- called with apply(this)
    const original = Collection.prototype.insertOne;
    vi.spyOn(Collection.prototype, "insertOne").mockImplementation(function (
      this: Collection,
      ...args: Parameters<Collection["insertOne"]>
    ) {
      if (this.collectionName === "bookReports") {
        return Promise.reject(
          new MongoServerError({
            message:
              "E11000 duplicate key error collection: db.bookReports index: _id_",
            code: 11000,
          }),
        );
      }
      return original.apply(this, args);
    });
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await reportBook(main, { childId, bookId, reason: "other" });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "SAVE_FAILED", errorId: expect.any(String) as unknown },
    });
    await expectNothingWritten(childId, bookId);
  });

  it("7c, error mapping: the duplicate is read from its keyPattern, not its message wording", async () => {
    const { main, childId } = await consentedFamily();
    const bookId = await bookOnShelf(childId);
    // eslint-disable-next-line @typescript-eslint/unbound-method -- called with apply(this)
    const original = Collection.prototype.insertOne;
    vi.spyOn(Collection.prototype, "insertOne").mockImplementation(function (
      this: Collection,
      ...args: Parameters<Collection["insertOne"]>
    ) {
      if (this.collectionName === "childBookExclusions") {
        return Promise.reject(
          new MongoServerError({
            message: "duplicate key (wording the server may change)",
            code: 11000,
            keyPattern: { childId: 1, bookId: 1 },
          }),
        );
      }
      return original.apply(this, args);
    });

    const result = await reportBook(main, { childId, bookId, reason: "other" });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "ALREADY_REPORTED" },
    });
    await expectNothingWritten(childId, bookId);
  });

  it("outcome unknown: an UnknownTransactionCommitResult error is OUTCOME_UNKNOWN, not SAVE_FAILED", async () => {
    const { main, childId } = await consentedFamily();
    const bookId = await bookOnShelf(childId);
    // The driver adds this label to a commit it retried until its time limit. The test
    // raises it from inside the transaction, which the driver passes through unchanged,
    // to check the mapping without waiting out that limit.
    // eslint-disable-next-line @typescript-eslint/unbound-method -- called with apply(this)
    const original = Collection.prototype.insertOne;
    vi.spyOn(Collection.prototype, "insertOne").mockImplementation(function (
      this: Collection,
      ...args: Parameters<Collection["insertOne"]>
    ) {
      if (this.collectionName === "childNotices") {
        const err = new MongoServerError({ message: "commit outcome unknown" });
        err.addErrorLabel("UnknownTransactionCommitResult");
        return Promise.reject(err);
      }
      return original.apply(this, args);
    });
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await reportBook(main, { childId, bookId, reason: "other" });

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "OUTCOME_UNKNOWN",
        errorId: expect.any(String) as unknown,
      },
    });
    if (!result.ok) expect(result.error.message).not.toMatch(/nothing/i);
  });

  it("child check: a deleted child is CHILD_NOT_FOUND, nothing is written, and the read uses the transaction", async () => {
    const { main, childId } = await consentedFamily();
    const bookId = await bookOnShelf(childId);
    const findOne = vi.spyOn(Collection.prototype, "findOne");

    const ok = await reportBook(main, { childId, bookId, reason: "other" });
    expect(ok.ok).toBe(true);
    const childRead = findOne.mock.contexts.findIndex(
      (c) => (c as Collection).collectionName === "children",
    );
    expect(findOne.mock.calls[childRead]?.[1]).toMatchObject({
      session: expect.anything() as unknown,
    });

    const other = await insertChild(main.familyId, { nickname: "Comet" });
    const otherBook = await bookOnShelf(other);
    await col("children").deleteOne({ _id: other as never });
    await col("auditLog").deleteMany({});
    await col("bookReports").deleteMany({});
    await col("childBookExclusions").deleteMany({});
    await col("childNotices").deleteMany({});

    const result = await reportBook(main, {
      childId: other,
      bookId: otherBook,
      reason: "other",
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "CHILD_NOT_FOUND" },
    });
    await expectNothingWritten(other, otherBook);
  });

  it("consent check: unconfirmed or revoked consent refuses, and a report bumps consentWriteVersion by one", async () => {
    const unconfirmed = await insertParent({ parentRole: "main" });
    await insertConsentRecord(unconfirmed, false);
    const child = await insertChild(unconfirmed.familyId);
    const book = await bookOnShelf(child);
    const asParent = { ...unconfirmed, parentRole: "main" as const };

    const refused = await reportBook(asParent, {
      childId: child,
      bookId: book,
      reason: "other",
    });
    expect(refused).toMatchObject({
      ok: false,
      error: { code: "CONSENT_NOT_CONFIRMED" },
    });
    await expectNothingWritten(child, book);
    expect(await count("shelfEntries", { childId: child })).toBe(1);

    const { main, childId, familyId } = await consentedFamily();
    const bookId = await bookOnShelf(childId);
    const updateOne = vi.spyOn(Collection.prototype, "updateOne");
    expect(
      (await reportBook(main, { childId, bookId, reason: "other" })).ok,
    ).toBe(true);
    const lock = updateOne.mock.contexts.findIndex(
      (c) => (c as Collection).collectionName === "consentRecords",
    );
    expect(updateOne.mock.calls[lock]?.[2]).toMatchObject({
      session: expect.anything() as unknown,
    });
    const record = await col("consentRecords").findOne({
      familyId: new ObjectId(familyId),
    });
    expect(record?.consentWriteVersion).toBe(1);

    await col("consentRecords").updateOne(
      { familyId: new ObjectId(familyId) },
      { $set: { revokedAt: AT } },
    );
    const second = await bookOnShelf(childId);
    const revoked = await reportBook(main, {
      childId,
      bookId: second,
      reason: "other",
    });
    expect(revoked).toMatchObject({
      ok: false,
      error: { code: "CONSENT_NOT_CONFIRMED" },
    });
    expect(await count("bookReports")).toBe(1);
    expect(await count("shelfEntries", { childId, bookId: second })).toBe(1);
  });

  it("revocation race: a report that meets an uncommitted revocation retries and is refused once it commits", async () => {
    const { main, childId, familyId } = await consentedFamily();
    const bookId = await bookOnShelf(childId);
    // A fixture revocation in its own transaction, until UC-PAR-revoke-consent is built.
    const revocation = getMongoClient().startSession();
    revocation.startTransaction();
    await col("consentRecords").updateOne(
      { familyId: new ObjectId(familyId) },
      { $set: { revokedAt: AT } },
      { session: revocation },
    );

    const pending = reportBook(main, { childId, bookId, reason: "other" });
    await new Promise((resolve) => setTimeout(resolve, 300));
    await revocation.commitTransaction();
    await revocation.endSession();

    expect(await pending).toMatchObject({
      ok: false,
      error: { code: "CONSENT_NOT_CONFIRMED" },
    });
    await expectNothingWritten(childId, bookId);
    expect(await count("shelfEntries", { childId, bookId })).toBe(1);
  });

  it("blocked mid-report: BOOK_NOT_FOUND before the book check, NOT_ON_SHELF_OR_BATCH after it, and nothing is written", async () => {
    const { main, childId } = await consentedFamily();
    // The block commits before findActiveBookIds, which reads active books only.
    const blockedBefore = await bookOnShelf(childId);
    await col("books").updateOne(
      { _id: blockedBefore as never },
      { $set: { status: "blocked" } },
    );
    const before = await reportBook(main, {
      childId,
      bookId: blockedBefore,
      reason: "other",
    });
    expect(before).toMatchObject({
      ok: false,
      error: { code: "BOOK_NOT_FOUND" },
    });

    const blockedAfter = await bookOnShelf(childId);
    // The block commits after the book check and deletes the shelf entry (UC-ADM-block-content).
    afterBookCheck.run = async () => {
      afterBookCheck.run = null;
      await col("books").updateOne(
        { _id: blockedAfter as never },
        { $set: { status: "blocked" } },
      );
      await col("shelfEntries").deleteOne({ childId, bookId: blockedAfter });
    };
    const after = await reportBook(main, {
      childId,
      bookId: blockedAfter,
      reason: "other",
    });
    expect(after).toMatchObject({
      ok: false,
      error: { code: "NOT_ON_SHELF_OR_BATCH" },
    });
    await expectNothingWritten(childId, blockedAfter);
  });

  it("7e: the notice has no expiry and stays unseen", async () => {
    const { main, childId } = await consentedFamily();
    const bookId = await bookOnShelf(childId);
    await reportBook(main, { childId, bookId, reason: "other" });
    setClock(() => new Date("2027-06-01T00:00:00Z"));

    const notice = await col("childNotices").findOne({ childId });
    expect(notice).not.toHaveProperty("seenAt");
    expect(Object.keys(notice ?? {}).sort()).toEqual([
      "_id",
      "bookId",
      "childId",
      "createdAt",
      "kind",
    ]);
  });

  it("authorization: another family's child is CHILD_NOT_FOUND and nothing is written", async () => {
    const mine = await consentedFamily();
    const theirs = await consentedFamily();
    const bookId = await bookOnShelf(theirs.childId);

    const result = await reportBook(mine.main, {
      childId: theirs.childId,
      bookId,
      reason: "other",
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "CHILD_NOT_FOUND" },
    });
    await expectNothingWritten(theirs.childId, bookId);
    expect(await count("shelfEntries", { childId: theirs.childId })).toBe(1);
  });
});

describe("reportBook, 7d (UC-PAR-report-book with UC-REC-parent-review)", () => {
  beforeEach(async () => {
    await resetDatabase();
    // Before the fixture batch's handoffDeadline (2026-11-25T12:00Z).
    setClock(() => new Date("2026-11-24T18:00:00Z"));
    afterBookCheck.run = null;
  });
  afterEach(resetClock);

  const batch = (batchId: string) =>
    col("recommendationBatches").findOne({ _id: new ObjectId(batchId) });

  it("from a pending batch only: saved, the book leaves the batch, the batch stays pending, and no notice or shelf audit is written", async () => {
    const { main, childId } = await consentedFamily();
    const bookId = await insertBook("active");
    const kept = await insertBook("active");
    const batchId = await insertBatch({ childId, bookIds: [bookId, kept] });

    const result = await reportBook(main, { childId, bookId, reason: "other" });

    expect(result).toEqual({ ok: true, data: { removedFromShelf: false } });
    expect(await batch(batchId)).toMatchObject({
      status: "pending",
      bookIds: [kept],
      removedBookIds: [bookId],
    });
    expect(await isExcluded(childId, bookId)).toBe(true);
    expect(await count("bookReports")).toBe(1);
    expect(await count("childNotices")).toBe(0);
    expect(
      await col("auditLog")
        .find({}, { projection: { _id: 0, event: 1 } })
        .toArray(),
    ).toEqual([{ event: "book.reported" }]);
  });

  it("on the shelf and in a pending batch: removed from both, with the shelf's notice", async () => {
    const { main, childId } = await consentedFamily();
    const bookId = await bookOnShelf(childId);
    const batchId = await insertBatch({ childId, bookIds: [bookId] });

    const result = await reportBook(main, { childId, bookId, reason: "other" });

    expect(result).toEqual({ ok: true, data: { removedFromShelf: true } });
    expect(await batch(batchId)).toMatchObject({
      status: "pending",
      bookIds: [],
      removedBookIds: [bookId],
    });
    expect(await count("shelfEntries", { childId, bookId })).toBe(0);
    expect(await count("childNotices")).toBe(1);
  });

  it("a released batch, a batch past handoffDeadline and another child's batch do not satisfy PRE-3, and are untouched", async () => {
    const { main, childId, familyId } = await consentedFamily();
    const sibling = await insertChild(familyId);
    const bookId = await insertBook("active");
    const released = await insertBatch({
      childId,
      bookIds: [bookId],
      status: "released",
    });
    const sibling_ = await insertBatch({ childId: sibling, bookIds: [bookId] });

    const result = await reportBook(main, { childId, bookId, reason: "other" });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "NOT_ON_SHELF_OR_BATCH" },
    });
    await expectNothingWritten(childId, bookId);
    expect((await batch(released))?.bookIds).toEqual([bookId]);
    expect((await batch(sibling_))?.bookIds).toEqual([bookId]);

    // Stored pending, but past its deadline: released on read, so not in review.
    await col("recommendationBatches").deleteMany({});
    const expired = await insertBatch({
      childId,
      bookIds: [bookId],
      handoffDeadline: new Date("2026-11-24T18:00:00Z"),
    });
    expect(
      await reportBook(main, { childId, bookId, reason: "other" }),
    ).toMatchObject({ ok: false, error: { code: "NOT_ON_SHELF_OR_BATCH" } });
    expect((await batch(expired))?.bookIds).toEqual([bookId]);
  });

  it("a failure after the batch step rolls the batch removal back with the rest", async () => {
    const { main, childId } = await consentedFamily();
    const bookId = await insertBook("active");
    const batchId = await insertBatch({ childId, bookIds: [bookId] });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    // eslint-disable-next-line @typescript-eslint/unbound-method -- called with apply(this)
    const original = Collection.prototype.insertOne;
    vi.spyOn(Collection.prototype, "insertOne").mockImplementation(function (
      this: Collection,
      ...args: Parameters<Collection["insertOne"]>
    ) {
      if (this.collectionName === "auditLog") {
        return Promise.reject(new Error("audit store down"));
      }
      return original.apply(this, args);
    });

    const result = await reportBook(main, { childId, bookId, reason: "other" });

    expect(result).toMatchObject({ ok: false, error: { code: "SAVE_FAILED" } });
    expect(await batch(batchId)).toMatchObject({ bookIds: [bookId] });
    expect(await batch(batchId)).not.toHaveProperty("removedBookIds");
  });
});
