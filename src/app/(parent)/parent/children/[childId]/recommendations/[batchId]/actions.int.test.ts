import { ObjectId } from "mongodb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { insertBatch } from "../../../../../../../../tests/fixtures/batches";
import { insertBook } from "../../../../../../../../tests/fixtures/catalog";
import { insertChild } from "../../../../../../../../tests/fixtures/children";
import { insertConsentRecord } from "../../../../../../../../tests/fixtures/family";
import {
  insertParent,
  insertUserWithRole,
} from "../../../../../../../../tests/fixtures/users";
import { resetDatabase } from "../../../../../../../../tests/integration/db";

// auth() needs a real Next.js request, so the session is mocked; the pages and the real
// auth() are covered by tests/e2e/parent-review.spec.ts.
vi.mock("@/server/identity-access/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { confirmBatch, removeBookFromBatch } = await import("./actions");
const { auth } = await import("@/server/identity-access/auth");
const { revalidatePath } = await import("next/cache");
const { getDb } = await import("@/server/lib/db");
const { resetClock, setClock } = await import("@/server/lib/clock");
const mockedAuth = vi.mocked(
  auth as unknown as () => Promise<{ user: { id: string } } | null>,
);

// Invented data only; before the fixture batch's handoffDeadline.
const NOW = new Date("2026-11-24T18:00:00Z");

const signInAs = (userId: string | null) => {
  mockedAuth.mockResolvedValue(userId ? { user: { id: userId } } : null);
};
const stored = (batchId: string) =>
  getDb()
    .collection("recommendationBatches")
    .findOne({ _id: new ObjectId(batchId) });

async function familyWithBatch() {
  const main = await insertParent({ parentRole: "main" });
  await insertConsentRecord(main, true);
  const sub = await insertParent({
    parentRole: "sub",
    familyId: new ObjectId(main.familyId),
  });
  const childId = await insertChild(main.familyId);
  const bookIds = [await insertBook("active"), await insertBook("active")];
  const batchId = await insertBatch({ childId, bookIds });
  return { main, sub, childId, batchId, bookIds };
}

beforeEach(async () => {
  await resetDatabase();
  setClock(() => NOW);
  vi.mocked(revalidatePath).mockClear();
});
afterEach(() => {
  resetClock();
  mockedAuth.mockReset();
  vi.restoreAllMocks();
});

describe("batch page actions (UC-REC-parent-review)", () => {
  it("main: a parent removes a book and confirms; both revalidate the batch page and /parent", async () => {
    const { main, childId, batchId, bookIds } = await familyWithBatch();
    signInAs(main.userId);

    expect(
      await removeBookFromBatch({ childId, batchId, bookId: bookIds[0] }),
    ).toEqual({ ok: true, data: null });
    expect(await confirmBatch({ childId, batchId })).toEqual({
      ok: true,
      data: { state: "released" },
    });
    expect(await stored(batchId)).toMatchObject({
      status: "released",
      bookIds: [bookIds[1]],
    });
    const paths = vi.mocked(revalidatePath).mock.calls.map(([path]) => path);
    expect(paths).toEqual([
      `/parent/children/${childId}/recommendations/${batchId}`,
      "/parent",
      `/parent/children/${childId}/recommendations/${batchId}`,
      "/parent",
    ]);
  });

  it("authorization: a Sub Parent of the family may remove and confirm", async () => {
    const { sub, childId, batchId, bookIds } = await familyWithBatch();
    signInAs(sub.userId);

    expect(
      (await removeBookFromBatch({ childId, batchId, bookId: bookIds[0] })).ok,
    ).toBe(true);
    expect((await confirmBatch({ childId, batchId })).ok).toBe(true);
  });

  it("authorization: no session, a child session and an admin session are refused before validation, and nothing changes", async () => {
    const { childId, batchId, bookIds } = await familyWithBatch();
    const child = await insertUserWithRole("child");
    const admin = await insertUserWithRole("admin");
    for (const [userId, code] of [
      [null, "NOT_SIGNED_IN"],
      [child.userId, "NOT_A_PARENT"],
      [admin.userId, "NOT_A_PARENT"],
    ] as const) {
      signInAs(userId);
      expect(
        await removeBookFromBatch({ childId, batchId, bookId: bookIds[0] }),
      ).toMatchObject({ ok: false, error: { code } });
      expect(await confirmBatch({ childId, batchId })).toMatchObject({
        ok: false,
        error: { code },
      });
      // A malformed request from such a caller still gets the session's answer first.
      expect(await confirmBatch({})).toMatchObject({
        ok: false,
        error: { code },
      });
    }
    expect(await stored(batchId)).toMatchObject({
      status: "pending",
      bookIds,
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("authorization: another family's parent gets CHILD_NOT_FOUND, and a family ID in the request is ignored", async () => {
    const { main, childId, batchId, bookIds } = await familyWithBatch();
    const stranger = await insertParent({ parentRole: "main" });
    await insertConsentRecord(stranger, true);
    signInAs(stranger.userId);

    expect(
      await removeBookFromBatch({
        childId,
        batchId,
        bookId: bookIds[0],
        familyId: main.familyId,
      }),
    ).toMatchObject({ ok: false, error: { code: "CHILD_NOT_FOUND" } });
    expect(
      await confirmBatch({ childId, batchId, familyId: main.familyId }),
    ).toMatchObject({ ok: false, error: { code: "CHILD_NOT_FOUND" } });
    expect(await stored(batchId)).toMatchObject({ status: "pending" });
  });

  it("input: a missing or non-string field is INVALID_INPUT; a malformed child or batch ID gets the not-found code, as an unknown one does", async () => {
    const { main, childId, batchId, bookIds } = await familyWithBatch();
    signInAs(main.userId);

    for (const input of [
      {},
      null,
      "not an object",
      { childId, batchId: 42 },
      { childId: "", batchId },
      { childId, batchId: "x".repeat(101) },
    ]) {
      expect(await confirmBatch(input), JSON.stringify(input)).toMatchObject({
        ok: false,
        error: { code: "INVALID_INPUT" },
      });
    }
    expect(await removeBookFromBatch({ childId, batchId })).toMatchObject({
      ok: false,
      error: { code: "INVALID_INPUT" },
    });

    expect(
      await confirmBatch({ childId: "not-a-child", batchId }),
    ).toMatchObject({ ok: false, error: { code: "CHILD_NOT_FOUND" } });
    expect(
      await confirmBatch({ childId, batchId: "not-a-batch" }),
    ).toMatchObject({ ok: false, error: { code: "BATCH_NOT_FOUND" } });
    expect(
      await removeBookFromBatch({
        childId,
        batchId: "aaaaaaaaaaaa",
        bookId: bookIds[0],
      }),
    ).toMatchObject({ ok: false, error: { code: "BATCH_NOT_FOUND" } });
    expect(await stored(batchId)).toMatchObject({ status: "pending", bookIds });
  });

  it("a refusal does not revalidate, and an unexpected failure is SAVE_FAILED with an error ID and no exception text", async () => {
    const { main, childId, batchId } = await familyWithBatch();
    signInAs(main.userId);
    setClock(() => new Date("2026-11-26T00:00:00Z"));

    expect(await confirmBatch({ childId, batchId })).toMatchObject({
      ok: false,
      error: { code: "BATCH_ALREADY_RELEASED" },
    });
    expect(revalidatePath).not.toHaveBeenCalled();

    mockedAuth.mockRejectedValueOnce(new Error("session store: secret"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const failed = await confirmBatch({ childId, batchId });
    expect(failed).toMatchObject({
      ok: false,
      error: { code: "SAVE_FAILED", errorId: expect.any(String) as unknown },
    });
    expect(JSON.stringify(failed)).not.toContain("secret");
  });
});
