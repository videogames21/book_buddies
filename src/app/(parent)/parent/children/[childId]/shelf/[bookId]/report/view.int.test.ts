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

// UC-PAR-report-book step 2 and the 7c page row: what the report page shows. Invented
// data only.

vi.mock("@/server/identity-access/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/server/identity-access/auth");
const { getDb } = await import("@/server/lib/db");
const { reportBook } = await import("@/server/accounts-family/book-reports");
const { reportPageView } = await import("./view");

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
  return { ...parent, childId, bookId };
}

const NOT_FOUND = { notFound: true };

describe("reportPageView (UC-PAR-report-book)", () => {
  beforeEach(async () => {
    await resetDatabase();
    mockedAuth.mockReset();
  });

  it("2: shows the title, the nickname and the way back, and no age, grade or reading level", async () => {
    const { childId, bookId } = await familyWithBookOnShelf();

    // An exact match: the view carries no field beyond these (KD-pii-segregation).
    const view = await reportPageView(childId, bookId);

    expect(view).toEqual({
      state: "form",
      childId,
      bookId,
      title: "Moon Garden",
      nickname: "Starfish",
      shelfPath: `/parent/children/${childId}/shelf`,
    });
  });

  it("no session: redirect to sign-in", async () => {
    const { childId, bookId } = await familyWithBookOnShelf();
    signInAs(null);

    expect(await reportPageView(childId, bookId)).toEqual({
      redirect: "/sign-in",
    });
  });

  it("2: another family's child, unknown and malformed IDs, and child or admin sessions all get the same 404", async () => {
    const { childId, bookId } = await familyWithBookOnShelf();

    expect(await reportPageView("not-a-child", bookId)).toEqual(NOT_FOUND);
    expect(await reportPageView(childId, "%00{$gt}")).toEqual(NOT_FOUND);

    const stranger = await insertParent({ parentRole: "main" });
    signInAs(stranger.userId);
    expect(await reportPageView(childId, bookId)).toEqual(NOT_FOUND);

    for (const role of ["child", "admin"] as const) {
      const other = await insertUserWithRole(role);
      signInAs(other.userId);
      expect(await reportPageView(childId, bookId)).toEqual(NOT_FOUND);
    }
  });

  it("2: a book not on this child's shelf gets the 404, even when it is on a sibling's", async () => {
    const { childId, familyId } = await familyWithBookOnShelf();
    const sibling = await insertChild(familyId, { nickname: "Otter" });
    const otherBook = await insertBook("active", "River Song");
    await insertShelfEntry(sibling, otherBook, "wantToRead");

    expect(await reportPageView(childId, otherBook)).toEqual(NOT_FOUND);
  });

  it("2: a shelved book the Catalog does not return (blocked or draft) gets the 404", async () => {
    const { childId } = await familyWithBookOnShelf();
    for (const status of ["blocked", "draft"] as const) {
      const bookId = await insertBook(status, `Hidden ${status}`);
      await insertShelfEntry(childId, bookId, "maybeLater");
      expect(await reportPageView(childId, bookId)).toEqual(NOT_FOUND);
    }
  });

  it("7c, page: with a report and exclusion and no shelf entry, it shows already reported, not the 404", async () => {
    const family = await familyWithBookOnShelf();
    const saved = await reportBook(
      { userId: family.userId, familyId: family.familyId, parentRole: "main" },
      { childId: family.childId, bookId: family.bookId, reason: "other" },
    );
    expect(saved.ok).toBe(true);
    expect(
      await getDb()
        .collection("shelfEntries")
        .countDocuments({ childId: family.childId }),
    ).toBe(0);

    expect(await reportPageView(family.childId, family.bookId)).toEqual({
      state: "alreadyReported",
      nickname: "Starfish",
      shelfPath: `/parent/children/${family.childId}/shelf`,
    });
  });

  it("7c, page: another family cannot learn that a book was reported", async () => {
    const family = await familyWithBookOnShelf();
    await reportBook(
      { userId: family.userId, familyId: family.familyId, parentRole: "main" },
      { childId: family.childId, bookId: family.bookId, reason: "other" },
    );
    const stranger = await insertParent({ parentRole: "main" });
    signInAs(stranger.userId);

    expect(await reportPageView(family.childId, family.bookId)).toEqual(
      NOT_FOUND,
    );
  });
});
