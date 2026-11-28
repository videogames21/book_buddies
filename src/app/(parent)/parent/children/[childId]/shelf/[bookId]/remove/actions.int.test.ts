import { ObjectId } from "mongodb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { insertBook } from "../../../../../../../../../tests/fixtures/catalog";
import { insertChild } from "../../../../../../../../../tests/fixtures/children";
import { insertConsentRecord } from "../../../../../../../../../tests/fixtures/family";
import { insertShelfEntry } from "../../../../../../../../../tests/fixtures/shelf";
import {
  insertParent,
  insertUserWithRole,
} from "../../../../../../../../../tests/fixtures/users";
import { resetDatabase } from "../../../../../../../../../tests/integration/db";

// The action's own rows of UC-SHLF-parent-remove-book: "Confirmation enforced" and
// "Authorization". The transaction's rows are in src/server/shelf/parent-removal.int.test.ts.
// Invented data only.

vi.mock("@/server/identity-access/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/server/identity-access/auth");
const { getDb } = await import("@/server/lib/db");
const { removeBookFromShelf } = await import("./actions");

const mockedAuth = vi.mocked(
  auth as unknown as () => Promise<{ user: { id: string } } | null>,
);
const signInAs = (userId: string | null) =>
  mockedAuth.mockResolvedValue(userId ? { user: { id: userId } } : null);

async function familyWithBookOnShelf(parentRole: "main" | "sub" = "main") {
  const main = await insertParent({ parentRole: "main" });
  await insertConsentRecord(main, true);
  const parent =
    parentRole === "main"
      ? main
      : await insertParent({
          parentRole: "sub",
          familyId: new ObjectId(main.familyId),
        });
  const childId = await insertChild(main.familyId);
  const bookId = await insertBook("active");
  await insertShelfEntry(childId, bookId, "wantToRead");
  return { ...parent, childId, bookId };
}

const count = (name: string) => getDb().collection(name).countDocuments();
async function expectNothingWritten() {
  expect(await count("shelfEntries")).toBe(1);
  expect(await count("childNotices")).toBe(0);
  expect(await count("auditLog")).toBe(0);
}

const valid = (f: { childId: string; bookId: string }) => ({
  childId: f.childId,
  bookId: f.bookId,
  confirmed: true,
});

describe("removeBookFromShelf action (UC-SHLF-parent-remove-book)", () => {
  beforeEach(async () => {
    await resetDatabase();
    mockedAuth.mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("main: a Sub Parent's confirmed removal is saved and the result carries nothing else", async () => {
    const family = await familyWithBookOnShelf("sub");
    signInAs(family.userId);

    expect(await removeBookFromShelf(valid(family))).toEqual({
      ok: true,
      data: null,
    });
    expect(await count("shelfEntries")).toBe(0);
    expect(await count("childNotices")).toBe(1);
  });

  it("confirmation enforced: confirmed missing or not true is NOT_CONFIRMED, nothing written", async () => {
    const family = await familyWithBookOnShelf();
    signInAs(family.userId);

    for (const confirmed of [undefined, false, "true"]) {
      expect(
        await removeBookFromShelf({ ...valid(family), confirmed }),
      ).toMatchObject({ ok: false, error: { code: "NOT_CONFIRMED" } });
    }
    expect(
      await removeBookFromShelf({ ...valid(family), childId: undefined }),
    ).toMatchObject({ ok: false, error: { code: "INVALID_INPUT" } });
    await expectNothingWritten();
  });

  it("authorization: no session is NOT_SIGNED_IN, nothing written", async () => {
    const family = await familyWithBookOnShelf();
    signInAs(null);

    expect(await removeBookFromShelf(valid(family))).toMatchObject({
      ok: false,
      error: { code: "NOT_SIGNED_IN" },
    });
    await expectNothingWritten();
  });

  it("authorization: child and admin sessions are NOT_A_PARENT, nothing written", async () => {
    const family = await familyWithBookOnShelf();
    for (const role of ["child", "admin"] as const) {
      signInAs((await insertUserWithRole(role)).userId);
      expect(await removeBookFromShelf(valid(family))).toMatchObject({
        ok: false,
        error: { code: "NOT_A_PARENT" },
      });
    }
    await expectNothingWritten();
  });

  it("authorization: another family's child and an unknown child get the same CHILD_NOT_FOUND; a family ID in the request is ignored", async () => {
    const family = await familyWithBookOnShelf();
    const stranger = await insertParent({ parentRole: "main" });
    await insertConsentRecord(stranger, true);
    signInAs(stranger.userId);

    const foreign = await removeBookFromShelf({
      ...valid(family),
      familyId: family.familyId,
    });
    const unknown = await removeBookFromShelf({
      ...valid(family),
      childId: "no-such-child",
    });

    expect(foreign).toMatchObject({
      ok: false,
      error: { code: "CHILD_NOT_FOUND" },
    });
    expect(unknown).toEqual(foreign);
    await expectNothingWritten();
  });

  it("an unexpected error reaches the caller as SAVE_FAILED with an error ID and no exception text", async () => {
    const family = await familyWithBookOnShelf();
    mockedAuth.mockRejectedValueOnce(new Error("secret internal detail"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await removeBookFromShelf(valid(family));

    expect(result).toMatchObject({
      ok: false,
      error: { code: "SAVE_FAILED", errorId: expect.any(String) as unknown },
    });
    expect(JSON.stringify(result)).not.toContain("secret internal detail");
    await expectNothingWritten();
  });
});
