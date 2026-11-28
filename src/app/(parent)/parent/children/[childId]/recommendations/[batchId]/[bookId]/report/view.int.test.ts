import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FIXTURE_DEADLINE,
  insertBatch,
} from "../../../../../../../../../../tests/fixtures/batches";
import { insertBook } from "../../../../../../../../../../tests/fixtures/catalog";
import { insertChild } from "../../../../../../../../../../tests/fixtures/children";
import { insertConsentRecord } from "../../../../../../../../../../tests/fixtures/family";
import {
  insertParent,
  insertUserWithRole,
} from "../../../../../../../../../../tests/fixtures/users";
import { resetDatabase } from "../../../../../../../../../../tests/integration/db";

// UC-PAR-report-book from a recommendation batch (UC-REC-parent-review's report entry
// page rows, design/rec.md): what the batch entry page shows. Invented data only.

vi.mock("@/server/identity-access/auth", () => ({ auth: vi.fn() }));
// A pass-through spy, so a test can tell whether the batch was read at all.
vi.mock("@/server/recommendation/batches", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/server/recommendation/batches")>();
  return { ...actual, isInPendingBatch: vi.fn(actual.isInPendingBatch) };
});

const { auth } = await import("@/server/identity-access/auth");
const { isInPendingBatch } = await import("@/server/recommendation/batches");
const { resetClock, setClock } = await import("@/server/lib/clock");
const { reportBook } = await import("@/server/accounts-family/book-reports");
const { batchReportPageView } = await import("./view");

const mockedAuth = vi.mocked(
  auth as unknown as () => Promise<{ user: { id: string } } | null>,
);
const signInAs = (userId: string | null) =>
  mockedAuth.mockResolvedValue(userId ? { user: { id: userId } } : null);

// Inside the fixture batch's review window (created 2026-11-24T12:00Z, 24 hours).
const NOW = new Date("2026-11-24T18:00:00Z");
const NOT_FOUND = { notFound: true };

/** A child may hold one pending batch, so other books for it go in through `extra`. */
async function familyWithBatch(
  extra: { bookIds?: string[]; removedBookIds?: string[] } = {},
) {
  const parent = await insertParent({ parentRole: "main" });
  await insertConsentRecord(parent, true);
  const childId = await insertChild(parent.familyId, { nickname: "Starfish" });
  const bookId = await insertBook("active", "Moon Garden");
  const batchId = await insertBatch({
    childId,
    bookIds: [bookId, ...(extra.bookIds ?? [])],
    ...(extra.removedBookIds && { removedBookIds: extra.removedBookIds }),
  });
  signInAs(parent.userId);
  return { ...parent, childId, bookId, batchId };
}

const batchPath = (childId: string, batchId: string) =>
  `/parent/children/${childId}/recommendations/${batchId}`;

describe("batchReportPageView (UC-PAR-report-book from UC-REC-parent-review step 4)", () => {
  beforeEach(async () => {
    await resetDatabase();
    mockedAuth.mockReset();
    vi.mocked(isInPendingBatch).mockClear();
    setClock(() => NOW);
  });

  afterEach(() => {
    resetClock();
  });

  it("2: a book in this pending batch shows the title, the nickname and the way back to the batch, and no age, grade or reading level", async () => {
    const { childId, bookId, batchId } = await familyWithBatch();

    // An exact match: the view carries no field beyond these (KD-pii-segregation).
    expect(await batchReportPageView(childId, batchId, bookId)).toEqual({
      state: "form",
      childId,
      bookId,
      title: "Moon Garden",
      nickname: "Starfish",
      batchPath: batchPath(childId, batchId),
    });
  });

  it("no session: redirect to sign-in", async () => {
    const { childId, bookId, batchId } = await familyWithBatch();
    signInAs(null);

    expect(await batchReportPageView(childId, batchId, bookId)).toEqual({
      redirect: "/sign-in",
    });
  });

  it("another family's child gets the 404 before the batch is read", async () => {
    const { childId, bookId, batchId } = await familyWithBatch();
    const stranger = await insertParent({ parentRole: "main" });
    signInAs(stranger.userId);

    expect(await batchReportPageView(childId, batchId, bookId)).toEqual(
      NOT_FOUND,
    );
    expect(isInPendingBatch).not.toHaveBeenCalled();
  });

  it("unknown and malformed IDs, and child or admin sessions, all get the same 404", async () => {
    const { childId, bookId, batchId } = await familyWithBatch();

    expect(await batchReportPageView("not-a-child", batchId, bookId)).toEqual(
      NOT_FOUND,
    );
    expect(await batchReportPageView(childId, "not-a-batch", bookId)).toEqual(
      NOT_FOUND,
    );
    expect(
      await batchReportPageView(childId, "aaaaaaaaaaaaaaaaaaaaaaaa", bookId),
    ).toEqual(NOT_FOUND);
    expect(await batchReportPageView(childId, batchId, "%00{$gt}")).toEqual(
      NOT_FOUND,
    );

    for (const role of ["child", "admin"] as const) {
      const other = await insertUserWithRole(role);
      signInAs(other.userId);
      expect(await batchReportPageView(childId, batchId, bookId)).toEqual(
        NOT_FOUND,
      );
    }
  });

  it("PRE-3: a book not in this batch gets the 404, even when it is in a sibling's batch or a released batch of the child", async () => {
    const { childId, familyId, batchId } = await familyWithBatch();
    const sibling = await insertChild(familyId, { nickname: "Otter" });
    const siblingBook = await insertBook("active", "River Song");
    await insertBatch({ childId: sibling, bookIds: [siblingBook] });
    const otherBook = await insertBook("active", "Sky Kite");
    await insertBatch({
      childId,
      bookIds: [otherBook],
      status: "released",
      releasedAt: NOW,
    });

    expect(await batchReportPageView(childId, batchId, siblingBook)).toEqual(
      NOT_FOUND,
    );
    expect(await batchReportPageView(childId, batchId, otherBook)).toEqual(
      NOT_FOUND,
    );
  });

  it("PRE-3: another child's batch, given with this child's ID, gets the 404", async () => {
    const { childId, familyId, bookId } = await familyWithBatch();
    const sibling = await insertChild(familyId, { nickname: "Otter" });
    const siblingBatch = await insertBatch({
      childId: sibling,
      bookIds: [bookId],
    });

    expect(await batchReportPageView(childId, siblingBatch, bookId)).toEqual(
      NOT_FOUND,
    );
  });

  it("PRE-3: a batch past handoffDeadline, and a released batch, get the 404", async () => {
    const { childId, bookId, batchId } = await familyWithBatch();
    setClock(() => FIXTURE_DEADLINE);
    expect(await batchReportPageView(childId, batchId, bookId)).toEqual(
      NOT_FOUND,
    );

    setClock(() => NOW);
    const released = await insertBatch({
      childId,
      bookIds: [bookId],
      status: "released",
      releasedAt: NOW,
    });
    expect(await batchReportPageView(childId, released, bookId)).toEqual(
      NOT_FOUND,
    );
  });

  it("PRE-3: a book removed from the batch by a parent gets the 404", async () => {
    const removed = await insertBook("active", "Removed Book");
    const { childId, batchId } = await familyWithBatch({
      removedBookIds: [removed],
    });

    expect(await batchReportPageView(childId, batchId, removed)).toEqual(
      NOT_FOUND,
    );
  });

  it("2: a batch book the Catalog does not return (blocked or draft) gets the 404", async () => {
    const hidden = [
      await insertBook("blocked", "Hidden blocked"),
      await insertBook("draft", "Hidden draft"),
    ];
    const { childId, batchId } = await familyWithBatch({ bookIds: hidden });
    for (const bookId of hidden) {
      expect(await batchReportPageView(childId, batchId, bookId)).toEqual(
        NOT_FOUND,
      );
    }
  });

  it("7c, page: a book reported from this batch, and so no longer in it, shows already reported, not the 404", async () => {
    const family = await familyWithBatch();
    const saved = await reportBook(
      { userId: family.userId, familyId: family.familyId, parentRole: "main" },
      { childId: family.childId, bookId: family.bookId, reason: "other" },
    );
    expect(saved).toEqual({ ok: true, data: { removedFromShelf: false } });
    expect(
      await isInPendingBatch(family.childId, family.batchId, family.bookId),
    ).toBe(false);

    expect(
      await batchReportPageView(family.childId, family.batchId, family.bookId),
    ).toEqual({
      state: "alreadyReported",
      nickname: "Starfish",
      batchPath: batchPath(family.childId, family.batchId),
    });
  });

  it("7c, page: another family cannot learn that a book was reported", async () => {
    const family = await familyWithBatch();
    await reportBook(
      { userId: family.userId, familyId: family.familyId, parentRole: "main" },
      { childId: family.childId, bookId: family.bookId, reason: "other" },
    );
    const stranger = await insertParent({ parentRole: "main" });
    signInAs(stranger.userId);

    expect(
      await batchReportPageView(family.childId, family.batchId, family.bookId),
    ).toEqual(NOT_FOUND);
  });
});
