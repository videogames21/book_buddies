import { beforeEach, describe, expect, it } from "vitest";
import { insertShelfEntry } from "../../../tests/fixtures/shelf";
import { resetDatabase } from "../../../tests/integration/db";
import { getDb } from "@/server/lib/db";

// The shelfEntries validator's optional writeVersion (design/shlf.md, Data model,
// "Additions for the child's rating"). Invented children and books only.

const CHILD = "child-a";
const BOOK = "book-1";
const entries = () => getDb().collection("shelfEntries");

beforeEach(resetDatabase);

describe("shelfEntries writeVersion", () => {
  it("is absent on a new entry, and an $inc creates it as an int", async () => {
    await insertShelfEntry(CHILD, BOOK, "finished");
    expect(await entries().findOne()).not.toHaveProperty("writeVersion");

    await entries().updateOne(
      { childId: CHILD, bookId: BOOK },
      { $inc: { writeVersion: 1 } },
    );
    await entries().updateOne(
      { childId: CHILD, bookId: BOOK },
      { $inc: { writeVersion: 1 } },
    );
    expect(await entries().findOne()).toMatchObject({ writeVersion: 2 });
  });

  it("refuses a writeVersion that is not an integer", async () => {
    await insertShelfEntry(CHILD, BOOK, "finished");
    await expect(
      entries().updateOne(
        { childId: CHILD, bookId: BOOK },
        { $set: { writeVersion: "1" } },
      ),
    ).rejects.toThrow();
  });
});
