import { Collection, MongoNetworkError, ObjectId } from "mongodb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FIXTURE_DEADLINE, insertBatch } from "../../../tests/fixtures/batches";
import { insertBook } from "../../../tests/fixtures/catalog";
import { insertChild } from "../../../tests/fixtures/children";
import { insertConsentRecord } from "../../../tests/fixtures/family";
import { insertParent } from "../../../tests/fixtures/users";
import { resetDatabase } from "../../../tests/integration/db";

const {
  confirmBatch,
  deleteChildRecords,
  getBatchForReview,
  isInPendingBatch,
  listPendingBatchesForFamily,
  removeBookFromBatch,
  releaseExpiredBatchInTx,
  releaseExpiredBatches,
  removeFromPendingBatchInTx,
} = await import("./batches");
const { getDb, withTransaction } = await import("@/server/lib/db");
const { resetClock, setClock } = await import("@/server/lib/clock");

// Invented data only. The fixture batch is created 2026-11-24T12:00Z with its
// handoffDeadline 24 hours later; NOW is in between.
const NOW = new Date("2026-11-24T18:00:00Z");

const batches = () => getDb().collection("recommendationBatches");
const stored = (batchId: string) =>
  batches().findOne({ _id: new ObjectId(batchId) });

async function family(options: { consent?: boolean } = {}) {
  const main = await insertParent({ parentRole: "main" });
  await insertConsentRecord(main, options.consent ?? true);
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

/** A pending batch of three active books for the child. */
async function pendingBatchOfThree(childId: string) {
  const bookIds = [
    await insertBook("active", "Alpha", { subjects: ["animals"] }),
    await insertBook("active", "Bravo"),
    await insertBook("active", "Charlie"),
  ];
  const batchId = await insertBatch({ childId, bookIds });
  return { batchId, bookIds };
}

async function reportFor(childId: string, bookId: string) {
  await getDb().collection("childBookExclusions").insertOne({
    childId,
    bookId,
    reportId: new ObjectId(),
    createdAt: NOW,
  });
}

beforeEach(async () => {
  await resetDatabase();
  setClock(() => NOW);
});
afterEach(() => {
  vi.restoreAllMocks();
  resetClock();
});

describe("UC-REC-parent-review main (steps 2-6)", () => {
  it("reads three books with title, author and tags, removes one, and confirms as released at now()", async () => {
    const { main, childId, familyId } = await family();
    const { batchId, bookIds } = await pendingBatchOfThree(childId);

    const view = await getBatchForReview(familyId, childId, batchId);
    expect(view).toEqual({
      batchId,
      childId,
      nickname: "Starfish",
      state: "pending",
      source: "rules",
      handoffDeadline: FIXTURE_DEADLINE,
      books: [
        {
          id: bookIds[0],
          title: "Alpha",
          author: "A. Writer",
          genres: ["fantasy"],
          subjects: ["animals"],
          moods: ["calm"],
          length: "quick read",
        },
        expect.objectContaining({ id: bookIds[1], title: "Bravo" }),
        expect.objectContaining({ id: bookIds[2], title: "Charlie" }),
      ],
    });

    const removed = await removeBookFromBatch(main, {
      childId,
      batchId,
      bookId: bookIds[1],
    });
    expect(removed).toEqual({ ok: true, data: null });
    expect(await stored(batchId)).toMatchObject({
      status: "pending",
      bookIds: [bookIds[0], bookIds[2]],
      removedBookIds: [bookIds[1]],
    });

    const confirmed = await confirmBatch(main, { childId, batchId });
    expect(confirmed).toEqual({ ok: true, data: { state: "released" } });
    expect(await stored(batchId)).toMatchObject({
      status: "released",
      releasedAt: NOW,
      bookIds: [bookIds[0], bookIds[2]],
    });
  });
});

describe("1, list (listPendingBatchesForFamily)", () => {
  it("lists every child's pending batches before handoffDeadline, oldest first, and nothing released, expired or of another family", async () => {
    const { familyId, childId } = await family();
    const second = await insertChild(familyId, { nickname: "Otter" });
    const book = await insertBook("active");
    const older = await insertBatch({
      childId: second,
      bookIds: [book],
      createdAt: new Date("2026-11-24T08:00:00Z"),
      handoffDeadline: new Date("2026-11-25T08:00:00Z"),
    });
    const newer = await insertBatch({ childId, bookIds: [book] });
    // A second child of the family with released, empty and expired batches only.
    const third = await insertChild(familyId, { nickname: "Heron" });
    await insertBatch({ childId: third, bookIds: [book], status: "released" });
    await insertBatch({ childId: third, bookIds: [], status: "empty" });
    // Stored pending but past its deadline: released on read (2a).
    const fourth = await insertChild(familyId, { nickname: "Wren" });
    await insertBatch({
      childId: fourth,
      bookIds: [book],
      handoffDeadline: NOW,
    });
    const other = await family();
    await insertBatch({ childId: other.childId, bookIds: [book] });

    expect(await listPendingBatchesForFamily(familyId)).toEqual([
      {
        batchId: older,
        childId: second,
        nickname: "Otter",
        bookCount: 1,
        handoffDeadline: new Date("2026-11-25T08:00:00Z"),
      },
      {
        batchId: newer,
        childId,
        nickname: "Starfish",
        bookCount: 1,
        handoffDeadline: FIXTURE_DEADLINE,
      },
    ]);
  });

  it("counts only the remaining books: not reported, blocked or draft ones", async () => {
    const { familyId, childId } = await family();
    const kept = await insertBook("active");
    const reported = await insertBook("active");
    const blocked = await insertBook("blocked");
    const draft = await insertBook("draft");
    await insertBatch({ childId, bookIds: [kept, reported, blocked, draft] });
    await reportFor(childId, reported);

    const [line] = await listPendingBatchesForFamily(familyId);
    expect(line.bookCount).toBe(1);
  });

  it("is empty for a family with no children", async () => {
    const parent = await insertParent({ parentRole: "main" });
    expect(await listPendingBatchesForFamily(parent.familyId)).toEqual([]);
  });
});

describe("2, access, and input", () => {
  it("gives the same not-found for another family's child, an unknown or malformed child or batch ID, and another child's batch, and changes nothing", async () => {
    const { main, childId, familyId } = await family();
    const { batchId, bookIds } = await pendingBatchOfThree(childId);
    const sibling = await insertChild(familyId, { nickname: "Otter" });
    const other = await family();
    const otherBatch = await insertBatch({
      childId: other.childId,
      bookIds: [bookIds[0]],
    });
    const bookId = bookIds[0] as string;
    const unknownBatch = new ObjectId().toHexString();

    const cases: { childId: string; batchId: string; code: string }[] = [
      { childId: other.childId, batchId: otherBatch, code: "CHILD_NOT_FOUND" },
      { childId: "unknown-child", batchId, code: "CHILD_NOT_FOUND" },
      { childId: "", batchId, code: "CHILD_NOT_FOUND" },
      { childId, batchId: unknownBatch, code: "BATCH_NOT_FOUND" },
      // Malformed: twelve characters pass ObjectId.isValid but not the 24-hex check.
      { childId, batchId: "aaaaaaaaaaaa", code: "BATCH_NOT_FOUND" },
      { childId, batchId: "not-an-id", code: "BATCH_NOT_FOUND" },
      // A batch of a different child of the same family.
      { childId: sibling, batchId, code: "BATCH_NOT_FOUND" },
    ];
    for (const target of cases) {
      const label = JSON.stringify(target);
      expect(
        await getBatchForReview(familyId, target.childId, target.batchId),
        label,
      ).toBeNull();
      expect(
        await removeBookFromBatch(main, { ...target, bookId }),
        label,
      ).toMatchObject({ ok: false, error: { code: target.code } });
      expect(await confirmBatch(main, target), label).toMatchObject({
        ok: false,
        error: { code: target.code },
      });
    }
    expect(await stored(batchId)).toMatchObject({
      status: "pending",
      bookIds,
    });
    expect(await stored(otherBatch)).toMatchObject({ status: "pending" });
  });

  it("lets a Sub Parent of the family remove and confirm", async () => {
    const { sub, childId } = await family();
    const { batchId, bookIds } = await pendingBatchOfThree(childId);

    expect(
      await removeBookFromBatch(sub, {
        childId,
        batchId,
        bookId: bookIds[0],
      }),
    ).toEqual({ ok: true, data: null });
    expect(await confirmBatch(sub, { childId, batchId })).toEqual({
      ok: true,
      data: { state: "released" },
    });
  });
});

describe("3, books", () => {
  it("shows no book blocked or turned back to draft while pending, nor one reported for this child, and never the removed books", async () => {
    const { main, childId, familyId } = await family();
    const { batchId, bookIds } = await pendingBatchOfThree(childId);
    const [alpha, bravo, charlie] = bookIds as [string, string, string];
    const extra = await insertBook("active", "Delta");
    await getDb()
      .collection<{ _id: ObjectId; bookIds: string[] }>("recommendationBatches")
      .updateOne({ _id: new ObjectId(batchId) }, { $push: { bookIds: extra } });
    await removeBookFromBatch(main, { childId, batchId, bookId: alpha });
    await getDb()
      .collection<{ _id: string }>("books")
      .updateOne({ _id: bravo }, { $set: { status: "blocked" } });
    await getDb()
      .collection<{ _id: string }>("books")
      .updateOne({ _id: charlie }, { $set: { status: "draft" } });
    await reportFor(childId, extra);

    const view = await getBatchForReview(familyId, childId, batchId);
    expect(view?.books).toEqual([]);
    expect(JSON.stringify(view)).not.toContain(alpha);
    expect(view).not.toHaveProperty("removedBookIds");
  });
});

describe("4, removals", () => {
  it("none removed: confirming releases every book", async () => {
    const { main, childId } = await family();
    const { batchId, bookIds } = await pendingBatchOfThree(childId);

    expect(await confirmBatch(main, { childId, batchId })).toEqual({
      ok: true,
      data: { state: "released" },
    });
    const batch = await stored(batchId);
    expect(batch).toMatchObject({ status: "released", bookIds });
    expect(batch).not.toHaveProperty("removedBookIds");
  });

  it("repeat: removing the same book twice is ok and leaves it once in removedBookIds; a book not in the batch is BOOK_NOT_IN_BATCH", async () => {
    const { main, childId } = await family();
    const { batchId, bookIds } = await pendingBatchOfThree(childId);
    const input = { childId, batchId, bookId: bookIds[0] as string };

    expect(await removeBookFromBatch(main, input)).toEqual({
      ok: true,
      data: null,
    });
    expect(await removeBookFromBatch(main, input)).toEqual({
      ok: true,
      data: null,
    });
    expect((await stored(batchId))?.removedBookIds).toEqual([bookIds[0]]);

    const elsewhere = await insertBook("active");
    expect(
      await removeBookFromBatch(main, { ...input, bookId: elsewhere }),
    ).toMatchObject({ ok: false, error: { code: "BOOK_NOT_IN_BATCH" } });
  });

  it("4a: removing every book and confirming stores empty", async () => {
    const { main, childId, familyId } = await family();
    const { batchId, bookIds } = await pendingBatchOfThree(childId);
    for (const bookId of bookIds) {
      await removeBookFromBatch(main, { childId, batchId, bookId });
    }
    expect(
      (await getBatchForReview(familyId, childId, batchId))?.books,
    ).toEqual([]);

    expect(await confirmBatch(main, { childId, batchId })).toEqual({
      ok: true,
      data: { state: "empty" },
    });
    expect(await stored(batchId)).toMatchObject({
      status: "empty",
      bookIds: [],
      removedBookIds: bookIds,
      releasedAt: NOW,
    });
  });
});

describe("2a, late parent", () => {
  it("past handoffDeadline, removing and confirming are BATCH_ALREADY_RELEASED and change nothing; the review read says released", async () => {
    const { main, childId, familyId } = await family();
    const { batchId, bookIds } = await pendingBatchOfThree(childId);
    setClock(() => FIXTURE_DEADLINE);

    expect(
      await removeBookFromBatch(main, {
        childId,
        batchId,
        bookId: bookIds[0],
      }),
    ).toMatchObject({ ok: false, error: { code: "BATCH_ALREADY_RELEASED" } });
    expect(await confirmBatch(main, { childId, batchId })).toMatchObject({
      ok: false,
      error: { code: "BATCH_ALREADY_RELEASED" },
    });
    const batch = await stored(batchId);
    expect(batch).toMatchObject({ status: "pending", bookIds });
    expect(batch).not.toHaveProperty("releasedAt");
    const view = await getBatchForReview(familyId, childId, batchId);
    expect(view?.state).toBe("released");
    expect(view?.books.map((book) => book.id)).toEqual(bookIds);
  });

  it("a confirmed batch refuses later changes with BATCH_ALREADY_RELEASED", async () => {
    const { main, sub, childId } = await family();
    const { batchId, bookIds } = await pendingBatchOfThree(childId);
    await confirmBatch(main, { childId, batchId });

    expect(
      await removeBookFromBatch(sub, {
        childId,
        batchId,
        bookId: bookIds[0],
      }),
    ).toMatchObject({ ok: false, error: { code: "BATCH_ALREADY_RELEASED" } });
    expect(await confirmBatch(sub, { childId, batchId })).toMatchObject({
      ok: false,
      error: { code: "BATCH_ALREADY_RELEASED" },
    });
  });
});

describe("5a", () => {
  it("a failed confirmation is SAVE_FAILED with an error ID, the batch stays pending, and a retry succeeds", async () => {
    const { main, childId } = await family();
    const { batchId } = await pendingBatchOfThree(childId);
    vi.spyOn(Collection.prototype, "findOneAndUpdate").mockRejectedValueOnce(
      new Error("network: secret detail"),
    );
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const failed = await confirmBatch(main, { childId, batchId });
    expect(failed.ok).toBe(false);
    if (failed.ok) return;
    expect(failed.error.code).toBe("SAVE_FAILED");
    expect(failed.error.errorId).toEqual(expect.any(String));
    expect(failed.error.message).not.toContain("secret detail");
    const batch = await stored(batchId);
    expect(batch?.status).toBe("pending");
    expect(batch).not.toHaveProperty("releasedAt");

    expect(await confirmBatch(main, { childId, batchId })).toEqual({
      ok: true,
      data: { state: "released" },
    });
  });

  it("a failed removal is SAVE_FAILED with an error ID and changes nothing", async () => {
    const { main, childId } = await family();
    const { batchId, bookIds } = await pendingBatchOfThree(childId);
    vi.spyOn(Collection.prototype, "updateOne").mockRejectedValueOnce(
      new Error("network"),
    );
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const failed = await removeBookFromBatch(main, {
      childId,
      batchId,
      bookId: bookIds[0],
    });
    expect(failed).toMatchObject({
      ok: false,
      error: { code: "SAVE_FAILED", errorId: expect.any(String) as unknown },
    });
    expect((await stored(batchId))?.bookIds).toEqual(bookIds);
  });
});

/**
 * Lets the first write to `recommendationBatches` through `method` apply for real, then
 * loses its response, as a dropped connection would (review of #135).
 */
function loseResponseAfterWrite(method: "findOneAndUpdate" | "updateOne") {
  const original = Reflect.get(Collection.prototype, method) as (
    this: Collection,
    ...args: unknown[]
  ) => Promise<unknown>;
  let lost = false;
  vi.spyOn(Collection.prototype, method).mockImplementation(async function (
    this: Collection,
    ...args: unknown[]
  ) {
    const result = await original.apply(this, args);
    if (this.collectionName !== "recommendationBatches" || lost) return result;
    lost = true;
    throw new MongoNetworkError("invented: connection reset");
  } as never);
}

/**
 * Records the read concern of every read of `recommendationBatches`. With `fail`, the
 * first of those reads (the action's read-back) fails; later ones, such as the test's
 * own check of the stored batch, succeed.
 */
function batchReads(options: { fail?: boolean } = {}) {
  const concerns: (string | undefined)[] = [];
  let failed = false;
  const original = Reflect.get(Collection.prototype, "findOne") as (
    this: Collection,
    ...args: unknown[]
  ) => Promise<unknown>;
  vi.spyOn(Collection.prototype, "findOne").mockImplementation(function (
    this: Collection,
    ...args: unknown[]
  ) {
    if (this.collectionName !== "recommendationBatches") {
      return original.apply(this, args);
    }
    concerns.push(this.readConcern?.level);
    if (options.fail && !failed) {
      failed = true;
      return Promise.reject(new Error("invented: database unreachable"));
    }
    return original.apply(this, args);
  } as never);
  return concerns;
}

describe("5a, response lost after the write applied (review of #135)", () => {
  it("confirm: the release applied and its response was lost is ok, read back at majority, and a retry is BATCH_ALREADY_RELEASED", async () => {
    const { main, childId } = await family();
    const { batchId } = await pendingBatchOfThree(childId);
    loseResponseAfterWrite("findOneAndUpdate");
    const concerns = batchReads();
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(await confirmBatch(main, { childId, batchId })).toEqual({
      ok: true,
      data: { state: "released" },
    });
    expect(concerns).toEqual(["majority"]);
    expect(await stored(batchId)).toMatchObject({
      status: "released",
      releasedAt: NOW,
    });
    expect(await confirmBatch(main, { childId, batchId })).toMatchObject({
      ok: false,
      error: { code: "BATCH_ALREADY_RELEASED" },
    });
  });

  it("confirm, 4a: an empty batch released with its response lost is ok with state empty", async () => {
    const { main, childId } = await family();
    const batchId = await insertBatch({ childId, bookIds: [] });
    loseResponseAfterWrite("findOneAndUpdate");
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(await confirmBatch(main, { childId, batchId })).toEqual({
      ok: true,
      data: { state: "empty" },
    });
  });

  it("confirm: a write that failed after the other parent released the batch is BATCH_ALREADY_RELEASED, not ok", async () => {
    const { sub, childId } = await family();
    const { batchId } = await pendingBatchOfThree(childId);
    // The other parent's confirmation lands first, at another moment, and this
    // parent's write then fails without applying.
    const earlier = new Date(NOW.getTime() - 60_000);
    vi.spyOn(Collection.prototype, "findOneAndUpdate").mockImplementationOnce(
      async () => {
        await batches().updateOne(
          { _id: new ObjectId(batchId) },
          { $set: { status: "released", releasedAt: earlier } },
        );
        throw new MongoNetworkError("invented: connection reset");
      },
    );
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(await confirmBatch(sub, { childId, batchId })).toMatchObject({
      ok: false,
      error: { code: "BATCH_ALREADY_RELEASED" },
    });
    expect((await stored(batchId))?.releasedAt).toEqual(earlier);
  });

  it("confirm: when the read-back fails too, SAVE_UNCONFIRMED, which does not say nothing changed", async () => {
    const { main, childId } = await family();
    const { batchId } = await pendingBatchOfThree(childId);
    loseResponseAfterWrite("findOneAndUpdate");
    batchReads({ fail: true });
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const result = await confirmBatch(main, { childId, batchId });
    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "SAVE_UNCONFIRMED",
        errorId: expect.any(String) as unknown,
      },
    });
    if (!result.ok) expect(result.error.message).not.toMatch(/nothing/i);
    expect((await stored(batchId))?.status).toBe("released");
  });

  it("remove: the removal applied and its response was lost is ok, read back at majority, and a retry is ok", async () => {
    const { main, childId } = await family();
    const { batchId, bookIds } = await pendingBatchOfThree(childId);
    loseResponseAfterWrite("updateOne");
    const concerns = batchReads();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const input = { childId, batchId, bookId: bookIds[0] };

    expect(await removeBookFromBatch(main, input)).toEqual({
      ok: true,
      data: null,
    });
    expect(concerns).toEqual(["majority"]);
    expect(await stored(batchId)).toMatchObject({
      status: "pending",
      bookIds: [bookIds[1], bookIds[2]],
      removedBookIds: [bookIds[0]],
    });
    expect(await removeBookFromBatch(main, input)).toEqual({
      ok: true,
      data: null,
    });
  });

  it("remove: when the read-back fails too, SAVE_UNCONFIRMED, which does not say nothing changed", async () => {
    const { main, childId } = await family();
    const { batchId, bookIds } = await pendingBatchOfThree(childId);
    loseResponseAfterWrite("updateOne");
    batchReads({ fail: true });
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const result = await removeBookFromBatch(main, {
      childId,
      batchId,
      bookId: bookIds[0],
    });
    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "SAVE_UNCONFIRMED",
        errorId: expect.any(String) as unknown,
      },
    });
    if (!result.ok) expect(result.error.message).not.toMatch(/nothing/i);
    expect((await stored(batchId))?.removedBookIds).toEqual([bookIds[0]]);
  });
});

describe("concurrency", () => {
  it("two simultaneous confirmations leave one release, and the other gets BATCH_ALREADY_RELEASED", async () => {
    const { main, sub, childId } = await family();
    const { batchId } = await pendingBatchOfThree(childId);

    const results = await Promise.all([
      confirmBatch(main, { childId, batchId }),
      confirmBatch(sub, { childId, batchId }),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok)).toEqual([
      expect.objectContaining({
        error: expect.objectContaining({
          code: "BATCH_ALREADY_RELEASED",
        }) as unknown,
      }),
    ]);
  });

  it("a removal racing a confirmation lands before it or is refused, and empty is set only when no book remains at the write", async () => {
    for (let round = 0; round < 5; round++) {
      const { main, sub, childId } = await family();
      const bookId = await insertBook("active");
      const batchId = await insertBatch({ childId, bookIds: [bookId] });

      const [removed, confirmed] = await Promise.all([
        removeBookFromBatch(main, { childId, batchId, bookId }),
        confirmBatch(sub, { childId, batchId }),
      ]);
      const batch = await stored(batchId);
      expect(confirmed.ok).toBe(true);
      if (removed.ok) {
        expect(batch).toMatchObject({ status: "empty", bookIds: [] });
      } else {
        expect(removed.error.code).toBe("BATCH_ALREADY_RELEASED");
        expect(batch).toMatchObject({ status: "released", bookIds: [bookId] });
      }
    }
  });
});

describe("consent", () => {
  it("unconfirmed or revoked consent is CONSENT_NOT_CONFIRMED on both actions, and nothing changes", async () => {
    const unconfirmed = await family({ consent: false });
    const revoked = await family();
    await getDb()
      .collection("consentRecords")
      .updateOne(
        { familyId: new ObjectId(revoked.familyId) },
        { $set: { revokedAt: NOW } },
      );
    for (const { main, childId } of [unconfirmed, revoked]) {
      const { batchId, bookIds } = await pendingBatchOfThree(childId);
      expect(
        await removeBookFromBatch(main, {
          childId,
          batchId,
          bookId: bookIds[0],
        }),
      ).toMatchObject({ ok: false, error: { code: "CONSENT_NOT_CONFIRMED" } });
      expect(await confirmBatch(main, { childId, batchId })).toMatchObject({
        ok: false,
        error: { code: "CONSENT_NOT_CONFIRMED" },
      });
      expect(await stored(batchId)).toMatchObject({
        status: "pending",
        bookIds,
      });
    }
  });
});

describe("isInPendingBatch (report entry PRE-3)", () => {
  it("is true only for a book in this pending batch of the child, before handoffDeadline", async () => {
    const { childId, familyId } = await family();
    const { batchId, bookIds } = await pendingBatchOfThree(childId);
    const book = bookIds[0] as string;
    const sibling = await insertChild(familyId);

    expect(await isInPendingBatch(childId, batchId, book)).toBe(true);
    expect(await isInPendingBatch(childId, batchId, "other-book")).toBe(false);
    expect(await isInPendingBatch(sibling, batchId, book)).toBe(false);
    expect(await isInPendingBatch(childId, "not-an-id", book)).toBe(false);
    setClock(() => FIXTURE_DEADLINE);
    expect(await isInPendingBatch(childId, batchId, book)).toBe(false);
  });
});

describe("logging", () => {
  it("after a removal, a confirmation and a failed save, the logs hold no child ID, book ID or nickname", async () => {
    const spies = (["log", "info", "warn", "error"] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation(() => undefined),
    );
    const { main, childId } = await family();
    const { batchId, bookIds } = await pendingBatchOfThree(childId);
    await removeBookFromBatch(main, {
      childId,
      batchId,
      bookId: bookIds[0],
    });
    vi.spyOn(Collection.prototype, "findOneAndUpdate").mockRejectedValueOnce(
      new Error(`failed for ${childId}`),
    );
    await confirmBatch(main, { childId, batchId });
    await confirmBatch(main, { childId, batchId });

    const logged = JSON.stringify(spies.flatMap((spy) => spy.mock.calls));
    for (const secret of [childId, ...bookIds, "Starfish"]) {
      expect(logged).not.toContain(secret);
    }
  });
});

describe("deleteChildRecords (UC-PAR-delete-kid-account)", () => {
  it("deletes every batch of the child, of any status, and no other child's", async () => {
    await insertBatch({ childId: "c1", bookIds: ["b1"] });
    await insertBatch({ childId: "c1", bookIds: [], status: "empty" });
    await insertBatch({ childId: "c2", bookIds: ["b1"] });

    await withTransaction((tx) => deleteChildRecords(tx, "c1"));

    expect(await batches().countDocuments({ childId: "c1" })).toBe(0);
    expect(await batches().countDocuments({ childId: "c2" })).toBe(1);
  });
});

describe("removeFromPendingBatchInTx (UC-PAR-report-book 7d)", () => {
  it("removes the book from the child's pending batch, leaves it pending and returns true; false when none holds it; never a released, expired or other child's batch", async () => {
    const { childId, familyId } = await family();
    const sibling = await insertChild(familyId);
    const book = await insertBook("active");
    const kept = await insertBook("active");
    const pending = await insertBatch({ childId, bookIds: [book, kept] });
    const released = await insertBatch({
      childId,
      bookIds: [book],
      status: "released",
      releasedAt: NOW,
    });
    const siblings = await insertBatch({ childId: sibling, bookIds: [book] });

    expect(
      await withTransaction((tx) =>
        removeFromPendingBatchInTx(tx, childId, book),
      ),
    ).toBe(true);
    expect(await stored(pending)).toMatchObject({
      status: "pending",
      bookIds: [kept],
      removedBookIds: [book],
    });
    expect((await stored(released))?.bookIds).toEqual([book]);
    expect((await stored(siblings))?.bookIds).toEqual([book]);

    expect(
      await withTransaction((tx) =>
        removeFromPendingBatchInTx(tx, childId, book),
      ),
    ).toBe(false);

    setClock(() => FIXTURE_DEADLINE);
    expect(
      await withTransaction((tx) =>
        removeFromPendingBatchInTx(tx, childId, kept),
      ),
    ).toBe(false);
    expect((await stored(pending))?.bookIds).toEqual([kept]);
  });

  it("is undone when the caller's transaction aborts", async () => {
    const { childId } = await family();
    const book = await insertBook("active");
    const pending = await insertBatch({ childId, bookIds: [book] });

    await expect(
      withTransaction(async (tx) => {
        await removeFromPendingBatchInTx(tx, childId, book);
        throw new Error("abort");
      }),
    ).rejects.toThrow("abort");
    expect((await stored(pending))?.bookIds).toEqual([book]);
  });
});

describe("2a, the timeout release in stored state", () => {
  it("matches a pending batch at and after handoffDeadline and none before it, the opposite of confirmBatch's match", async () => {
    const { main, childId, familyId } = await family();
    const before = await insertChild(familyId);
    const at = await insertChild(familyId);
    const after = await insertChild(familyId);
    const book = await insertBook("active");
    const ms = (offset: number) => new Date(NOW.getTime() + offset);
    const ids = {
      before: await insertBatch({
        childId: before,
        bookIds: [book],
        handoffDeadline: ms(1),
      }),
      at: await insertBatch({
        childId: at,
        bookIds: [book],
        handoffDeadline: NOW,
      }),
      after: await insertBatch({
        childId: after,
        bookIds: [book],
        handoffDeadline: ms(-1),
      }),
      confirmed: await insertBatch({ childId, bookIds: [book] }),
    };
    await confirmBatch(main, { childId, batchId: ids.confirmed });
    const confirmedBefore = await stored(ids.confirmed);

    expect(await releaseExpiredBatches()).toBe(2);
    expect((await stored(ids.before))?.status).toBe("pending");
    expect(await stored(ids.at)).toMatchObject({
      status: "released",
      releasedAt: NOW,
    });
    expect(await stored(ids.after)).toMatchObject({
      status: "released",
      releasedAt: ms(-1),
    });
    expect(await stored(ids.confirmed)).toEqual(confirmedBefore);
    // The parent's write matches exactly the batch the release did not.
    expect(
      await confirmBatch(main, { childId: before, batchId: ids.before }),
    ).toEqual({
      ok: true,
      data: { state: "released" },
    });
    expect(
      await confirmBatch(main, { childId: at, batchId: ids.at }),
    ).toMatchObject({
      ok: false,
      error: { code: "BATCH_ALREADY_RELEASED" },
    });
  });

  it("4, saved at once: a removal made before the deadline is not in the batch the release records", async () => {
    const { main, childId } = await family();
    const { batchId, bookIds } = await pendingBatchOfThree(childId);
    await removeBookFromBatch(main, { childId, batchId, bookId: bookIds[0] });

    setClock(() => FIXTURE_DEADLINE);
    await releaseExpiredBatches();

    expect(await stored(batchId)).toMatchObject({
      status: "released",
      bookIds: [bookIds[1], bookIds[2]],
      removedBookIds: [bookIds[0]],
      releasedAt: FIXTURE_DEADLINE,
    });
  });

  it("next quiz first: in one transaction, the child's expired batch is recorded and a new pending batch saved; exactly one is pending", async () => {
    const { childId, familyId } = await family();
    const sibling = await insertChild(familyId);
    const book = await insertBook("active");
    const expired = await insertBatch({ childId, bookIds: [book] });
    const siblings = await insertBatch({ childId: sibling, bookIds: [book] });
    setClock(() => FIXTURE_DEADLINE);

    // Stands in for the quiz's save transaction (UC-REC-recommend-quiz-rules, not built).
    await withTransaction(async (tx) => {
      expect(await releaseExpiredBatchInTx(tx, childId)).toBe(1);
      await batches().insertOne(
        {
          _id: new ObjectId(),
          requestId: "44444444-4444-4444-8444-444444444444",
          childId,
          source: "rules",
          status: "pending",
          bookIds: [book],
          createdAt: FIXTURE_DEADLINE,
          handoffDeadline: new Date(FIXTURE_DEADLINE.getTime() + 86_400_000),
        },
        { session: tx },
      );
    });

    expect(await stored(expired)).toMatchObject({
      status: "released",
      releasedAt: FIXTURE_DEADLINE,
    });
    expect(await batches().countDocuments({ childId, status: "pending" })).toBe(
      1,
    );
    // Only that child's batch: the sibling's waits for its own save or the cleanup.
    expect((await stored(siblings))?.status).toBe("pending");
  });

  it("next quiz first, insert fails: the expired batch is still pending in storage and still released on read", async () => {
    const { childId, familyId } = await family();
    const book = await insertBook("active");
    const expired = await insertBatch({ childId, bookIds: [book] });
    setClock(() => FIXTURE_DEADLINE);

    await expect(
      withTransaction(async (tx) => {
        await releaseExpiredBatchInTx(tx, childId);
        throw new Error("insert failed");
      }),
    ).rejects.toThrow("insert failed");

    expect((await stored(expired))?.status).toBe("pending");
    expect((await getBatchForReview(familyId, childId, expired))?.state).toBe(
      "released",
    );
  });
});
