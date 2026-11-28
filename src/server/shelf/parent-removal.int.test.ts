import { randomUUID } from "node:crypto";
import { ClientSession, Collection, MongoServerError, ObjectId } from "mongodb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { insertBook } from "../../../tests/fixtures/catalog";
import { insertChild } from "../../../tests/fixtures/children";
import { insertConsentRecord } from "../../../tests/fixtures/family";
import {
  insertFinishConfirmation,
  insertRating,
  insertShelfEntry,
} from "../../../tests/fixtures/shelf";
import { insertParent } from "../../../tests/fixtures/users";
import { resetDatabase } from "../../../tests/integration/db";

// design/shlf.md, Tests, "UC-SHLF-parent-remove-book": the transaction's rows. The
// action's and the page's rows are next to them under src/app. Invented data only.

// Runs once, inside whichever transaction appends the next audit entry, after that
// entry: the point where the transaction has made every write and not yet committed.
// The race rows use it to start a competing write at a known moment.
const afterAudit = vi.hoisted(() => ({
  run: null as null | (() => Promise<void>),
}));
vi.mock("@/server/audit/audit-log", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/server/audit/audit-log")>();
  return {
    ...actual,
    appendAudit: async (...args: Parameters<typeof actual.appendAudit>) => {
      await actual.appendAudit(...args);
      const run = afterAudit.run;
      afterAudit.run = null;
      if (run) await run();
    },
  };
});

const { removeBookForParent } = await import("./parent-removal");
const { getShelfForParent } = await import("./parent-shelf");
const { getShelfForChild } = await import("./child-shelf");
const { reportBook, listExcludedBookIds } =
  await import("@/server/accounts-family/book-reports");
const { deleteChild } = await import("@/server/accounts-family/child-deletion");
const { markNoticeSeen } = await import("@/server/notification/child-notices");
const { getDb, getMongoClient, withTransaction } =
  await import("@/server/lib/db");
const { resetClock, setClock } = await import("@/server/lib/clock");

const AT = new Date("2026-11-24T15:00:00Z");

async function consentedFamily() {
  const main = await insertParent({ parentRole: "main" });
  await insertConsentRecord(main, true);
  const sub = await insertParent({
    parentRole: "sub",
    familyId: new ObjectId(main.familyId),
  });
  const childId = await insertChild(main.familyId, { nickname: "Starfish" });
  return {
    main: { ...main, parentRole: "main" as const },
    sub: { ...sub, parentRole: "sub" as const },
    childId,
    familyId: main.familyId,
  };
}

async function bookOnShelf(childId: string, title = "Moon Garden") {
  const bookId = await insertBook("active", title);
  await insertShelfEntry(childId, bookId, "readingNow");
  return bookId;
}

const col = (name: string) => getDb().collection(name);
const count = (name: string, filter = {}) => col(name).countDocuments(filter);
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const codeOf = (r: { ok: boolean; error?: { code: string } }) =>
  r.ok ? "ok" : r.error?.code;

/** Everything a refused removal must leave as it was, compared in full. */
async function stored(childId: string, familyId: string) {
  return {
    entries: await col("shelfEntries").find({ childId }).toArray(),
    notices: await col("childNotices").find({ childId }).toArray(),
    audit: await col("auditLog").find().toArray(),
    child: await col("children").findOne({ _id: childId as never }),
    consent: await col("consentRecords").findOne({
      familyId: new ObjectId(familyId),
    }),
  };
}

/** A competing write in its own transaction, rerun on a conflict as the driver does. */
const inOwnTransaction = (write: (tx: ClientSession) => Promise<unknown>) =>
  withTransaction(async (tx) => {
    await write(tx);
  });

describe("removeBookForParent (UC-SHLF-parent-remove-book)", () => {
  beforeEach(async () => {
    await resetDatabase();
    setClock(() => AT);
    afterAudit.run = null;
  });
  afterEach(() => {
    vi.restoreAllMocks();
    resetClock();
  });

  it("main: deletes the entry, writes one notice with no reason or parent, and one IDs-only audit entry", async () => {
    const { main, childId } = await consentedFamily();
    const bookId = await bookOnShelf(childId);
    const entry = await col("shelfEntries").findOne({ childId, bookId });

    const result = await removeBookForParent(main, { childId, bookId });

    expect(result).toEqual({ ok: true, data: null });
    expect(await count("shelfEntries", { childId, bookId })).toBe(0);
    expect(
      await col("childNotices")
        .find({}, { projection: { _id: 0 } })
        .toArray(),
    ).toEqual([{ childId, kind: "book-removed", bookId, createdAt: AT }]);
    expect(
      await col("auditLog")
        .find({}, { projection: { _id: 0 } })
        .toArray(),
    ).toEqual([
      {
        event: "shelf.parent-removed",
        actorId: new ObjectId(main.userId),
        actorRole: "parent",
        childId,
        recordId: entry?._id,
        bookId,
        occurredAt: AT,
      },
    ]);
  });

  it("main, Sub Parent: the same result, with the Sub Parent as the actor", async () => {
    const { sub, childId } = await consentedFamily();
    const bookId = await bookOnShelf(childId);

    expect(await removeBookForParent(sub, { childId, bookId })).toEqual({
      ok: true,
      data: null,
    });
    expect(await count("childNotices", { childId, bookId })).toBe(1);
    expect(await col("auditLog").findOne()).toMatchObject({
      actorId: new ObjectId(sub.userId),
    });
  });

  it("5c: the rating and finish confirmation stay; the parent's view hides them until the book is back", async () => {
    const { main, childId, familyId } = await consentedFamily();
    const bookId = await bookOnShelf(childId);
    await insertFinishConfirmation(childId, bookId);
    await insertRating(childId, bookId, "likedIt");
    const kept = async () => ({
      ratings: await col("ratings").find({ childId }).toArray(),
      confirmations: await col("finishConfirmations")
        .find({ childId })
        .toArray(),
    });
    const before = await kept();

    expect((await removeBookForParent(main, { childId, bookId })).ok).toBe(
      true,
    );

    expect(await kept()).toEqual(before);
    const books = async () =>
      (await getShelfForParent(familyId, childId))?.categories.flatMap(
        (group) => group.entries,
      );
    expect(await books()).toEqual([]);
    await insertShelfEntry(childId, bookId, "finished");
    expect(await books()).toMatchObject([
      { bookId, confirmed: true, rating: "likedIt" },
    ]);
  });

  it("3b, action: a book not on the shelf is ALREADY_OFF_SHELF, nothing written, writeVersion unchanged", async () => {
    const { main, childId, familyId } = await consentedFamily();
    const bookId = await insertBook("active");
    const before = await stored(childId, familyId);

    const result = await removeBookForParent(main, { childId, bookId });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "ALREADY_OFF_SHELF" },
    });
    expect(await stored(childId, familyId)).toEqual(before);
  });

  it("3b, race, two parents and a double submit: one deletion, one notice, one audit entry; the loser writes nothing", async () => {
    const { main, sub, childId } = await consentedFamily();
    const first = await bookOnShelf(childId);
    const second = await bookOnShelf(childId, "River Song");

    const twoParents = await Promise.all([
      removeBookForParent(main, { childId, bookId: first }),
      removeBookForParent(sub, { childId, bookId: first }),
    ]);
    const doubleSubmit = await Promise.all([
      removeBookForParent(main, { childId, bookId: second }),
      removeBookForParent(main, { childId, bookId: second }),
    ]);

    for (const [results, bookId] of [
      [twoParents, first],
      [doubleSubmit, second],
    ] as const) {
      expect(results.map(codeOf).sort()).toEqual(["ALREADY_OFF_SHELF", "ok"]);
      expect(await count("shelfEntries", { childId, bookId })).toBe(0);
      expect(await count("childNotices", { childId, bookId })).toBe(1);
      expect(
        await count("auditLog", { event: "shelf.parent-removed", bookId }),
      ).toBe(1);
    }
  });

  // UC-SHLF-kid-remove-book is not built, so the child's removal is a fixture that
  // deletes the entry in its own transaction and writes nothing else, as that flow will.
  const childRemoves = (childId: string, bookId: string) =>
    inOwnTransaction((tx) =>
      col("shelfEntries").deleteOne({ childId, bookId }, { session: tx }),
    );

  it("3b, race, parent and child: the parent wins and writes one notice and one audit entry", async () => {
    const { main, childId } = await consentedFamily();
    const bookId = await bookOnShelf(childId);
    let child: Promise<void> | undefined;
    afterAudit.run = async () => {
      child = childRemoves(childId, bookId);
      await pause(200);
    };

    const result = await removeBookForParent(main, { childId, bookId });
    expect(child).toBeDefined();
    await child;

    expect(result.ok).toBe(true);
    expect(await count("shelfEntries", { childId, bookId })).toBe(0);
    expect(await count("childNotices", { childId })).toBe(1);
    expect(await count("auditLog", { event: "shelf.parent-removed" })).toBe(1);
  });

  it("3b, race, parent and child: the child wins, and the parent gets ALREADY_OFF_SHELF and writes nothing", async () => {
    const { main, childId } = await consentedFamily();
    const bookId = await bookOnShelf(childId);
    const child = getMongoClient().startSession();
    child.startTransaction();
    await col("shelfEntries").deleteOne(
      { childId, bookId },
      { session: child },
    );

    const pending = removeBookForParent(main, { childId, bookId });
    await pause(300);
    await child.commitTransaction();
    await child.endSession();

    expect(await pending).toMatchObject({
      ok: false,
      error: { code: "ALREADY_OFF_SHELF" },
    });
    expect(await count("shelfEntries", { childId, bookId })).toBe(0);
    expect(await count("childNotices")).toBe(0);
    expect(await count("auditLog")).toBe(0);
  });

  it("3b, race, parent and report: the removal wins; reportBook gets NOT_ON_SHELF_OR_BATCH and writes nothing", async () => {
    const { main, sub, childId } = await consentedFamily();
    const bookId = await bookOnShelf(childId);
    let report: ReturnType<typeof reportBook> | undefined;
    afterAudit.run = async () => {
      report = reportBook(sub, { childId, bookId, reason: "other" });
      await pause(200);
    };

    const removal = await removeBookForParent(main, { childId, bookId });

    expect(removal.ok).toBe(true);
    expect(report).toBeDefined();
    expect(await report).toMatchObject({
      ok: false,
      error: { code: "NOT_ON_SHELF_OR_BATCH" },
    });
    expect(await count("shelfEntries", { childId, bookId })).toBe(0);
    expect(await count("childNotices")).toBe(1);
    expect(await count("auditLog", { event: "shelf.parent-removed" })).toBe(1);
    expect(await count("auditLog", { event: "book.reported" })).toBe(0);
    expect(await count("bookReports")).toBe(0);
    expect(await count("childBookExclusions")).toBe(0);
  });

  it("3b, race, parent and report: the report wins with its own effects, and the removal gets ALREADY_OFF_SHELF", async () => {
    const { main, sub, childId } = await consentedFamily();
    const bookId = await bookOnShelf(childId);
    let removal: ReturnType<typeof removeBookForParent> | undefined;
    afterAudit.run = async () => {
      removal = removeBookForParent(main, { childId, bookId });
      await pause(200);
    };

    const report = await reportBook(sub, { childId, bookId, reason: "other" });

    expect(report).toEqual({ ok: true, data: { removedFromShelf: true } });
    expect(removal).toBeDefined();
    expect(await removal).toMatchObject({
      ok: false,
      error: { code: "ALREADY_OFF_SHELF" },
    });
    expect(await count("shelfEntries", { childId, bookId })).toBe(0);
    expect(await count("bookReports")).toBe(1);
    expect(await count("childBookExclusions")).toBe(1);
    expect(await count("childNotices")).toBe(1);
    expect(
      await col("auditLog")
        .find({}, { projection: { _id: 0, event: 1, actorId: 1 } })
        .sort({ event: 1 })
        .toArray(),
    ).toEqual([
      { event: "book.reported", actorId: new ObjectId(sub.userId) },
      { event: "shelf.parent-removed", actorId: new ObjectId(sub.userId) },
    ]);
  });

  it("5a, forced abort: a failed notice insert, and separately a failed audit append, roll back fully", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    for (const failing of ["childNotices", "auditLog"]) {
      await resetDatabase();
      const { main, childId, familyId } = await consentedFamily();
      const bookId = await bookOnShelf(childId);
      const before = await stored(childId, familyId);
      // eslint-disable-next-line @typescript-eslint/unbound-method -- called with apply(this)
      const original = Collection.prototype.insertOne;
      const spy = vi
        .spyOn(Collection.prototype, "insertOne")
        .mockImplementation(function (
          this: Collection,
          ...args: Parameters<Collection["insertOne"]>
        ) {
          return this.collectionName === failing
            ? Promise.reject(new Error(`${failing} store down`))
            : original.apply(this, args);
        });

      const result = await removeBookForParent(main, { childId, bookId });
      spy.mockRestore();

      expect(result).toMatchObject({
        ok: false,
        error: { code: "SAVE_FAILED", errorId: expect.any(String) as unknown },
      });
      expect(JSON.stringify(result)).not.toContain("store down");
      expect(await stored(childId, familyId)).toEqual(before);
    }
  });

  it("5a, response lost: the commit applies and its answer is lost; OUTCOME_UNKNOWN, saved once, and a retry is ALREADY_OFF_SHELF", async () => {
    const { main, childId } = await consentedFamily();
    const bookId = await bookOnShelf(childId);
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    // eslint-disable-next-line @typescript-eslint/unbound-method -- called with apply(this)
    const commit = ClientSession.prototype.commitTransaction;
    let lost = false;
    vi.spyOn(ClientSession.prototype, "commitTransaction").mockImplementation(
      async function (this: ClientSession, ...args) {
        await commit.apply(this, args);
        if (lost) return;
        lost = true;
        // How the driver ends its commit retries at its time limit: the label, with
        // MaxTimeMSExpired, so withTransaction stops retrying and throws it.
        const err = new MongoServerError({
          message: "commit outcome unknown",
          code: 50,
        });
        err.addErrorLabel("UnknownTransactionCommitResult");
        throw err;
      },
    );

    const result = await removeBookForParent(main, { childId, bookId });

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "OUTCOME_UNKNOWN",
        errorId: expect.any(String) as unknown,
      },
    });
    expect(JSON.stringify(result)).not.toContain("commit outcome unknown");
    expect(logged).toHaveBeenCalledTimes(1);
    const errorId = result.ok ? "" : (result.error.errorId ?? "");
    expect(String(logged.mock.calls[0]?.[0])).toContain(errorId);
    expect(await count("shelfEntries", { childId, bookId })).toBe(0);
    expect(await count("childNotices")).toBe(1);
    expect(await count("auditLog")).toBe(1);

    expect(await removeBookForParent(main, { childId, bookId })).toMatchObject({
      ok: false,
      error: { code: "ALREADY_OFF_SHELF" },
    });
    expect(await count("childNotices")).toBe(1);
    expect(await count("auditLog")).toBe(1);
  });

  it("5b: the notice never expires, shows on every load, and goes only when the child taps OK", async () => {
    const { main, childId } = await consentedFamily();
    const bookId = await bookOnShelf(childId);
    await removeBookForParent(main, { childId, bookId });

    for (const later of [AT, new Date("2027-11-24T15:00:00Z")]) {
      setClock(() => later);
      expect((await getShelfForChild(childId)).notices).toHaveLength(1);
      expect((await getShelfForChild(childId)).notices).toHaveLength(1);
    }
    // The write behind dismissChildNotice, whose own rows are in its action's tests.
    const notice = (await getShelfForChild(childId)).notices.at(0);
    await markNoticeSeen(childId, notice?.id ?? "");
    expect((await getShelfForChild(childId)).notices).toEqual([]);
  });

  it("kid view: the book is gone and the notice carries the title only; with no Catalog book, no title", async () => {
    const { main, childId } = await consentedFamily();
    const shown = await bookOnShelf(childId, "Moon Garden");
    const hidden = await bookOnShelf(childId, "River Song");
    await removeBookForParent(main, { childId, bookId: shown });
    await removeBookForParent(main, { childId, bookId: hidden });
    await col("books").updateOne(
      { _id: hidden as never },
      { $set: { status: "blocked" } },
    );

    const view = await getShelfForChild(childId);

    expect(view.categories.flatMap((group) => group.entries)).toEqual([]);
    expect(view.notices.map(({ kind, title }) => ({ kind, title }))).toEqual([
      { kind: "book-removed", title: "Moon Garden" },
      { kind: "book-removed", title: undefined },
    ]);
    expect(JSON.stringify(view)).not.toMatch(/parent|reason/i);
  });

  it("authorization: another family's, an unknown and a malformed child are the same CHILD_NOT_FOUND, nothing written", async () => {
    const mine = await consentedFamily();
    const theirs = await consentedFamily();
    const bookId = await bookOnShelf(theirs.childId);
    const before = await stored(theirs.childId, theirs.familyId);

    const results = await Promise.all(
      [theirs.childId, randomUUID(), "%00{$gt}"].map((childId) =>
        removeBookForParent(mine.main, { childId, bookId }),
      ),
    );

    for (const result of results) {
      expect(result).toEqual(results[0]);
      expect(result).toMatchObject({
        ok: false,
        error: { code: "CHILD_NOT_FOUND" },
      });
    }
    expect(await stored(theirs.childId, theirs.familyId)).toEqual(before);
    expect(await count("childNotices")).toBe(0);
  });

  it("child deleted: a removal racing the deletion leaves no notice, and one after it is CHILD_NOT_FOUND", async () => {
    const { main, childId } = await consentedFamily();
    const bookId = await bookOnShelf(childId);
    const deletion = getMongoClient().startSession();
    deletion.startTransaction();
    await col("children").deleteOne(
      { _id: childId as never },
      { session: deletion },
    );
    const pending = removeBookForParent(main, { childId, bookId });
    await pause(300);
    await deletion.commitTransaction();
    await deletion.endSession();

    expect(await pending).toMatchObject({
      ok: false,
      error: { code: "CHILD_NOT_FOUND" },
    });
    expect(await count("childNotices")).toBe(0);
    expect(await count("auditLog")).toBe(0);

    const other = await insertChild(main.familyId, { nickname: "Comet" });
    const otherBook = await bookOnShelf(other);
    expect((await deleteChild(main, other)).ok).toBe(true);
    expect(
      await removeBookForParent(main, { childId: other, bookId: otherBook }),
    ).toMatchObject({ ok: false, error: { code: "CHILD_NOT_FOUND" } });
    expect(await count("childNotices", { childId: other })).toBe(0);
  });

  it("5d: revoked and never-confirmed consent are refused with nothing changed; a removal bumps consentWriteVersion by one", async () => {
    const unconfirmed = await insertParent({ parentRole: "main" });
    await insertConsentRecord(unconfirmed, false);
    const child = await insertChild(unconfirmed.familyId);
    const book = await bookOnShelf(child);
    const beforeUnconfirmed = await stored(child, unconfirmed.familyId);
    expect(
      await removeBookForParent(
        { ...unconfirmed, parentRole: "main" },
        { childId: child, bookId: book },
      ),
    ).toMatchObject({ ok: false, error: { code: "CONSENT_NOT_CONFIRMED" } });
    expect(await stored(child, unconfirmed.familyId)).toEqual(
      beforeUnconfirmed,
    );

    const { main, childId, familyId } = await consentedFamily();
    const bookId = await bookOnShelf(childId);
    expect((await removeBookForParent(main, { childId, bookId })).ok).toBe(
      true,
    );
    const consent = () =>
      col("consentRecords").findOne({ familyId: new ObjectId(familyId) });
    expect((await consent())?.consentWriteVersion).toBe(1);

    await col("consentRecords").updateOne(
      { familyId: new ObjectId(familyId) },
      { $set: { revokedAt: AT } },
    );
    const second = await bookOnShelf(childId, "River Song");
    const beforeRevoked = await stored(childId, familyId);
    expect(
      await removeBookForParent(main, { childId, bookId: second }),
    ).toMatchObject({ ok: false, error: { code: "CONSENT_NOT_CONFIRMED" } });
    expect(await stored(childId, familyId)).toEqual(beforeRevoked);
  });

  // A fixture revocation in its own transaction, until UC-PAR-revoke-consent is built.
  const revoke = (familyId: string, tx: ClientSession) =>
    col("consentRecords").updateOne(
      { familyId: new ObjectId(familyId) },
      { $set: { revokedAt: AT } },
      { session: tx },
    );

  it("5d, race, revocation first: the removal is refused and nothing it wrote is kept", async () => {
    const { main, childId, familyId } = await consentedFamily();
    const bookId = await bookOnShelf(childId);
    const revocation = getMongoClient().startSession();
    revocation.startTransaction();
    await revoke(familyId, revocation);
    const before = await stored(childId, familyId);

    const pending = removeBookForParent(main, { childId, bookId });
    await pause(300);
    await revocation.commitTransaction();
    await revocation.endSession();

    expect(await pending).toMatchObject({
      ok: false,
      error: { code: "CONSENT_NOT_CONFIRMED" },
    });
    const after = await stored(childId, familyId);
    expect(after.entries).toEqual(before.entries);
    expect(after.notices).toEqual(before.notices);
    expect(after.audit).toEqual(before.audit);
    expect(after.child).toEqual(before.child);
    expect(after.consent).toEqual({ ...before.consent, revokedAt: AT });
  });

  it("5d, race, removal first: the removal commits, then the rerun revocation commits", async () => {
    const { main, childId, familyId } = await consentedFamily();
    const bookId = await bookOnShelf(childId);
    let revocation: Promise<void> | undefined;
    afterAudit.run = async () => {
      revocation = inOwnTransaction((tx) => revoke(familyId, tx));
      await pause(200);
    };

    const result = await removeBookForParent(main, { childId, bookId });
    expect(revocation).toBeDefined();
    await revocation;

    expect(result.ok).toBe(true);
    expect(await count("shelfEntries", { childId, bookId })).toBe(0);
    expect(await count("childNotices")).toBe(1);
    expect(await count("auditLog")).toBe(1);
    expect(
      await col("consentRecords").findOne({ familyId: new ObjectId(familyId) }),
    ).toMatchObject({ revokedAt: AT, consentWriteVersion: 1 });
  });

  it("no exclusion: the book is not excluded for the child and no report is written", async () => {
    const { main, childId } = await consentedFamily();
    const bookId = await bookOnShelf(childId);

    await removeBookForParent(main, { childId, bookId });

    expect(await listExcludedBookIds(childId)).not.toContain(bookId);
    expect(await count("bookReports")).toBe(0);
  });

  it("logging: a failed or refused removal logs no title, nickname or notice text (§8.2.7)", async () => {
    const lines: string[] = [];
    for (const level of ["error", "warn", "info", "log"] as const) {
      vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
        lines.push(args.map(String).join(" "));
      });
    }
    const { main, childId } = await consentedFamily();
    const bookId = await bookOnShelf(childId, "Moon Garden");
    await removeBookForParent(main, { childId, bookId: randomUUID() });
    // eslint-disable-next-line @typescript-eslint/unbound-method -- called with apply(this)
    const original = Collection.prototype.insertOne;
    vi.spyOn(Collection.prototype, "insertOne").mockImplementation(function (
      this: Collection,
      ...args: Parameters<Collection["insertOne"]>
    ) {
      return this.collectionName === "childNotices"
        ? Promise.reject(new Error("Moon Garden was taken off your shelf"))
        : original.apply(this, args);
    });
    await removeBookForParent(main, { childId, bookId });

    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(line).not.toMatch(/Moon Garden|Starfish|taken off/);
    }
  });
});
