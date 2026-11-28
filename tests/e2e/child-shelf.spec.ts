import { expect, test, type Page } from "@playwright/test";
import { ObjectId } from "mongodb";
import {
  closeE2eDb,
  e2eDb,
  signInChild,
  signInParent,
} from "./session-fixture";
import { addBook, shelve } from "./shelf-fixture";

// UC-SHLF-kid-view-shelf in the browser (design/shlf.md, Tests; browser tests stand in
// for its component rows). Invented children and books only.
test.afterAll(closeE2eDb);

const FINISH_NOTICE =
  "Whoops! Looks like you didn’t finish your book. It went back to where it was.";

/** A signed-in child with a confirmed, rated book in a series and one awaiting. */
async function childWithBooks(context: Parameters<typeof signInChild>[0]) {
  const child = await signInChild(context);
  const confirmed = await addBook("Moon Garden", { seriesName: "Night Tales" });
  const waiting = await addBook("River Song");
  await shelve(child.childId, confirmed, "readingNow");
  await shelve(child.childId, waiting, "finished");
  const db = await e2eDb();
  const key = { childId: child.childId, bookId: confirmed };
  await db.collection("finishConfirmations").insertOne({
    ...key,
    confirmedByParentId: new ObjectId(),
    confirmedAt: new Date(),
  });
  await db
    .collection("ratings")
    .insertOne({ ...key, value: "lovedIt", ratedAt: new Date() });
  return { ...child, confirmed };
}

async function openShelf(page: Page) {
  await page.goto("/child/shelf");
  await page.waitForLoadState("networkidle");
}

const book = (page: Page, title: string) =>
  page.getByRole("button", { name: title });
const panel = (page: Page) =>
  page.getByRole("complementary", { name: "Selected book" });

test("shows the four categories in order, and a tapped book's details without a request", async ({
  page,
  context,
}) => {
  const { childId } = await childWithBooks(context);
  await shelve(childId, await addBook("Star Map"), "readingNow");
  await openShelf(page);
  await expect(page.getByRole("heading", { level: 2 })).toHaveText([
    "Reading Now",
    "Want to Read",
    "Maybe Later",
    "Finished",
  ]);
  // 3a: an empty category is its heading and nothing else.
  await expect(page.getByRole("region", { name: "Want to Read" })).toHaveText(
    "Want to Read",
  );
  await expect(page.getByText("Find a book you like")).toHaveCount(0);

  // Any send, and any read of a shelf address.
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" || request.url().includes("/child/shelf")) {
      requests.push(request.url());
    }
  });
  const url = page.url();
  await book(page, "Moon Garden").click();
  await expect(panel(page)).toContainText("A. Writer");
  await expect(panel(page)).toContainText("Series: Night Tales");
  await expect(panel(page)).toContainText("My rating: Loved it");
  await expect(panel(page)).not.toContainText("650L");
  // Confirmed but in Reading Now: no Rate (UC-SHLF-kid-rate-book PRE-2, OI-75).
  await expect(panel(page).getByRole("link")).toHaveText(["Move", "Remove"]);
  expect(page.url()).toBe(url);
  expect(requests).toEqual([]);

  // 3c and 5a: awaiting confirmation has no icon and no Rate.
  await expect(
    book(page, "Moon Garden").getByRole("img", { name: "Finished" }),
  ).toBeVisible();
  await expect(book(page, "River Song").getByRole("img")).toHaveCount(0);
  // Only a Finished book that is awaiting confirmation is grayed.
  const GRAY = "rgb(230, 230, 224)";
  await expect(book(page, "River Song")).toHaveCSS("background-color", GRAY);
  for (const title of ["Moon Garden", "Star Map"]) {
    await expect(book(page, title)).not.toHaveCSS("background-color", GRAY);
  }
  await book(page, "River Song").click();
  await expect(panel(page).getByRole("link")).toHaveText(["Move", "Remove"]);
  await expect(panel(page)).not.toContainText("Series");
  // The way into the rating page is tested in kid-rate-book.spec.ts.
});

test("the move, remove and dashboard placeholders lead back to the shelf", async ({
  page,
  context,
}) => {
  await childWithBooks(context);
  await openShelf(page);
  for (const [link, heading] of [
    ["Move", "Move a book"],
    ["Remove", "Remove a book"],
  ] as const) {
    await book(page, "River Song").click();
    await panel(page).getByRole("link", { name: link, exact: true }).click();
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    await page.getByRole("link", { name: "Back to My Shelf" }).click();
    await expect(page).toHaveURL(/\/child\/shelf$/);
  }
  // 3e.
  await page.getByRole("link", { name: "My Dashboard" }).click();
  await expect(page).toHaveURL(/\/child\/dashboard$/);
  await page.getByRole("link", { name: "Back to My Shelf" }).click();
  await expect(page).toHaveURL(/\/child\/shelf$/);
});

test("an empty shelf says to find a book, and each notice stays until OK", async ({
  page,
  context,
}) => {
  const { childId } = await signInChild(context);
  const removed = await addBook("Gone Book");
  const db = await e2eDb();
  await db.collection("childNotices").insertMany([
    { childId, kind: "book-removed", bookId: removed, createdAt: new Date(1) },
    { childId, kind: "finish-declined", createdAt: new Date(2) },
    // The Catalog returns no such book, so this notice has no title.
    {
      childId,
      kind: "book-removed",
      bookId: "not-in-catalog",
      createdAt: new Date(3),
    },
  ]);
  await openShelf(page);
  await expect(page.getByText("Find a book you like")).toBeVisible();
  const removal = page.getByText("Gone Book was taken off your shelf.");
  await expect(removal).toBeVisible();
  await expect(page.getByText(FINISH_NOTICE)).toBeVisible();
  await expect(
    page.getByText("A book was taken off your shelf."),
  ).toBeVisible();

  // Loading again uses nothing up.
  await openShelf(page);
  await expect(removal).toBeVisible();
  await page.getByRole("button", { name: "OK" }).first().click();
  await expect(removal).toHaveCount(0);
  await expect(page.getByText(FINISH_NOTICE)).toBeVisible();

  await openShelf(page);
  await expect(removal).toHaveCount(0);
  await expect(page.getByText(FINISH_NOTICE)).toBeVisible();
});

test("after OK, Back does not bring the notice back", async ({
  page,
  context,
}) => {
  const { childId } = await signInChild(context);
  const db = await e2eDb();
  await db
    .collection("childNotices")
    .insertOne({ childId, kind: "finish-declined", createdAt: new Date() });
  await openShelf(page);
  await page.getByRole("button", { name: "OK" }).click();
  await expect(page.getByText(FINISH_NOTICE)).toHaveCount(0);
  await page.getByRole("link", { name: "My Dashboard" }).click();
  await expect(page).toHaveURL(/\/child\/dashboard$/);
  await page.goBack();
  await expect(page.getByRole("heading", { name: "My Shelf" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(FINISH_NOTICE)).toHaveCount(0);
});

test("each rating shows in its own words", async ({ page, context }) => {
  const { childId } = await signInChild(context);
  const db = await e2eDb();
  const ratings = [
    ["lovedIt", "Loved it"],
    ["likedIt", "Liked it"],
    ["okay", "It was okay"],
    ["notForMe", "Not for me"],
  ] as const;
  for (const [value, words] of ratings) {
    const key = { childId, bookId: await addBook(`Book ${words}`) };
    await shelve(childId, key.bookId, "finished");
    await db.collection("finishConfirmations").insertOne({
      ...key,
      confirmedByParentId: new ObjectId(),
      confirmedAt: new Date(),
    });
    await db
      .collection("ratings")
      .insertOne({ ...key, value, ratedAt: new Date() });
  }
  await openShelf(page);
  for (const [, words] of ratings) {
    await book(page, `Book ${words}`).click();
    await expect(panel(page)).toContainText(`My rating: ${words}`);
  }
});

test("Close shuts the book and goes back to it", async ({ page, context }) => {
  await childWithBooks(context);
  await openShelf(page);
  await book(page, "River Song").click();
  await expect(panel(page)).toBeFocused();
  await panel(page).getByRole("button", { name: "Close" }).click();
  await expect(panel(page)).toHaveCount(0);
  await expect(book(page, "River Song")).toBeFocused();
});

test("an OK that cannot be sent keeps the notice and can be tried again", async ({
  page,
  context,
}) => {
  const { childId } = await signInChild(context);
  const db = await e2eDb();
  await db
    .collection("childNotices")
    .insertOne({ childId, kind: "finish-declined", createdAt: new Date() });
  await openShelf(page);
  await page.route("**/child/shelf", (route) =>
    route.request().method() === "POST" ? route.abort() : route.fallback(),
  );
  await page.getByRole("button", { name: "OK" }).click();
  await expect(page.getByText("Try again or ask a grown-up")).toBeVisible();
  await expect(page.getByText(FINISH_NOTICE)).toBeVisible();

  await page.unrouteAll();
  await page.getByRole("button", { name: "OK" }).click();
  await expect(page.getByText(FINISH_NOTICE)).toHaveCount(0);
});

for (const now of ["signed out", "signed in as a parent"] as const) {
  test(`OK when the browser is ${now} goes to sign-in and keeps the notice`, async ({
    page,
    context,
  }) => {
    const { childId, sessionId } = await signInChild(context);
    const db = await e2eDb();
    await db
      .collection("childNotices")
      .insertOne({ childId, kind: "finish-declined", createdAt: new Date() });
    await openShelf(page);
    if (now === "signed out") {
      await db.collection("sessions").deleteOne({ _id: sessionId });
    } else {
      // The same cookie name, so this replaces the child's session.
      await signInParent(context, {
        parentRole: "main",
        consentConfirmed: true,
      });
    }
    await page.getByRole("button", { name: "OK" }).click();
    await expect(page).toHaveURL(/\/child\/sign-in$/);
    expect(
      await db.collection("childNotices").findOne({ childId }),
    ).not.toHaveProperty("seenAt");
  });
}

test("a shelf that fails to load shows the retry screen and no books", async ({
  page,
  context,
}) => {
  const { childId } = await signInChild(context);
  await shelve(childId, await addBook("Whole Book"), "readingNow");
  // A title that is not text makes this render fail.
  const broken = await addBook({ broken: true });
  await shelve(childId, broken, "readingNow");
  await page.goto("/child/shelf");
  await expect(page.getByRole("heading", { name: "Oops!" })).toBeVisible();
  await expect(page.getByText("Whole Book")).toHaveCount(0);

  const db = await e2eDb();
  await db
    .collection<{ _id: string; title: string }>("books")
    .updateOne({ _id: broken }, { $set: { title: "Mended Book" } });
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(book(page, "Mended Book")).toBeVisible();
});

test("after sign-out, Back does not bring the books back", async ({
  page,
  context,
}) => {
  await childWithBooks(context);
  await page.goto("/child");
  await page.getByRole("link", { name: "My Shelf" }).click();
  await expect(book(page, "Moon Garden")).toBeVisible();
  await page.getByRole("link", { name: "Back" }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/child\/sign-in$/);

  await page.goBack();
  await expect(page).toHaveURL(/\/child\/sign-in$/);
  await expect(page.getByText("Moon Garden")).toHaveCount(0);
});
