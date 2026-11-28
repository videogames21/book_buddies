import { beforeEach, describe, expect, it, vi } from "vitest";
import { insertBook } from "../../../../../../../../../tests/fixtures/catalog";
import { insertChild } from "../../../../../../../../../tests/fixtures/children";
import { insertConsentRecord } from "../../../../../../../../../tests/fixtures/family";
import { insertShelfEntry } from "../../../../../../../../../tests/fixtures/shelf";
import {
  insertParent,
  insertUserWithRole,
} from "../../../../../../../../../tests/fixtures/users";
import { resetDatabase } from "../../../../../../../../../tests/integration/db";

// design/shlf.md, Tests, "3, page", "3b, page" and "3b, Catalog miss" for
// UC-SHLF-parent-remove-book. Invented data only.

vi.mock("@/server/identity-access/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/server/identity-access/auth");
const { getDb } = await import("@/server/lib/db");
const { removeBookForParent } = await import("@/server/shelf/parent-removal");
const { removeBookView } = await import("./view");

const mockedAuth = vi.mocked(
  auth as unknown as () => Promise<{ user: { id: string } } | null>,
);
const signInAs = (userId: string | null) =>
  mockedAuth.mockResolvedValue(userId ? { user: { id: userId } } : null);

async function familyWithBookOnShelf() {
  const parent = await insertParent({ parentRole: "main" });
  await insertConsentRecord(parent, true);
  const childId = await insertChild(parent.familyId, { nickname: "Starfish" });
  const bookId = await insertBook("active", "Moon Garden");
  await insertShelfEntry(childId, bookId, "readingNow");
  signInAs(parent.userId);
  return { ...parent, parentRole: "main" as const, childId, bookId };
}

const NOT_FOUND = { notFound: true };

describe("removeBookView (UC-SHLF-parent-remove-book)", () => {
  beforeEach(async () => {
    await resetDatabase();
    mockedAuth.mockReset();
  });

  it("3: a book on the shelf gets the confirmation with its title, the nickname and the way back, and nothing else", async () => {
    const { childId, bookId } = await familyWithBookOnShelf();

    expect(await removeBookView(childId, bookId)).toEqual({
      state: "confirm",
      childId,
      bookId,
      title: "Moon Garden",
      nickname: "Starfish",
      shelfPath: `/parent/children/${childId}/shelf`,
    });
  });

  it("3: no session redirects to sign-in; a child or admin session gets the 404", async () => {
    const { childId, bookId } = await familyWithBookOnShelf();
    signInAs(null);
    expect(await removeBookView(childId, bookId)).toEqual({
      redirect: "/sign-in",
    });

    for (const role of ["child", "admin"] as const) {
      signInAs((await insertUserWithRole(role)).userId);
      expect(await removeBookView(childId, bookId)).toEqual(NOT_FOUND);
    }
  });

  it("3b, page: a book not on this child's shelf, even one on a sibling's, gets the off-shelf state", async () => {
    const { childId, familyId } = await familyWithBookOnShelf();
    const sibling = await insertChild(familyId, { nickname: "Otter" });
    const siblingBook = await insertBook("active", "River Song");
    await insertShelfEntry(sibling, siblingBook, "wantToRead");

    const offShelf = {
      state: "offShelf",
      nickname: "Starfish",
      shelfPath: `/parent/children/${childId}/shelf`,
    };
    expect(await removeBookView(childId, siblingBook)).toEqual(offShelf);
    expect(await removeBookView(childId, "%00{$gt}")).toEqual(offShelf);
  });

  it("3b, page: after a removal the same page shows the off-shelf state", async () => {
    const family = await familyWithBookOnShelf();
    await removeBookForParent(family, family);

    expect(await removeBookView(family.childId, family.bookId)).toMatchObject({
      state: "offShelf",
    });
  });

  it("3b, page: another family's child, and an unknown or malformed child ID, get the 404 instead", async () => {
    const { childId, bookId } = await familyWithBookOnShelf();
    expect(await removeBookView("not-a-child", bookId)).toEqual(NOT_FOUND);
    expect(await removeBookView("%00{$gt}", bookId)).toEqual(NOT_FOUND);

    signInAs((await insertParent({ parentRole: "main" })).userId);
    expect(await removeBookView(childId, bookId)).toEqual(NOT_FOUND);
  });

  it("3b, Catalog miss: a draft, and a blocked book whose entry survived, get the confirmation as 'this book', and removing it succeeds", async () => {
    const family = await familyWithBookOnShelf();
    for (const status of ["draft", "blocked"] as const) {
      const bookId = await insertBook(status, `Hidden ${status}`);
      await insertShelfEntry(family.childId, bookId, "maybeLater");

      expect(await removeBookView(family.childId, bookId)).toMatchObject({
        state: "confirm",
        title: "this book",
      });
      expect(
        await removeBookForParent(family, { childId: family.childId, bookId }),
      ).toEqual({ ok: true, data: null });
      expect(
        await getDb()
          .collection("childNotices")
          .countDocuments({ childId: family.childId, bookId }),
      ).toBe(1);
    }
  });
});
