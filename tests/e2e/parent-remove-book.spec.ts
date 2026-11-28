import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import type { ObjectId } from "mongodb";
import { closeE2eDb, e2eDb, signInParent } from "./session-fixture";
import { addBook, shelve } from "./shelf-fixture";

// UC-SHLF-parent-remove-book in the browser (design/shlf.md, Tests, "main, 3a, 3b").
// Invented children and books only.

// The browser tests share one database, and the reading-profile spec lists every active
// book, so this spec removes its books and every record about them when it finishes.
const createdBookIds: string[] = [];

test.afterAll(async () => {
  const db = await e2eDb();
  const bookId = { $in: createdBookIds };
  await db.collection<{ _id: string }>("books").deleteMany({ _id: bookId });
  for (const name of ["shelfEntries", "childNotices"]) {
    await db.collection(name).deleteMany({ bookId });
  }
  await closeE2eDb();
});

async function insertChild(familyId: ObjectId) {
  const _id = randomUUID();
  await (
    await e2eDb()
  )
    .collection<{ _id: string; [field: string]: unknown }>("children")
    .insertOne({
      _id,
      familyId,
      nickname: "Starfish",
      avatar: "1-1",
      createdAt: new Date(),
    });
  return _id;
}

async function familyWithBook(
  context: Parameters<typeof signInParent>[0],
  title: string,
) {
  const { familyId } = await signInParent(context, {
    parentRole: "main",
    consentConfirmed: true,
  });
  const childId = await insertChild(familyId);
  const bookId = await addBook(title);
  createdBookIds.push(bookId);
  await shelve(childId, bookId, "readingNow");
  return { childId, bookId };
}

const noticesFor = async (bookId: string) =>
  (await e2eDb()).collection("childNotices").countDocuments({ bookId });

async function openRemove(page: Page, childId: string, title: string) {
  await page.goto(`/parent/children/${childId}/shelf`);
  await page.getByRole("button", { name: new RegExp(title) }).click();
  await page
    .getByRole("complementary", { name: "Selected book" })
    .getByRole("link", { name: "Remove from shelf" })
    .click();
}

test("main: from the shelf, confirm the removal; Remove is disabled while pending, and the book leaves the shelf", async ({
  page,
  context,
}) => {
  const title = "Lantern Hill Remove E2E";
  const { childId, bookId } = await familyWithBook(context, title);
  await openRemove(page, childId, title);

  // Step 3: names the book and says the child will be told.
  await expect(
    page.getByRole("heading", { name: "Remove from shelf?" }),
  ).toBeVisible();
  await expect(page.getByText(title)).toBeVisible();
  await expect(
    page.getByText("Starfish will be told the book was removed."),
  ).toBeVisible();

  // Hold the action's answer so the pending step can be seen.
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/remove", async (route) => {
    if (route.request().method() === "POST") await held;
    await route.continue();
  });

  await page.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByRole("button", { name: "Removing…" })).toBeDisabled();
  release();

  // Step 6.
  await expect(
    page.getByRole("heading", { name: "Book removed" }),
  ).toBeVisible();
  expect(await noticesFor(bookId)).toBe(1);

  await page.getByRole("link", { name: "Back to Starfish’s shelf" }).click();
  await expect(
    page.getByRole("heading", { name: "Starfish’s shelf" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: new RegExp(title) }),
  ).toHaveCount(0);
});

test("3a: Cancel returns to the shelf and writes nothing", async ({
  page,
  context,
}) => {
  const title = "Cancel Remove E2E";
  const { childId, bookId } = await familyWithBook(context, title);
  await openRemove(page, childId, title);
  const posts: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") posts.push(request.url());
  });

  await page.getByRole("link", { name: "Cancel" }).click();

  await expect(page).toHaveURL(`/parent/children/${childId}/shelf`);
  await expect(
    page.getByRole("button", { name: new RegExp(title) }),
  ).toBeVisible();
  expect(posts).toEqual([]);
  expect(await noticesFor(bookId)).toBe(0);
});

test("3b: the remove page of a book already off the shelf says so, with no form", async ({
  page,
  context,
}) => {
  const { childId, bookId } = await familyWithBook(context, "Gone Remove E2E");
  await (
    await e2eDb()
  )
    .collection("shelfEntries")
    .deleteOne({ childId, bookId });

  await page.goto(`/parent/children/${childId}/shelf/${bookId}/remove`);

  await expect(
    page.getByRole("heading", { name: "Already off the shelf" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove" })).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Back to Starfish’s shelf" }),
  ).toBeVisible();
});
