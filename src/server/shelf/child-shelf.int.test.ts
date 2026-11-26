import { beforeEach, describe, expect, it, vi } from "vitest";
import { insertBook } from "../../../tests/fixtures/catalog";
import {
  insertFinishConfirmation,
  insertRating,
  insertShelfEntry,
} from "../../../tests/fixtures/shelf";
import { resetDatabase } from "../../../tests/integration/db";

// design/shlf.md, Tests, "UC-SHLF-kid-view-shelf". Invented children and books only.

vi.mock("@/server/catalog/books", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/server/catalog/books")>();
  return { ...real, getBooksForShelf: vi.fn(real.getBooksForShelf) };
});

const { getShelfForChild } = await import("./child-shelf");
const { getBooksForShelf } = await import("@/server/catalog/books");
const { createRemovalNoticeInTx, markNoticeSeen } =
  await import("@/server/notification/child-notices");
const { getDb, withTransaction } = await import("@/server/lib/db");

const CHILD = "invented-child";
const OTHER = "another-invented-child";
const on = (day: number) => new Date(Date.UTC(2026, 10, day));

const removalNotice = (bookId: string, childId = CHILD) =>
  withTransaction((tx) => createRemovalNoticeInTx(tx, childId, bookId));
const finishNotice = () =>
  getDb()
    .collection("childNotices")
    .insertOne({ childId: CHILD, kind: "finish-declined", createdAt: on(1) });

const shelf = () => getShelfForChild(CHILD);
const allEntries = async () =>
  (await shelf()).categories.flatMap((group) => group.entries);

/** Everything the view reads, so a test can see that reading changed nothing. */
async function stored() {
  const names = [
    "shelfEntries",
    "ratings",
    "finishConfirmations",
    "childNotices",
  ];
  return Promise.all(
    names.map((name) =>
      getDb().collection(name).find().sort({ _id: 1 }).toArray(),
    ),
  );
}

beforeEach(async () => {
  await resetDatabase();
});
describe("getShelfForChild", () => {
  it("main: only this child's books, under four categories in order, newest move first", async () => {
    const older = await insertBook("active", "Older");
    const newer = await insertBook("active", "Newer");
    const done = await insertBook("active", "Done");
    await insertShelfEntry(CHILD, older, "readingNow", on(1));
    await insertShelfEntry(CHILD, newer, "readingNow", on(2));
    await insertShelfEntry(CHILD, done, "finished", on(3));
    await insertShelfEntry(OTHER, done, "maybeLater", on(4));
    await removalNotice(older, OTHER);

    const view = await shelf();
    expect(
      view.categories.map((group) => [
        group.category,
        group.entries.map((entry) => entry.title),
      ]),
    ).toEqual([
      ["readingNow", ["Newer", "Older"]],
      ["wantToRead", []],
      ["maybeLater", []],
      ["finished", ["Done"]],
    ]);
    expect(view.notices).toEqual([]);
    expect(view.showFindBookMessage).toBe(false);
  });

  it("details and no metrics: title, author, series, rating and actions, and nothing else", async () => {
    const book = await insertBook("active", "Moon Garden", {
      seriesName: "Night Tales",
      readingLevel: "650L",
    });
    await insertShelfEntry(CHILD, book, "finished");
    await insertFinishConfirmation(CHILD, book);
    await insertRating(CHILD, book, "lovedIt");

    expect(await shelf()).toEqual({
      categories: [
        { category: "readingNow", entries: [] },
        { category: "wantToRead", entries: [] },
        { category: "maybeLater", entries: [] },
        {
          category: "finished",
          entries: [
            {
              bookId: book,
              title: "Moon Garden",
              author: "A. Writer",
              seriesName: "Night Tales",
              confirmed: true,
              rating: "lovedIt",
              actions: ["move", "remove", "rate"],
            },
          ],
        },
      ],
      notices: [],
      showFindBookMessage: false,
    });
  });

  it("5a and 3c: rate is offered on a confirmed book in any category only, and a stray rating is hidden", async () => {
    const reread = await insertBook("active", "Reread");
    const waiting = await insertBook("active", "Waiting");
    await insertShelfEntry(CHILD, reread, "wantToRead");
    await insertFinishConfirmation(CHILD, reread);
    await insertShelfEntry(CHILD, waiting, "finished");
    await insertRating(CHILD, waiting, "okay");
    // Another child's confirmation of the same book confirms nothing here.
    await insertFinishConfirmation(OTHER, waiting);

    expect(await allEntries()).toMatchObject([
      { confirmed: true, actions: ["move", "remove", "rate"] },
      { confirmed: false, rating: null, actions: ["move", "remove"] },
    ]);
  });

  it("2a: an empty shelf still has the four categories, with the find-a-book flag", async () => {
    const view = await shelf();
    expect(view.categories).toHaveLength(4);
    expect(view.showFindBookMessage).toBe(true);
  });

  it("3b: a blocked book is gone, with no notice, and the flag shows when nothing is left", async () => {
    const blocked = await insertBook("blocked", "Blocked");
    await insertShelfEntry(CHILD, blocked, "readingNow");
    expect(await allEntries()).toEqual([]);
    expect(await shelf()).toMatchObject({
      notices: [],
      showFindBookMessage: true,
    });
  });

  it("3f: a removal notice has the title when the Catalog returns the book, and none when not", async () => {
    const removed = await insertBook("active", "Removed");
    const blocked = await insertBook("blocked", "Hidden");
    await removalNotice(removed);
    await removalNotice(blocked);

    const view = await shelf();
    expect(view.notices).toEqual([
      {
        id: expect.any(String) as string,
        kind: "book-removed",
        title: "Removed",
      },
      { id: expect.any(String) as string, kind: "book-removed" },
    ]);
    expect(await allEntries()).toEqual([]);
  });

  it("3d: a declined finish shows its kind and names no book or parent", async () => {
    await finishNotice();
    expect((await shelf()).notices).toEqual([
      { id: expect.any(String) as string, kind: "finish-declined" },
    ]);
  });

  it("load marks nothing and changes nothing, however often", async () => {
    const book = await insertBook("active");
    await insertShelfEntry(CHILD, book, "finished");
    await finishNotice();
    const before = await stored();
    await shelf();
    expect((await shelf()).notices).toHaveLength(1);
    expect(await stored()).toEqual(before);
  });

  it("2b: a failed read throws, and the notice is still unseen", async () => {
    await insertShelfEntry(CHILD, await insertBook("active"), "readingNow");
    await finishNotice();
    vi.mocked(getBooksForShelf).mockRejectedValueOnce(
      new Error("invented failure"),
    );
    await expect(shelf()).rejects.toThrow("invented failure");
    expect((await shelf()).notices).toHaveLength(1);
  });

  it("fresh read: a removed entry is gone on the next load", async () => {
    await insertShelfEntry(CHILD, await insertBook("active"), "readingNow");
    expect(await allEntries()).toHaveLength(1);
    await getDb().collection("shelfEntries").deleteMany({});
    expect(await allEntries()).toEqual([]);
  });
});

describe("markNoticeSeen", () => {
  const seenTimes = async () =>
    (await getDb().collection("childNotices").find().toArray()).map(
      (notice) => notice.seenAt as Date | undefined,
    );

  it("marks the child's own unseen notice once, and it does not show again", async () => {
    await finishNotice();
    const [notice] = (await shelf()).notices;
    expect(await markNoticeSeen(CHILD, notice.id)).toBe(true);
    const [first] = await seenTimes();
    expect(first).toBeInstanceOf(Date);
    expect(await markNoticeSeen(CHILD, notice.id)).toBe(false);
    expect(await seenTimes()).toEqual([first]);
    expect((await shelf()).notices).toEqual([]);
  });

  it("changes nothing for another child's notice", async () => {
    await finishNotice();
    const [notice] = (await shelf()).notices;
    expect(await markNoticeSeen(OTHER, notice.id)).toBe(false);
    expect(await seenTimes()).toEqual([undefined]);
  });
});
