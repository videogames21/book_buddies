import {
  ClientSession,
  Collection,
  MongoNetworkTimeoutError,
  ObjectId,
} from "mongodb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { insertBatch } from "../../../tests/fixtures/batches";
import { insertBook } from "../../../tests/fixtures/catalog";
import { insertReaction } from "../../../tests/fixtures/reactions";
import { insertChild } from "../../../tests/fixtures/children";
import { insertConsentedMainParent } from "../../../tests/fixtures/family";
import { insertShelfEntry } from "../../../tests/fixtures/shelf";
import { insertSuggestion } from "../../../tests/fixtures/suggestions";
import { resetDatabase } from "../../../tests/integration/db";
import type {
  ChildSession,
  ParentSession,
} from "@/server/identity-access/sessions";
import type {
  DeclineReason,
  Reaction,
} from "@/shared/recommendation/reactions";

// The suggestion release gate (README) is on for these tests; one turns it off.
const gate = vi.hoisted(() => ({ enabled: true }));
vi.mock("@/server/lib/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/lib/config")>();
  return { ...actual, areParentSuggestionsEnabled: () => gate.enabled };
});

const {
  deleteChildRecords,
  getRecommendationListForChild,
  listReactionsForExport,
  listReactionsForSignals,
  recordReaction,
} = await import("./reactions");
const { reportBook } = await import("@/server/accounts-family/book-reports");
const { deleteChild } = await import("@/server/accounts-family/child-deletion");
const { insertChildIdentity } =
  await import("@/server/child-identity/child-identity");
const { getDb, getMongoClient, withTransaction } =
  await import("@/server/lib/db");
const { resetClock, setClock } = await import("@/server/lib/clock");

// Invented data only. Every batch here is released before AT.
const AT = new Date("2026-11-27T15:00:00Z");
const EARLIER = new Date("2026-11-25T12:00:00Z");
const LATER = new Date("2026-11-26T12:00:00Z");
const NOTE = "You liked the one about otters";

const col = (name: string) => getDb().collection(name);
const count = (name: string, filter = {}) => col(name).countDocuments(filter);

/** A child of a consented family, with the age the released-batch read needs (7). */
async function childOf(familyId: string): Promise<ChildSession> {
  const childId = await insertChild(familyId);
  await withTransaction((tx) =>
    insertChildIdentity(tx, { childId, age: 7, grade: "2" }),
  );
  return {
    userId: new ObjectId().toHexString(),
    childId,
    sessionId: new ObjectId(),
  };
}

async function family() {
  const main = await insertConsentedMainParent();
  const parent: ParentSession = { ...main, parentRole: "main" };
  return { parent, child: await childOf(main.familyId) };
}

function released(childId: string, bookIds: string[], releasedAt = EARLIER) {
  return insertBatch({ childId, bookIds, status: "released", releasedAt });
}

function react(
  child: ChildSession,
  bookId: string,
  reaction: Reaction,
  declineReason?: DeclineReason,
) {
  return recordReaction(child, {
    bookId,
    reaction,
    ...(declineReason ? { declineReason } : {}),
  });
}

async function listed(child: ChildSession) {
  return (await getRecommendationListForChild(child)).map((i) => i.bookId);
}

const reactionsOf = (childId: string) =>
  col("recommendationReactions")
    .find({ childId }, { projection: { _id: 0 } })
    .sort({ reactedAt: 1, _id: 1 })
    .toArray();

const shelfOf = (childId: string) =>
  col("shelfEntries")
    .find({ childId }, { projection: { _id: 0, childId: 0 } })
    .toArray();

function exclude(childId: string, bookId: string) {
  return col("childBookExclusions").insertOne({
    childId,
    bookId,
    reportId: new ObjectId(),
    createdAt: AT,
  });
}

/** Everything a refused or failed reaction must leave as it was. */
async function snapshot() {
  return {
    reactions: await col("recommendationReactions").find().toArray(),
    shelf: await col("shelfEntries").find().toArray(),
    suggestions: await col("parentSuggestions").find().toArray(),
    books: await col("books").find().toArray(),
  };
}

/** Makes the next `method` call on `collection` fail with an invented error, without writing. */
function failOnce(
  method: "updateOne" | "insertOne" | "deleteOne",
  collection: string,
) {
  // eslint-disable-next-line @typescript-eslint/unbound-method -- called with apply(this)
  const original = Collection.prototype[method] as (
    ...args: unknown[]
  ) => unknown;
  let fired = false;
  return vi.spyOn(Collection.prototype, method).mockImplementation(function (
    this: Collection,
    ...args: unknown[]
  ) {
    if (this.collectionName === collection && !fired) {
      fired = true;
      return Promise.reject(new Error("invented write failure"));
    }
    return original.apply(this, args) as never;
  });
}

beforeEach(async () => {
  await resetDatabase();
  setClock(() => AT);
  gate.enabled = true;
});
afterEach(() => {
  vi.restoreAllMocks();
  resetClock();
});

describe("getRecommendationListForChild (UC-REC-kid-review steps 1–2)", () => {
  it("2, merged list: suggestions first, newest first, then released books, newest batch first in ranked order; each book once; only book data and the suggestion's note and label", async () => {
    const { child } = await family();
    const { childId } = child;
    const suggestedOld = await insertBook("active", "Otter Bay");
    const suggestedNew = await insertBook("active", "Fox Hill");
    const b1 = await insertBook("active", "Owl Night");
    const b2 = await insertBook("active", "Crab Cove");
    const b3 = await insertBook("active", "Bee Meadow");
    await insertSuggestion(childId, suggestedOld, {
      note: NOTE,
      suggestedAt: new Date("2026-11-20T12:00:00Z"),
    });
    await insertSuggestion(childId, suggestedNew, {
      suggestedAt: new Date("2026-11-22T12:00:00Z"),
    });
    // The older batch holds the suggested book too; b1 is in both batches.
    await released(childId, [b1, b2, suggestedOld], EARLIER);
    await released(childId, [b3, b1], LATER);

    expect(await getRecommendationListForChild(child)).toEqual([
      {
        bookId: suggestedNew,
        title: "Fox Hill",
        author: "A. Writer",
        fromGrownUp: true,
      },
      {
        bookId: suggestedOld,
        title: "Otter Bay",
        author: "A. Writer",
        note: NOTE,
        fromGrownUp: true,
      },
      { bookId: b3, title: "Bee Meadow", author: "A. Writer" },
      { bookId: b1, title: "Owl Night", author: "A. Writer" },
      { bookId: b2, title: "Crab Cove", author: "A. Writer" },
    ]);
  });

  it("2, what is left out: pending, parent-removed, reported, blocked, draft and out-of-age-band batch books; reported, blocked and draft suggestions; an out-of-age-band suggestion stays", async () => {
    const { child } = await family();
    const { childId } = child;
    const kept = await insertBook("active", "Kept");
    const pending = await insertBook("active", "Pending");
    const removed = await insertBook("active", "Removed");
    const reported = await insertBook("active", "Reported");
    const blocked = await insertBook("blocked", "Blocked");
    const draft = await insertBook("draft", "Draft");
    const tooOld = await insertBook("active", "Too old", {
      ageMin: 9,
      ageMax: 11,
    });
    await insertBatch({
      childId,
      bookIds: [pending],
      handoffDeadline: new Date("2026-11-28T12:00:00Z"),
    });
    await insertBatch({
      childId,
      bookIds: [kept, reported, blocked, draft, tooOld],
      removedBookIds: [removed],
      status: "released",
      releasedAt: EARLIER,
    });
    const sReported = await insertBook("active", "S reported");
    const sBlocked = await insertBook("blocked", "S blocked");
    const sDraft = await insertBook("draft", "S draft");
    const sTooOld = await insertBook("active", "S too old", {
      ageMin: 9,
      ageMax: 11,
    });
    for (const bookId of [sReported, sBlocked, sDraft, sTooOld]) {
      await insertSuggestion(childId, bookId);
    }
    await exclude(childId, reported);
    await exclude(childId, sReported);

    // The parent chose the suggestion, so it has no age-band filter (design/rec.md).
    expect(await listed(child)).toEqual([sTooOld, kept]);
  });

  it("2, empty: no suggestion and no unanswered released book, including a batch the parent emptied, is an empty list", async () => {
    const { child } = await family();
    await released(child.childId, []);
    expect(await getRecommendationListForChild(child)).toEqual([]);
  });

  it("child-facing: no item holds a count, date, batch ID, status, reaction history or decline reason (§8.2.11, BR-kid-no-metrics)", async () => {
    const { child } = await family();
    const answered = await insertBook("active");
    const open = await insertBook("active");
    const suggested = await insertBook("active");
    await released(child.childId, [answered, open]);
    await insertSuggestion(child.childId, suggested, { note: NOTE });
    await react(child, answered, "notForMe", "tooHard");

    const list = await getRecommendationListForChild(child);
    expect(list.map((i) => i.bookId)).toEqual([suggested, open]);
    for (const item of list) {
      expect(
        Object.keys(item).every((key) =>
          ["bookId", "title", "author", "note", "fromGrownUp"].includes(key),
        ),
      ).toBe(true);
    }
    expect(JSON.stringify(list)).not.toMatch(/tooHard|notForMe|batch|At"/);
  });
});

describe("recordReaction (UC-REC-kid-review steps 3–7)", () => {
  it("main, Yes: one readingNow entry at now(), one yes reaction naming the batch, and the book leaves the list (steps 4, 7, POST-1, POST-2)", async () => {
    const { child } = await family();
    const bookId = await insertBook("active");
    const batchId = await released(child.childId, [bookId]);

    const result = await react(child, bookId, "yes");

    expect(result).toEqual({ ok: true, data: { shelf: "added" } });
    expect(await shelfOf(child.childId)).toEqual([
      { bookId, category: "readingNow", movedAt: AT },
    ]);
    expect(await reactionsOf(child.childId)).toEqual([
      {
        childId: child.childId,
        bookId,
        reaction: "yes",
        batchIds: [new ObjectId(batchId)],
        reactedAt: AT,
      },
    ]);
    expect(await listed(child)).toEqual([]);
  });

  it("main, Maybe later: one maybeLater entry and one maybeLater reaction; the book leaves the list (step 5, POST-2)", async () => {
    const { child } = await family();
    const bookId = await insertBook("active");
    await released(child.childId, [bookId]);

    expect(await react(child, bookId, "maybeLater")).toEqual({
      ok: true,
      data: { shelf: "added" },
    });
    expect(await shelfOf(child.childId)).toEqual([
      { bookId, category: "maybeLater", movedAt: AT },
    ]);
    expect(await reactionsOf(child.childId)).toMatchObject([
      { bookId, reaction: "maybeLater" },
    ]);
    expect(await listed(child)).toEqual([]);
  });

  it("main, Not for me: one notForMe reaction with the reason, no shelf entry; the book leaves the list (step 6, POST-3)", async () => {
    const { child } = await family();
    const bookId = await insertBook("active");
    await released(child.childId, [bookId]);

    expect(await react(child, bookId, "notForMe", "notMyStyle")).toEqual({
      ok: true,
      data: { shelf: "none" },
    });
    expect(await reactionsOf(child.childId)).toMatchObject([
      { bookId, reaction: "notForMe", declineReason: "notMyStyle" },
    ]);
    expect(await shelfOf(child.childId)).toEqual([]);
    expect(await listed(child)).toEqual([]);
  });

  it("6a: Skip records notForMe with no declineReason", async () => {
    const { child } = await family();
    const bookId = await insertBook("active");
    await released(child.childId, [bookId]);

    expect((await react(child, bookId, "notForMe")).ok).toBe(true);
    const [reaction] = await reactionsOf(child.childId);
    expect(reaction).toMatchObject({ reaction: "notForMe" });
    expect(reaction).not.toHaveProperty("declineReason");
  });

  it("7, suggestion: a reaction deletes the suggestion in the same transaction; a book both suggested and released is answered once, naming the batch, and does not reappear", async () => {
    const { child } = await family();
    const onlySuggested = await insertBook("active");
    const both = await insertBook("active");
    await insertSuggestion(child.childId, onlySuggested, { note: NOTE });
    await insertSuggestion(child.childId, both);
    const batchId = await released(child.childId, [both]);

    expect(await react(child, onlySuggested, "maybeLater")).toEqual({
      ok: true,
      data: { shelf: "added" },
    });
    expect(await react(child, both, "notForMe", "notInterested")).toEqual({
      ok: true,
      data: { shelf: "none" },
    });

    expect(await count("parentSuggestions")).toBe(0);
    expect(await reactionsOf(child.childId)).toMatchObject([
      { bookId: onlySuggested, batchIds: [] },
      { bookId: both, batchIds: [new ObjectId(batchId)] },
    ]);
    expect(await listed(child)).toEqual([]);
  });

  it("7, release gate off: a stored suggestion is not in the list, so reacting to it is BOOK_NOT_IN_LIST and the suggestion is kept", async () => {
    const { child } = await family();
    const bookId = await insertBook("active");
    await insertSuggestion(child.childId, bookId);
    gate.enabled = false;
    const before = await snapshot();

    expect(await react(child, bookId, "yes")).toMatchObject({
      ok: false,
      error: { code: "BOOK_NOT_IN_LIST" },
    });
    expect(await snapshot()).toEqual(before);
  });

  it("4a: Yes, and separately Maybe later, on a book already in Finished: one entry, still Finished, the reaction recorded, the book gone, shelf alreadyOnShelf", async () => {
    const { child } = await family();
    const earlier = new Date("2026-11-01T12:00:00Z");
    for (const reaction of ["yes", "maybeLater"] as const) {
      const bookId = await insertBook("active");
      await insertShelfEntry(child.childId, bookId, "finished", earlier);
      await released(child.childId, [bookId]);

      expect(await react(child, bookId, reaction)).toEqual({
        ok: true,
        data: { shelf: "alreadyOnShelf" },
      });
      expect(
        await col("shelfEntries")
          .find({ childId: child.childId, bookId }, { projection: { _id: 0 } })
          .toArray(),
      ).toEqual([
        {
          childId: child.childId,
          bookId,
          category: "finished",
          movedAt: earlier,
        },
      ]);
      expect(await count("recommendationReactions", { bookId, reaction })).toBe(
        1,
      );
    }
    expect(await listed(child)).toEqual([]);
  });

  it("input, book: an unknown or malformed book ID, and a book already answered, are BOOK_NOT_IN_LIST and write nothing", async () => {
    const { child } = await family();
    const answered = await insertBook("active");
    await released(child.childId, [answered]);
    await react(child, answered, "yes");
    const before = await snapshot();

    for (const bookId of [
      "00000000-0000-4000-8000-000000000000",
      "not a book id ✨",
      "x".repeat(100),
      answered,
    ]) {
      expect(await react(child, bookId, "maybeLater")).toMatchObject({
        ok: false,
        error: { code: "BOOK_NOT_IN_LIST" },
      });
    }
    // Including the book's write counter: the aborted transaction leaves it as it was.
    expect(await snapshot()).toEqual(before);
  });

  it("7a: each write failing in turn (shelf entry, reaction, suggestion deletion) is SAVE_FAILED with an error ID; no reaction, no entry, the suggestion kept, the book still listed", async () => {
    const { child } = await family();
    const bookId = await insertBook("active");
    await insertSuggestion(child.childId, bookId, { note: NOTE });
    await released(child.childId, [bookId]);
    vi.spyOn(console, "error").mockImplementation(() => {});
    const before = await snapshot();

    for (const [method, collection] of [
      ["updateOne", "shelfEntries"],
      ["insertOne", "recommendationReactions"],
      ["deleteOne", "parentSuggestions"],
    ] as const) {
      const spy = failOnce(method, collection);
      const result = await react(child, bookId, "yes");
      spy.mockRestore();

      expect(result).toMatchObject({
        ok: false,
        error: { code: "SAVE_FAILED", errorId: expect.any(String) as unknown },
      });
      expect(JSON.stringify(result)).not.toContain("invented write failure");
      expect(await snapshot()).toEqual(before);
      expect(await listed(child)).toEqual([bookId]);
    }
  });

  it("7a, response lost: the commit applies, then UnknownTransactionCommitResult is OUTCOME_UNKNOWN with an error ID and one logged error; the reaction is saved; a retry is BOOK_NOT_IN_LIST and writes nothing", async () => {
    const { child } = await family();
    const bookId = await insertBook("active");
    await released(child.childId, [bookId]);
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
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await react(child, bookId, "yes");

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "OUTCOME_UNKNOWN",
        errorId: expect.any(String) as unknown,
      },
    });
    expect(JSON.stringify(result)).not.toContain("commit outcome unknown");
    expect(logged).toHaveBeenCalledTimes(1);
    if (!result.ok) {
      expect(String(logged.mock.calls[0]?.[0])).toContain(result.error.errorId);
    }
    expect(await count("recommendationReactions")).toBe(1);
    expect(await count("shelfEntries")).toBe(1);

    spy.mockRestore();
    const before = await snapshot();
    expect(await react(child, bookId, "yes")).toMatchObject({
      ok: false,
      error: { code: "BOOK_NOT_IN_LIST" },
    });
    expect(await snapshot()).toEqual(before);
  });

  it("concurrency: two simultaneous reactions to one book leave one reaction and one shelf entry; the other is BOOK_NOT_IN_LIST", async () => {
    const { child } = await family();
    const bookId = await insertBook("active");
    await released(child.childId, [bookId]);

    const results = await Promise.all([
      react(child, bookId, "yes"),
      react(child, bookId, "yes"),
    ]);

    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok)).toMatchObject([
      { error: { code: "BOOK_NOT_IN_LIST" } },
    ]);
    expect(await count("recommendationReactions")).toBe(1);
    expect(await count("shelfEntries")).toBe(1);
  });

  describe("report race", () => {
    // The book is in a released batch and in the child's pending batch, so a report is
    // allowed whichever commits first (UC-PAR-report-book PRE-3).
    async function setUp() {
      const { parent, child } = await family();
      const bookId = await insertBook("active");
      await released(child.childId, [bookId]);
      await insertBatch({
        childId: child.childId,
        bookIds: [bookId],
        handoffDeadline: new Date("2026-11-28T12:00:00Z"),
      });
      const report = () =>
        reportBook(parent, {
          childId: child.childId,
          bookId,
          reason: "other",
        });
      return { child, bookId, report };
    }

    it("reaction first: reportBook then removes its shelf entry", async () => {
      const { child, bookId, report } = await setUp();
      expect((await react(child, bookId, "yes")).ok).toBe(true);
      expect(await report()).toMatchObject({
        ok: true,
        data: { removedFromShelf: true },
      });
      expect(await count("shelfEntries", { bookId })).toBe(0);
    });

    it("report first: the reaction is BOOK_NOT_IN_LIST", async () => {
      const { child, bookId, report } = await setUp();
      expect((await report()).ok).toBe(true);
      expect(await react(child, bookId, "yes")).toMatchObject({
        ok: false,
        error: { code: "BOOK_NOT_IN_LIST" },
      });
      expect(await count("shelfEntries", { bookId })).toBe(0);
      expect(await count("recommendationReactions")).toBe(0);
    });

    it("together: whichever commits first, no shelf entry for the excluded book is left", async () => {
      const { child, bookId, report } = await setUp();
      const [reported, reacted] = await Promise.all([
        report(),
        react(child, bookId, "yes"),
      ]);
      expect(reported.ok).toBe(true);
      if (!reacted.ok) expect(reacted.error.code).toBe("BOOK_NOT_IN_LIST");
      expect(await count("childBookExclusions", { bookId })).toBe(1);
      expect(await count("shelfEntries", { bookId })).toBe(0);
    });
  });

  describe("block race (OI-58, team decision 2026-11-26)", () => {
    function block(bookId: string, session?: ClientSession) {
      return col("books").updateOne(
        { _id: bookId as never },
        { $set: { status: "blocked" } },
        { session },
      );
    }

    async function republish(bookId: string) {
      await col("books").updateOne(
        { _id: bookId as never },
        { $set: { status: "active" } },
      );
    }

    it("block first: the reaction is BOOK_NOT_IN_LIST; republishing the book later leaves no shelf entry", async () => {
      const { child } = await family();
      const bookId = await insertBook("active");
      await released(child.childId, [bookId]);
      await block(bookId);

      expect(await react(child, bookId, "yes")).toMatchObject({
        ok: false,
        error: { code: "BOOK_NOT_IN_LIST" },
      });
      await republish(bookId);
      expect(await count("shelfEntries")).toBe(0);
    });

    it("a reaction that meets an uncommitted block retries and is BOOK_NOT_IN_LIST once it commits; republishing leaves no shelf entry", async () => {
      const { child } = await family();
      const bookId = await insertBook("active");
      await released(child.childId, [bookId]);
      const blocking = getMongoClient().startSession();
      blocking.startTransaction();
      await block(bookId, blocking);

      const pending = react(child, bookId, "yes");
      await new Promise((resolve) => setTimeout(resolve, 300));
      await blocking.commitTransaction();
      await blocking.endSession();

      expect(await pending).toMatchObject({
        ok: false,
        error: { code: "BOOK_NOT_IN_LIST" },
      });
      await republish(bookId);
      expect(await count("shelfEntries")).toBe(0);
    });

    // The block's own transaction removes shelf entries of the book (removeEntriesForBook,
    // design/adm.md), and conflicts with this reaction's same-book write. That function
    // does not exist until UC-ADM-block-content is built.
    it.todo(
      "reaction first: the block that commits after the reaction removes its shelf entry (needs removeEntriesForBook from UC-ADM-block-content)",
    );
  });

  it("deletion race, reaction first: the deletion then removes its reaction and shelf entry, and no record of the child remains", async () => {
    const { parent, child } = await family();
    const bookId = await insertBook("active");
    await released(child.childId, [bookId]);

    expect((await react(child, bookId, "yes")).ok).toBe(true);
    expect((await deleteChild(parent, child.childId)).ok).toBe(true);

    expect(await count("recommendationReactions")).toBe(0);
    expect(await count("shelfEntries")).toBe(0);
  });

  it("deletion race, together: whichever commits first, no reaction or shelf entry of the child remains", async () => {
    const { parent, child } = await family();
    const bookId = await insertBook("active");
    await released(child.childId, [bookId]);

    const [reacted, deleted] = await Promise.all([
      react(child, bookId, "yes"),
      deleteChild(parent, child.childId),
    ]);

    expect(deleted.ok).toBe(true);
    if (!reacted.ok) expect(reacted.error.code).toBe("CHILD_NOT_FOUND");
    expect(await count("recommendationReactions")).toBe(0);
    expect(await count("shelfEntries")).toBe(0);
  });

  it("deletion race, deletion first: a reaction that meets an uncommitted deletion is CHILD_NOT_FOUND once it commits, and writes nothing", async () => {
    const { child } = await family();
    const bookId = await insertBook("active");
    await released(child.childId, [bookId]);
    const deleting = getMongoClient().startSession();
    deleting.startTransaction();
    await col("children").deleteOne(
      { _id: child.childId as never },
      { session: deleting },
    );

    const pending = react(child, bookId, "yes");
    await new Promise((resolve) => setTimeout(resolve, 300));
    await deleting.commitTransaction();
    await deleting.endSession();

    expect(await pending).toMatchObject({
      ok: false,
      error: { code: "CHILD_NOT_FOUND" },
    });
    expect(await count("recommendationReactions")).toBe(0);
    expect(await count("shelfEntries")).toBe(0);
  });

  it("consent: with consent revoked the reaction is CONSENT_NOT_CONFIRMED and writes nothing", async () => {
    const { parent, child } = await family();
    const bookId = await insertBook("active");
    await released(child.childId, [bookId]);
    await col("consentRecords").updateOne(
      { familyId: new ObjectId(parent.familyId) },
      { $set: { revokedAt: AT } },
    );
    const before = await snapshot();

    expect(await react(child, bookId, "yes")).toMatchObject({
      ok: false,
      error: { code: "CONSENT_NOT_CONFIRMED" },
    });
    expect(await snapshot()).toEqual(before);
  });

  it("authorization: a book only in another child's list is BOOK_NOT_IN_LIST and writes nothing", async () => {
    const { parent, child } = await family();
    const sibling = await childOf(parent.familyId);
    const bookId = await insertBook("active");
    await released(sibling.childId, [bookId]);
    await insertSuggestion(sibling.childId, await insertBook("active"));
    const before = await snapshot();

    expect(await react(child, bookId, "yes")).toMatchObject({
      ok: false,
      error: { code: "BOOK_NOT_IN_LIST" },
    });
    expect(await snapshot()).toEqual(before);
    expect(await listed(sibling)).toContain(bookId);
  });

  it("again later: a book declined from one batch and released again in a later batch is listed again, and answering it adds a second reaction", async () => {
    const { child } = await family();
    const bookId = await insertBook("active");
    await released(child.childId, [bookId], EARLIER);
    await react(child, bookId, "notForMe", "tooEasy");
    expect(await listed(child)).toEqual([]);

    const laterBatch = await released(child.childId, [bookId], LATER);
    expect(await listed(child)).toEqual([bookId]);
    expect((await react(child, bookId, "yes")).ok).toBe(true);

    expect(await reactionsOf(child.childId)).toMatchObject([
      { reaction: "notForMe" },
      { reaction: "yes", batchIds: [new ObjectId(laterBatch)] },
    ]);
    expect(await listed(child)).toEqual([]);
  });

  it("child-facing: an ok result holds only the shelf outcome (§8.2.11)", async () => {
    const { child } = await family();
    const bookId = await insertBook("active");
    await released(child.childId, [bookId]);

    const result = await react(child, bookId, "notForMe", "other");
    expect(result).toEqual({ ok: true, data: { shelf: "none" } });
  });
});

describe("listReactionsForSignals (UC-REC-kid-review signals)", () => {
  it("returns the latest reaction per book for at most 20 distinct books, newest first, only the given child's", async () => {
    const day = (n: number) =>
      new Date(Date.UTC(2026, 10, 1, 12) + n * 86400000);
    // 22 books, one reaction each on days 0–21; book-05 is answered again on day 30.
    for (let n = 0; n < 22; n++) {
      await insertReaction({
        childId: "child-1",
        bookId: `book-${String(n).padStart(2, "0")}`,
        reaction: "yes",
        reactedAt: day(n),
      });
    }
    await insertReaction({
      childId: "child-1",
      bookId: "book-05",
      reaction: "notForMe",
      declineReason: "tooHard",
      reactedAt: day(30),
    });
    // Two books at the same time: book ID ascending.
    await insertReaction({
      childId: "child-1",
      bookId: "book-tie-b",
      reaction: "maybeLater",
      reactedAt: day(29),
    });
    await insertReaction({
      childId: "child-1",
      bookId: "book-tie-a",
      reaction: "maybeLater",
      reactedAt: day(29),
    });
    await insertReaction({
      childId: "child-2",
      bookId: "book-other",
      reaction: "yes",
      reactedAt: day(40),
    });

    const signals = await withTransaction((tx) =>
      listReactionsForSignals("child-1", tx),
    );

    expect(signals).toHaveLength(20);
    expect(signals.slice(0, 3)).toEqual([
      { bookId: "book-05", reaction: "notForMe", declineReason: "tooHard" },
      { bookId: "book-tie-a", reaction: "maybeLater" },
      { bookId: "book-tie-b", reaction: "maybeLater" },
    ]);
    // Then days 21 down to 5 without book-05 again: 17 more books, so 20 in all.
    expect(signals.slice(3).map((s) => s.bookId)).toEqual(
      [21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 4].map(
        (n) => `book-${String(n).padStart(2, "0")}`,
      ),
    );
    expect(signals.map((s) => s.bookId)).not.toContain("book-other");
  });
});

describe("deleteChildRecords and listReactionsForExport (UC-REC-kid-review deletion and export)", () => {
  it("deleteChildRecords deletes every reaction of the child and no other child's; an aborted transaction deletes none", async () => {
    for (const childId of ["child-1", "child-1", "child-2"]) {
      await insertReaction({ childId, bookId: "book-1", reaction: "yes" });
    }

    await expect(
      withTransaction(async (tx) => {
        await deleteChildRecords(tx, "child-1");
        throw new Error("abort");
      }),
    ).rejects.toThrow("abort");
    expect(await count("recommendationReactions")).toBe(3);

    await withTransaction((tx) => deleteChildRecords(tx, "child-1"));
    expect(await count("recommendationReactions", { childId: "child-1" })).toBe(
      0,
    );
    expect(await count("recommendationReactions", { childId: "child-2" })).toBe(
      1,
    );
  });

  it("listReactionsForExport returns the child's reactions, newest first, for the child's family and nothing for another family", async () => {
    const mine = await family();
    const theirs = await family();
    await insertReaction({
      childId: mine.child.childId,
      bookId: "book-1",
      reaction: "yes",
      batchIds: [new ObjectId().toHexString()],
      reactedAt: EARLIER,
    });
    await insertReaction({
      childId: mine.child.childId,
      bookId: "book-2",
      reaction: "notForMe",
      declineReason: "notInterested",
      reactedAt: LATER,
    });
    await insertReaction({
      childId: theirs.child.childId,
      bookId: "book-3",
      reaction: "maybeLater",
    });

    expect(
      await withTransaction((tx) =>
        listReactionsForExport(mine.parent.familyId, mine.child.childId, tx),
      ),
    ).toEqual([
      {
        bookId: "book-2",
        reaction: "notForMe",
        declineReason: "notInterested",
        reactedAt: LATER,
      },
      { bookId: "book-1", reaction: "yes", reactedAt: EARLIER },
    ]);
    expect(
      await withTransaction((tx) =>
        listReactionsForExport(theirs.parent.familyId, mine.child.childId, tx),
      ),
    ).toEqual([]);
  });
});
