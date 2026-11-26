import { Collection, ObjectId } from "mongodb";
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
