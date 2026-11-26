import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { ObjectId } from "mongodb";
import {
  closeE2eDb,
  e2eDb,
  signInChild,
  signInParent,
} from "./session-fixture";

test.afterAll(closeE2eDb);

test("loads the child's shelf, opens local details and dismisses a notice only on OK", async ({
  context,
  page,
}) => {
  const { childId } = await signInChild(context);
  const db = await e2eDb();
  const bookId = randomUUID();
  const noticeId = new ObjectId();
  const at = new Date();
  await db
    .collection<{ _id: string; [key: string]: unknown }>("books")
    .insertOne({
      _id: bookId,
      title: "Lantern Meadow",
      author: "A. Writer",
      seriesName: "Meadow stories",
      matchKey: `lantern-meadow-${bookId}`,
      year: 2001,
      genres: ["fantasy"],
      moods: ["calm"],
      format: "picture book",
      length: "quick read",
      ageMin: 6,
      ageMax: 8,
      readingChallenge: "reading independently",
      status: "active",
      createdAt: at,
    });
  await db.collection("shelfEntries").insertMany([
    { childId, bookId, category: "readingNow", movedAt: at },
    { childId: randomUUID(), bookId, category: "finished", movedAt: at },
  ]);
  await db.collection("finishConfirmations").insertOne({
    childId,
    bookId,
    confirmedByParentId: new ObjectId(),
    confirmedAt: at,
  });
  await db.collection("ratings").insertOne({
    childId,
    bookId,
    value: "likedIt",
    ratedAt: at,
  });
  await db.collection("childNotices").insertOne({
    _id: noticeId,
    childId,
    kind: "book-removed",
    bookId: randomUUID(),
    createdAt: at,
  });
  await page.goto("/child/shelf");
  await expect(page.getByRole("heading", { level: 2 })).toHaveText([
    "Reading Now",
    "Want to Read",
    "Maybe Later",
    "Finished",
  ]);
  const book = page.getByRole("button", { name: /Lantern Meadow/ });
  await expect(book).toHaveCount(1);
  await book.click();
  await expect(page).toHaveURL(/\/child\/shelf$/);
  await expect(page.getByText("Meadow stories")).toBeVisible();
  await expect(page.getByText("Liked it")).toBeVisible();
  await expect(
    page.getByText("A book was taken off your shelf."),
  ).toBeVisible();
  expect(
    await db.collection("childNotices").findOne({ _id: noticeId }),
  ).not.toHaveProperty("seenAt");
  await page.getByRole("button", { name: "OK" }).click();
  await expect(page.getByText("A book was taken off your shelf.")).toHaveCount(
    0,
  );
  await page.reload();
  await expect(page.getByText("A book was taken off your shelf.")).toHaveCount(
    0,
  );
  expect(
    await db.collection("childNotices").findOne({ _id: noticeId }),
  ).toHaveProperty("seenAt", expect.any(Date));
});

test("shows an empty shelf for a child and rejects parent access", async ({
  context,
  page,
}) => {
  await page.goto("/child/shelf");
  await expect(page).toHaveURL(/\/child\/sign-in$/);
  await signInChild(context);
  await page.goto("/child/shelf");
  await expect(
    page.getByText("Your shelf is empty. Find a book to get started."),
  ).toBeVisible();
  await signInParent(context, { parentRole: "main", consentConfirmed: true });
  const response = await page.goto("/child/shelf");
  expect(response?.status()).toBe(404);
});
