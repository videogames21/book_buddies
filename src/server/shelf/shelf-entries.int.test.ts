import { beforeEach, describe, expect, it } from "vitest";
import { insertShelfEntry } from "../../../tests/fixtures/shelf";
import { resetDatabase } from "../../../tests/integration/db";

const { addShelfEntryInTx } = await import("./shelf-entries");
const { getDb, withTransaction } = await import("@/server/lib/db");
const { resetClock, setClock } = await import("@/server/lib/clock");

// Invented data only.
const AT = new Date("2026-11-27T15:00:00Z");

beforeEach(async () => {
  await resetDatabase();
  setClock(() => AT);
  return () => {
    resetClock();
  };
});

function entries(childId: string) {
  return getDb()
    .collection("shelfEntries")
    .find({ childId }, { projection: { _id: 0 } })
    .toArray();
}

describe("addShelfEntryInTx (UC-REC-kid-review steps 4–5, 4a)", () => {
  it("adds the entry in the given category with movedAt from now()", async () => {
    const result = await withTransaction((tx) =>
      addShelfEntryInTx(tx, "child-1", "book-1", "readingNow"),
    );

    expect(result).toBe("added");
    expect(await entries("child-1")).toEqual([
      {
        childId: "child-1",
        bookId: "book-1",
        category: "readingNow",
        movedAt: AT,
      },
    ]);
  });

  it("4a: a book already on the shelf keeps its one entry, category and time", async () => {
    const earlier = new Date("2026-11-01T12:00:00Z");
    await insertShelfEntry("child-1", "book-1", "finished", earlier);

    const result = await withTransaction((tx) =>
      addShelfEntryInTx(tx, "child-1", "book-1", "maybeLater"),
    );

    expect(result).toBe("alreadyOnShelf");
    expect(await entries("child-1")).toEqual([
      {
        childId: "child-1",
        bookId: "book-1",
        category: "finished",
        movedAt: earlier,
      },
    ]);
  });

  it("writes nothing when the caller's transaction aborts", async () => {
    await expect(
      withTransaction(async (tx) => {
        await addShelfEntryInTx(tx, "child-1", "book-1", "readingNow");
        throw new Error("abort");
      }),
    ).rejects.toThrow("abort");

    expect(await entries("child-1")).toEqual([]);
  });
});
