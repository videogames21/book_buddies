import { Collection } from "mongodb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { insertBook } from "../../../tests/fixtures/catalog";
import { insertChild } from "../../../tests/fixtures/children";
import {
  insertFinishConfirmation,
  insertRating,
  insertShelfEntry,
} from "../../../tests/fixtures/shelf";
import { insertParent } from "../../../tests/fixtures/users";
import { resetDatabase } from "../../../tests/integration/db";
import { listChildrenForFamily } from "@/server/accounts-family/child-accounts";
import { getBooksForShelf } from "@/server/catalog/books";
import { getDb } from "@/server/lib/db";
import { ensureIndexes } from "@/server/setup/ensure-indexes";
import { getShelfForParent } from "./parent-shelf";

async function family() {
  const parent = await insertParent({ parentRole: "main" });
  const childId = await insertChild(parent.familyId);
  return { familyId: parent.familyId, childId };
}

type Category = "readingNow" | "wantToRead" | "maybeLater" | "finished";

function entriesOf(view: Awaited<ReturnType<typeof getShelfForParent>>) {
  const by: Record<string, string[]> = {};
  for (const group of view?.categories ?? []) {
    by[group.category] = group.entries.map((entry) => entry.title);
  }
  return by;
}

describe("getShelfForParent (UC-SHLF-parent-view-shelf)", () => {
  beforeEach(async () => {
    await resetDatabase();
    await ensureIndexes(getDb());
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("main: four categories in fixed order, newest move first, with title and author", async () => {
    const { familyId, childId } = await family();
    const older = await insertBook("active", "Older Book");
    const newer = await insertBook("active", "Newer Book");
    const other = await insertBook("active", "Reading Book");
    await insertShelfEntry(
      childId,
      older,
      "wantToRead",
      new Date("2026-11-01T10:00:00Z"),
    );
    await insertShelfEntry(
      childId,
      newer,
      "wantToRead",
      new Date("2026-11-05T10:00:00Z"),
    );
    await insertShelfEntry(childId, other, "readingNow");

    const view = await getShelfForParent(familyId, childId);

    expect(view?.child).toEqual({ nickname: "Starfish", avatar: "1-1" });
    expect(view?.categories.map((group) => group.category)).toEqual([
      "readingNow",
      "wantToRead",
      "maybeLater",
      "finished",
    ]);
    expect(entriesOf(view)).toEqual({
      readingNow: ["Reading Book"],
      wantToRead: ["Newer Book", "Older Book"],
      maybeLater: [],
      finished: [],
    });
    expect(view?.categories[1]?.entries[0]).toMatchObject({
      title: "Newer Book",
      author: "A. Writer",
    });
  });

  it("main: a Sub Parent and a Main Parent of one family see the same shelf", async () => {
    const main = await insertParent({ parentRole: "main" });
    const sub = await insertParent({
      parentRole: "sub",
      familyId: undefined,
    });
    // Same family: the function takes the family from the session, never the role.
    const { ObjectId } = await import("mongodb");
    await getDb()
      .collection("users")
      .updateOne(
        { _id: new ObjectId(sub.userId) },
        { $set: { familyId: new ObjectId(main.familyId) } },
      );
    const childId = await insertChild(main.familyId);
    const book = await insertBook("active", "Shared Book");
    await insertShelfEntry(childId, book, "maybeLater");

    const forMain = await getShelfForParent(main.familyId, childId);
    const forSub = await getShelfForParent(main.familyId, childId);

    expect(forSub).toEqual(forMain);
    expect(entriesOf(forSub).maybeLater).toEqual(["Shared Book"]);
  });

  it("main: viewing writes nothing (POST-2)", async () => {
    const { familyId, childId } = await family();
    const book = await insertBook("active");
    await insertShelfEntry(childId, book, "finished");
    await insertFinishConfirmation(childId, book);
    await insertRating(childId, book, "lovedIt");
    const names = [
      "shelfEntries",
      "ratings",
      "finishConfirmations",
      "children",
      "books",
    ];
    const snapshot = async () =>
      JSON.stringify(
        await Promise.all(
          names.map((n) => getDb().collection(n).find().toArray()),
        ),
      );
    const before = await snapshot();

    await getShelfForParent(familyId, childId);

    expect(await snapshot()).toBe(before);
  });

  it("no metrics: each entry holds only the book, its title and author, whether it is confirmed, and a rating", async () => {
    const { familyId, childId } = await family();
    const book = await insertBook("active");
    await insertShelfEntry(childId, book, "finished");
    await insertFinishConfirmation(childId, book);
    await insertRating(childId, book, "likedIt");

    const view = await getShelfForParent(familyId, childId);

    const entry = view?.categories[3]?.entries[0];
    expect(Object.keys(entry ?? {}).sort()).toEqual(
      ["author", "bookId", "confirmed", "rating", "title"].sort(),
    );
    expect(Object.keys(view ?? {}).sort()).toEqual(["categories", "child"]);
    expect(Object.keys(view?.child ?? {}).sort()).toEqual([
      "avatar",
      "nickname",
    ]);
    for (const group of view?.categories ?? []) {
      expect(Object.keys(group).sort()).toEqual(["category", "entries"]);
    }
  });

  it("2a: a child with no entries gets four empty categories, not an error", async () => {
    const { familyId, childId } = await family();

    const view = await getShelfForParent(familyId, childId);

    expect(view?.categories).toHaveLength(4);
    expect(view?.categories.every((group) => group.entries.length === 0)).toBe(
      true,
    );
  });

  it.each([
    ["shelfEntries"],
    ["books"],
    ["ratings"],
    ["finishConfirmations"],
    ["children"],
  ])(
    "2b: a failed read of %s throws and returns no partial shelf",
    async (failing) => {
      const { familyId, childId } = await family();
      const book = await insertBook("active");
      await insertShelfEntry(childId, book, "readingNow");
      // The original methods, read without detaching them so `this` stays the collection.
      const originalFind = Reflect.get(
        Collection.prototype,
        "find",
      ) as Collection["find"];
      const originalFindOne = Reflect.get(
        Collection.prototype,
        "findOne",
      ) as Collection["findOne"];
      vi.spyOn(Collection.prototype, "find").mockImplementation(function (
        this: Collection,
        ...args: Parameters<Collection["find"]>
      ) {
        if (this.collectionName === failing)
          throw new Error("database down: secret");
        return originalFind.apply(this, args);
      } as Collection["find"]);
      vi.spyOn(Collection.prototype, "findOne").mockImplementation(function (
        this: Collection,
        ...args: Parameters<Collection["findOne"]>
      ) {
        if (this.collectionName === failing)
          throw new Error("database down: secret");
        return originalFindOne.apply(this, args);
      } as Collection["findOne"]);

      await expect(getShelfForParent(familyId, childId)).rejects.toThrow();
    },
  );

  it("2c: another family's child, an unknown ID and a malformed ID all give the same null", async () => {
    const mine = await family();
    const theirs = await family();
    const book = await insertBook("active");
    await insertShelfEntry(theirs.childId, book, "readingNow");

    expect(await getShelfForParent(mine.familyId, theirs.childId)).toBeNull();
    expect(await getShelfForParent(mine.familyId, "no-such-child")).toBeNull();
    expect(await getShelfForParent(mine.familyId, "")).toBeNull();
    expect(await getShelfForParent(mine.familyId, "../../x")).toBeNull();
    expect(await getShelfForParent(mine.familyId, "{ $ne: null }")).toBeNull();
  });

  it("5a: a Finished entry with no confirmation is awaiting, with no rating", async () => {
    const { familyId, childId } = await family();
    const book = await insertBook("active");
    await insertShelfEntry(childId, book, "finished");

    const view = await getShelfForParent(familyId, childId);

    expect(view?.categories[3]?.entries[0]).toMatchObject({
      confirmed: false,
      rating: null,
    });
  });

  it("5a: a confirmed Finished entry is confirmed and shows its rating", async () => {
    const { familyId, childId } = await family();
    const book = await insertBook("active");
    await insertShelfEntry(childId, book, "finished");
    await insertFinishConfirmation(childId, book);
    await insertRating(childId, book, "notForMe");

    const view = await getShelfForParent(familyId, childId);

    expect(view?.categories[3]?.entries[0]).toMatchObject({
      confirmed: true,
      rating: "notForMe",
    });
  });

  it.each<Category>(["readingNow", "wantToRead", "maybeLater"])(
    "5a: a confirmed book the child moved to %s is still confirmed and keeps its rating",
    async (category) => {
      const { familyId, childId } = await family();
      const book = await insertBook("active");
      await insertShelfEntry(childId, book, category);
      await insertFinishConfirmation(childId, book);
      await insertRating(childId, book, "lovedIt");

      const view = await getShelfForParent(familyId, childId);
      const group = view?.categories.find((g) => g.category === category);

      expect(group?.entries[0]).toMatchObject({
        confirmed: true,
        rating: "lovedIt",
      });
    },
  );

  it("5a: an entry outside Finished with no confirmation is not confirmed", async () => {
    const { familyId, childId } = await family();
    const book = await insertBook("active");
    await insertShelfEntry(childId, book, "readingNow");

    const view = await getShelfForParent(familyId, childId);

    expect(view?.categories[0]?.entries[0]).toMatchObject({
      confirmed: false,
      rating: null,
    });
  });

  it("rating rule: a rating row with no confirmation record is never shown", async () => {
    const { familyId, childId } = await family();
    const finished = await insertBook("active", "Finished Book");
    const reading = await insertBook("active", "Reading Book");
    await insertShelfEntry(childId, finished, "finished");
    await insertShelfEntry(childId, reading, "readingNow");
    await insertRating(childId, finished, "lovedIt");
    await insertRating(childId, reading, "lovedIt");

    const view = await getShelfForParent(familyId, childId);

    expect(view?.categories[3]?.entries[0]?.rating).toBeNull();
    expect(view?.categories[0]?.entries[0]?.rating).toBeNull();
  });

  it("5b: a blocked, draft or missing book's entry is left out and the rest is shown", async () => {
    const { familyId, childId } = await family();
    const ok = await insertBook("active", "Visible Book");
    const blocked = await insertBook("blocked", "Blocked Book");
    const draft = await insertBook("draft", "Draft Book");
    await insertShelfEntry(childId, ok, "readingNow");
    await insertShelfEntry(childId, blocked, "readingNow");
    await insertShelfEntry(childId, draft, "wantToRead");
    await insertShelfEntry(childId, "not-in-catalog", "maybeLater");

    const view = await getShelfForParent(familyId, childId);

    expect(entriesOf(view)).toEqual({
      readingNow: ["Visible Book"],
      wantToRead: [],
      maybeLater: [],
      finished: [],
    });
  });

  it("removed or blocked book: a kept rating and confirmation are not shown, and return if the entry returns", async () => {
    const { familyId, childId } = await family();
    const book = await insertBook("active", "Kept Book");
    await insertFinishConfirmation(childId, book);
    await insertRating(childId, book, "lovedIt");

    expect(entriesOf(await getShelfForParent(familyId, childId))).toEqual({
      readingNow: [],
      wantToRead: [],
      maybeLater: [],
      finished: [],
    });

    await insertShelfEntry(childId, book, "finished");
    const back = await getShelfForParent(familyId, childId);
    expect(back?.categories[3]?.entries[0]).toMatchObject({
      title: "Kept Book",
      confirmed: true,
      rating: "lovedIt",
    });
  });

  it("only this child's records are used when two children share a book", async () => {
    const { familyId, childId } = await family();
    const sibling = await insertChild(familyId, { nickname: "Comet" });
    const book = await insertBook("active");
    await insertShelfEntry(childId, book, "finished");
    await insertShelfEntry(sibling, book, "finished");
    await insertFinishConfirmation(sibling, book);
    await insertRating(sibling, book, "lovedIt");

    const view = await getShelfForParent(familyId, childId);

    expect(view?.categories[3]?.entries[0]).toMatchObject({
      confirmed: false,
      rating: null,
    });
  });

  it("fresh read: a block between two loads shows on the second", async () => {
    const { familyId, childId } = await family();
    const book = await insertBook("active", "Soon Blocked");
    await insertShelfEntry(childId, book, "readingNow");
    expect(
      entriesOf(await getShelfForParent(familyId, childId)).readingNow,
    ).toEqual(["Soon Blocked"]);

    await getDb().collection("shelfEntries").deleteMany({ bookId: book });
    await getDb()
      .collection<{ _id: string }>("books")
      .updateOne({ _id: book }, { $set: { status: "blocked" } });

    expect(
      entriesOf(await getShelfForParent(familyId, childId)).readingNow,
    ).toEqual([]);
  });
});

describe("listChildrenForFamily (UC-SHLF-parent-view-shelf 1a)", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("lists only the family's children by ID, nickname and avatar, oldest first", async () => {
    const { familyId } = await family();
    const second = await insertChild(familyId, {
      nickname: "Comet",
      createdAt: new Date("2026-10-05T12:00:00Z"),
    });
    const stranger = await family();

    const children = await listChildrenForFamily(familyId);

    expect(children.map((c) => c.nickname)).toEqual(["Starfish", "Comet"]);
    expect(children[1]?._id).toBe(second);
    expect(children.some((c) => c._id === stranger.childId)).toBe(false);
    for (const child of children) {
      expect(Object.keys(child).sort()).toEqual(["_id", "avatar", "nickname"]);
    }
  });

  it("gives an empty list for a family with no child (1b)", async () => {
    const parent = await insertParent({ parentRole: "main" });

    expect(await listChildrenForFamily(parent.familyId)).toEqual([]);
  });
});

describe("getBooksForShelf (the Catalog's shelf read)", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("returns the title and author of active books only", async () => {
    const active = await insertBook("active", "Active Book");
    const blocked = await insertBook("blocked");
    const draft = await insertBook("draft");

    const books = await getBooksForShelf([active, blocked, draft, "missing"]);

    expect(books).toEqual([
      { id: active, title: "Active Book", author: "A. Writer" },
    ]);
  });

  it("asks the database nothing for an empty list", async () => {
    const find = vi.spyOn(Collection.prototype, "find");

    expect(await getBooksForShelf([])).toEqual([]);
    expect(find).not.toHaveBeenCalled();
    find.mockRestore();
  });
});
