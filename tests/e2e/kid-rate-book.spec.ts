import { expect, test, type Page } from "@playwright/test";
import { createHash, randomBytes } from "node:crypto";
import { ObjectId } from "mongodb";
import { closeE2eDb, e2eDb, signInChild } from "./session-fixture";
import { addBook, shelve } from "./shelf-fixture";

// UC-SHLF-kid-rate-book in the browser (design/shlf.md, Tests: main, 1a, 1b, 2a, 5a, 6b).
// Invented children and books only.
test.afterAll(closeE2eDb);

const RATE_PAGE_TITLE = "Rate a book · BookBuddies";

/** A signed-in child whose family's consent is confirmed, with one ratable book. */
async function childWithRatableBook(
  context: Parameters<typeof signInChild>[0],
) {
  const child = await signInChild(context);
  const db = await e2eDb();
  const doc = await db
    .collection<{ _id: string; familyId: ObjectId }>("children")
    .findOne({ _id: child.childId });
  const at = new Date();
  await db.collection("consentRecords").insertOne({
    familyId: doc?.familyId,
    parentUserId: new ObjectId(),
    noticeVersion: "e2e",
    method: "email-plus",
    acknowledgedAt: at,
    confirmBy: new Date(at.getTime() + 14 * 24 * 60 * 60 * 1000),
    confirmationTokenHash: createHash("sha256")
      .update(randomBytes(32))
      .digest("hex"),
    confirmedAt: at,
  });
  const bookId = await addBook("Moon Garden");
  await shelve(child.childId, bookId, "finished");
  await confirm(child.childId, bookId);
  return { ...child, bookId };
}

async function confirm(childId: string, bookId: string) {
  const db = await e2eDb();
  await db.collection("finishConfirmations").insertOne({
    childId,
    bookId,
    confirmedByParentId: new ObjectId(),
    confirmedAt: new Date(),
  });
}

const choice = (page: Page, label: string) =>
  page.getByRole("button", { name: label, exact: true });

async function ratingsOf(childId: string) {
  const db = await e2eDb();
  return db.collection("ratings").find({ childId }).toArray();
}

test("main and 6b: each choice saves with the same thank-you, and a reload and the shelf show it", async ({
  page,
  context,
}) => {
  const { childId, bookId } = await childWithRatableBook(context);
  await page.goto("/child/shelf");
  await page.getByRole("button", { name: "Moon Garden" }).click();
  await page
    .getByRole("complementary", { name: "Selected book" })
    .getByRole("link", { name: "Rate" })
    .click();
  await expect(page).toHaveURL(new RegExp(`/child/shelf/${bookId}/rate$`));
  await expect(page).toHaveTitle(RATE_PAGE_TITLE);
  await expect(
    page.getByRole("heading", { name: "Moon Garden" }),
  ).toBeVisible();

  for (const label of ["Loved it", "Liked it", "It was okay", "Not for me"]) {
    await choice(page, label).click();
    await expect(page.getByRole("status")).toHaveText("Thanks, Starfish!");
    await expect(choice(page, label)).toHaveAttribute("aria-pressed", "true");
  }
  // No follow-up books, no score or count (6b, BR-kid-no-metrics).
  await expect(page.getByRole("main")).not.toContainText(/\d/);
  expect(await ratingsOf(childId)).toMatchObject([{ value: "notForMe" }]);

  await page.reload();
  await expect(choice(page, "Not for me")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("status")).toHaveCount(0);

  await page.getByRole("link", { name: "Done" }).click();
  await expect(page).toHaveURL(/\/child\/shelf$/);
  await page.getByRole("button", { name: "Moon Garden" }).click();
  await expect(
    page.getByRole("complementary", { name: "Selected book" }),
  ).toContainText("My rating: Not for me");
});

test("1a and 1b: a book outside Finished or awaiting confirmation offers no rating, and its page is a 404", async ({
  page,
  context,
}) => {
  const { childId } = await childWithRatableBook(context);
  const reading = await addBook("Star Map");
  await shelve(childId, reading, "readingNow");
  await confirm(childId, reading);
  const waiting = await addBook("River Song");
  await shelve(childId, waiting, "finished");

  await page.goto("/child/shelf");
  for (const title of ["Star Map", "River Song"]) {
    await page.getByRole("button", { name: title }).click();
    await expect(
      page
        .getByRole("complementary", { name: "Selected book" })
        .getByRole("link"),
    ).toHaveText(["Move", "Remove"]);
  }
  for (const bookId of [reading, waiting, "no-such-book"]) {
    const response = await page.goto(`/child/shelf/${bookId}/rate`);
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("button", { name: "Loved it" })).toHaveCount(0);
  }
  expect(await ratingsOf(childId)).toEqual([]);
});

test("2a: leaving without a choice writes nothing, and a rated book keeps its choice", async ({
  page,
  context,
}) => {
  const { childId, bookId } = await childWithRatableBook(context);
  await page.goto(`/child/shelf/${bookId}/rate`);
  await page.getByRole("link", { name: "Done" }).click();
  await expect(page).toHaveURL(/\/child\/shelf$/);
  expect(await ratingsOf(childId)).toEqual([]);

  await page.goto(`/child/shelf/${bookId}/rate`);
  await choice(page, "Liked it").click();
  await expect(page.getByRole("status")).toBeVisible();
  await page.goto(`/child/shelf/${bookId}/rate`);
  await page.getByRole("link", { name: "Done" }).click();
  expect(await ratingsOf(childId)).toMatchObject([{ value: "likedIt" }]);
});

test("5a: a save that fails keeps the choice selected, and tapping it again saves", async ({
  page,
  context,
}) => {
  const { childId, bookId } = await childWithRatableBook(context);
  await page.goto(`/child/shelf/${bookId}/rate`);
  await page.waitForLoadState("networkidle");
  await page.route(`**/child/shelf/${bookId}/rate`, (route) =>
    route.request().method() === "POST" ? route.abort() : route.fallback(),
  );
  await choice(page, "Loved it").click();
  await expect(
    page.getByRole("alert").filter({ hasText: "That didn’t save." }),
  ).toHaveText("That didn’t save. Tap your choice again.");
  await expect(choice(page, "Loved it")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("status")).toHaveCount(0);
  expect(await ratingsOf(childId)).toEqual([]);

  await page.unrouteAll();
  await choice(page, "Loved it").click();
  await expect(page.getByRole("status")).toHaveText("Thanks, Starfish!");
  expect(await ratingsOf(childId)).toMatchObject([{ value: "lovedIt" }]);
});
