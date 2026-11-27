import { ObjectId } from "mongodb";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { insertBatch } from "../../../tests/fixtures/batches";
import { insertBook } from "../../../tests/fixtures/catalog";
import {
  insertFinishConfirmation,
  insertRating,
  insertShelfEntry,
} from "../../../tests/fixtures/shelf";
import { insertSuggestion } from "../../../tests/fixtures/suggestions";
import { insertParent } from "../../../tests/fixtures/users";
import { resetDatabase } from "../../../tests/integration/db";
import * as audit from "@/server/audit/audit-log";
import { lockActiveBookForWrite } from "@/server/catalog/books";
import { getDb, withTransaction } from "@/server/lib/db";
import { decideReportedBook, loadReportedBookQueue } from "./book-decisions";

const admin = { userId: new ObjectId().toHexString(), role: "admin" as const };
const block = {
  kind: "block",
  entry: "reports",
  reason: "content concern",
} as const;

beforeEach(resetDatabase);
afterEach(() => vi.restoreAllMocks());

async function report(
  bookId: string,
  userId = new ObjectId(),
  childId = "reader",
) {
  const result = await getDb().collection("bookReports").insertOne({
    bookId,
    childId,
    reportedByUserId: userId,
    reason: "other",
    status: "open",
    reportedAt: new Date(),
    comment: "Private report comment",
  });
  return result.insertedId;
}

it("blocks a book and cleans every current list without changing retained records", async () => {
  const id = await insertBook("active");
  const other = await insertBook("active");
  const db = getDb();
  // The first-year estimate is a few dozen families. Use 100 child shelves, 200
  // current batches and 100 open reports for a heavily shared single title.
  for (let index = 0; index < 100; index++) {
    const child = `reader-${String(index)}`;
    await insertShelfEntry(child, id, "readingNow");
    await insertBatch({ childId: child, bookIds: [id, other] });
    await insertBatch({ childId: child, bookIds: [id], status: "released" });
    await insertSuggestion(child, id);
    await report(id, new ObjectId(), child);
  }
  await insertRating("reader-0", id, "likedIt");
  await insertFinishConfirmation("reader-0", id);
  await insertShelfEntry("reader-0", other, "wantToRead");
  await report(other);
  expect(await loadReportedBookQueue()).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ bookId: id, count: 100 }),
    ]),
  );

  await expect(decideReportedBook(admin, id, block)).resolves.toEqual({
    ok: true,
    data: { outcome: "BLOCKED", reason: "content concern" },
  });
  await expect(
    db.collection("shelfEntries").countDocuments({ bookId: id }),
  ).resolves.toBe(0);
  await expect(
    db.collection("shelfEntries").countDocuments({ bookId: other }),
  ).resolves.toBe(1);
  await expect(
    db.collection("recommendationBatches").countDocuments({ bookIds: id }),
  ).resolves.toBe(0);
  await expect(
    db.collection("recommendationBatches").countDocuments({ bookIds: other }),
  ).resolves.toBe(100);
  await expect(
    db.collection("parentSuggestions").countDocuments({ bookId: id }),
  ).resolves.toBe(0);
  await expect(
    db
      .collection("bookReports")
      .countDocuments({ bookId: id, status: "blocked" }),
  ).resolves.toBe(100);
  await expect(
    db.collection("ratings").countDocuments({ bookId: id }),
  ).resolves.toBe(1);
  await expect(
    db.collection("finishConfirmations").countDocuments({ bookId: id }),
  ).resolves.toBe(1);
  await expect(
    db.collection("auditLog").findOne({ event: "catalog.book_blocked" }),
  ).resolves.toMatchObject({
    recordId: id,
    actorId: new ObjectId(admin.userId),
  });
});

it("leaves reports open for a Catalog block and later closes without overwriting the original reason", async () => {
  const id = await insertBook("draft");
  const db = getDb();
  const reportId = await report(id);
  expect(
    (await decideReportedBook(admin, id, { ...block, entry: "catalog" })).ok,
  ).toBe(true);
  await expect(
    db.collection("bookReports").findOne({ _id: reportId }),
  ).resolves.toMatchObject({ status: "open" });
  const close = { kind: "close", entry: "reports" } as const;
  await expect(decideReportedBook(admin, id, close)).resolves.toMatchObject({
    ok: true,
    data: { outcome: "ALREADY_BLOCKED", reason: "content concern" },
  });
  await decideReportedBook(admin, id, close);
  await expect(
    db
      .collection("auditLog")
      .countDocuments({ event: "report.closed_as_blocked" }),
  ).resolves.toBe(1);
});

it("rolls back Catalog and owner writes when audit fails", async () => {
  const id = await insertBook("active");
  const reportId = await report(id);
  await insertShelfEntry("reader", id, "readingNow");
  await insertBatch({ childId: "reader", bookIds: [id] });
  await insertSuggestion("reader", id);
  vi.spyOn(audit, "appendAudit").mockRejectedValueOnce(
    new Error("Invented audit failure"),
  );
  vi.spyOn(console, "error").mockImplementation(() => undefined);

  await expect(decideReportedBook(admin, id, block)).resolves.toMatchObject({
    error: { code: "BLOCK_FAILED" },
  });
  const db = getDb();
  await expect(
    db.collection<{ _id: string }>("books").findOne({ _id: id }),
  ).resolves.toMatchObject({ status: "active" });
  await expect(
    db.collection("bookReports").findOne({ _id: reportId }),
  ).resolves.toMatchObject({ status: "open" });
  await expect(
    db.collection("shelfEntries").countDocuments({ bookId: id }),
  ).resolves.toBe(1);
  await expect(
    db.collection("recommendationBatches").countDocuments({ bookIds: id }),
  ).resolves.toBe(1);
  await expect(
    db.collection("parentSuggestions").countDocuments({ bookId: id }),
  ).resolves.toBe(1);
});

it("warns only the recorded parent once and discards only that report", async () => {
  const id = await insertBook("active");
  const parent = await insertParent({ parentRole: "main" });
  const recipientId = new ObjectId(parent.userId);
  const target = await report(id, recipientId);
  const untouched = await report(id);
  const warn = {
    kind: "warn",
    entry: "reports",
    reportId: target.toHexString(),
  } as const;
  const results = await Promise.all([
    decideReportedBook(admin, id, warn),
    decideReportedBook(admin, id, warn),
  ]);
  expect(results.filter(({ ok }) => ok)).toHaveLength(1);
  const db = getDb();
  await expect(
    db.collection("parentWarnings").countDocuments({ recipientId }),
  ).resolves.toBe(1);
  await expect(
    db.collection("bookReports").findOne({ _id: untouched }),
  ).resolves.toMatchObject({ status: "open" });
  await expect(
    db.collection("bookReports").findOne({ _id: target }),
  ).resolves.toMatchObject({ status: "discarded" });
});

it("serializes against a same-book writer so blocking leaves no batch", async () => {
  const id = await insertBook("active");
  await report(id);
  const results = await Promise.all([
    decideReportedBook(admin, id, block),
    withTransaction(async (tx) => {
      if (await lockActiveBookForWrite(tx, id)) {
        await insertBatch({ childId: "reader", bookIds: [id] }, tx);
      }
    }),
  ]);
  expect(results[0].ok).toBe(true);
  await expect(
    getDb().collection("recommendationBatches").countDocuments({ bookIds: id }),
  ).resolves.toBe(0);
});
