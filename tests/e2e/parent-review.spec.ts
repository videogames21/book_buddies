import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { ObjectId } from "mongodb";
import { closeE2eDb, e2eDb, signInParent } from "./session-fixture";

// UC-REC-parent-review, end to end. Invented test data only. UC-REC-recommend-quiz-rules
// is not built, so the tests put the pending batch in directly, with a deadline a day
// ahead of the real clock the dev server uses. Its books are removed when it finishes,
// and its titles never repeat another spec's (the reading-profile spec lists every book).
const createdBookIds: string[] = [];

test.afterAll(async () => {
  const db = await e2eDb();
  await db
    .collection<{ _id: string }>("books")
    .deleteMany({ _id: { $in: createdBookIds } });
  await db
    .collection("recommendationBatches")
    .deleteMany({ bookIds: { $in: createdBookIds } });
  await closeE2eDb();
});

async function insertChild(familyId: ObjectId, nickname: string) {
  const db = await e2eDb();
  const _id = randomUUID();
  await db
    .collection<{ _id: string } & Record<string, unknown>>("children")
    .insertOne({
      _id,
      familyId,
      nickname,
      avatar: "1-1",
      createdAt: new Date(),
    });
  return _id;
}

async function insertBook(title: string) {
  const db = await e2eDb();
  const _id = randomUUID();
  // The `books` validator requires every field below (design/adm.md, Data model).
  await db.collection("books").insertOne({
    _id: _id as never,
    title,
    author: "A. Writer",
    matchKey: `${title.toLowerCase()}a writer${_id}`,
    year: 2001,
    genres: ["fantasy"],
    moods: ["calm"],
    format: "picture book",
    length: "quick read",
    ageMin: 6,
    ageMax: 8,
    readingChallenge: "reading independently",
    status: "active",
    createdAt: new Date(),
  });
  createdBookIds.push(_id);
  return _id;
}

/** A Main Parent with one child and a pending batch of the given titles. */
async function setUp(
  context: Parameters<typeof signInParent>[0],
  titles: string[],
) {
  const { familyId } = await signInParent(context, {
    parentRole: "main",
    consentConfirmed: true,
  });
  const nickname = `Heron${String(createdBookIds.length)}`;
  const childId = await insertChild(familyId, nickname);
  const bookIds: string[] = [];
  for (const title of titles) bookIds.push(await insertBook(title));
  const _id = new ObjectId();
  const createdAt = new Date();
  await (await e2eDb()).collection("recommendationBatches").insertOne({
    _id,
    requestId: randomUUID(),
    childId,
    source: "rules",
    status: "pending",
    bookIds,
    createdAt,
    handoffDeadline: new Date(createdAt.getTime() + 24 * 60 * 60 * 1000),
  });
  return { childId, nickname, batchId: _id.toHexString(), bookIds };
}

const storedBatch = async (batchId: string) =>
  (await e2eDb())
    .collection("recommendationBatches")
    .findOne({ _id: new ObjectId(batchId) });

const removeTitle = async (page: Page, title: string) => {
  await page.getByRole("button", { name: `Remove ${title}` }).click();
  await expect(page.getByText(title)).toHaveCount(0);
};

test("main: the parent sees the batch on /parent, removes a book, confirms, sees Released, and the line is gone", async ({
  page,
  context,
}) => {
  const { nickname, batchId, bookIds } = await setUp(context, [
    "Kestrel Cove E2E",
    "Ivy Lantern E2E",
  ]);

  await page.goto("/parent");
  const section = page.getByRole("region", {
    name: "Recommendations to review",
  });
  await expect(section).toBeVisible();
  await section.getByRole("link", { name: `${nickname}: 2 books` }).click();

  await expect(
    page.getByRole("heading", { name: `Recommendations for ${nickname}` }),
  ).toBeVisible();
  await expect(page.getByText("Picked by the rules recommender")).toBeVisible();
  await expect(
    page.getByText("fantasy · calm · quick read").first(),
  ).toBeVisible();
  await removeTitle(page, "Ivy Lantern E2E");
  await page.getByRole("button", { name: "Confirm" }).click();

  await expect(page.getByRole("status")).toHaveText(
    new RegExp(`released to ${nickname}`, "i"),
  );
  await expect(page.getByRole("button", { name: "Confirm" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Remove/ })).toHaveCount(0);
  expect(await storedBatch(batchId)).toMatchObject({
    status: "released",
    bookIds: [bookIds[0]],
    removedBookIds: [bookIds[1]],
  });

  await page.goto("/parent");
  await expect(
    page.getByRole("region", { name: "Recommendations to review" }),
  ).toHaveCount(0);
});

test("4a: removing every book shows the no-picks wording before Confirm, and confirming stores empty", async ({
  page,
  context,
}) => {
  const { childId, nickname, batchId } = await setUp(context, [
    "Marsh Bell E2E",
  ]);
  await page.goto(`/parent/children/${childId}/recommendations/${batchId}`);

  await removeTitle(page, "Marsh Bell E2E");
  await expect(
    page.getByText(
      `No books left. Confirm to let ${nickname} know there are no new picks right now.`,
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Confirm" }).click();

  await expect(page.getByRole("status")).toHaveText(/released/i);
  expect(await storedBatch(batchId)).toMatchObject({
    status: "empty",
    bookIds: [],
  });
});

test("5a: after a dropped confirmation the page refreshes and lets the parent retry", async ({
  page,
  context,
}) => {
  const { childId, batchId } = await setUp(context, ["Otter Reach E2E"]);
  await page.goto(`/parent/children/${childId}/recommendations/${batchId}`);

  // The server cannot be made to fail on demand, so the confirmation's request fails
  // on the way: the batch stays pending and nothing reaches the child.
  await page.route("**/*", (route) =>
    route.request().method() === "POST" ? route.abort() : route.continue(),
  );
  await page.getByRole("button", { name: "Confirm" }).click();

  // Next.js adds an empty route-announcer alert to every page; this is the page's own.
  await expect(
    page.getByRole("alert").filter({ hasText: "couldn’t verify the result" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirm" })).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Remove Otter Reach E2E" }),
  ).toBeVisible();
  expect((await storedBatch(batchId))?.status).toBe("pending");

  await page.unroute("**/*");
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByRole("status")).toHaveText(/released/i);
});

test.describe("review across tabs in a local time zone", () => {
  test.use({ timezoneId: "America/New_York", locale: "en-US" });

  test("renders the local deadline and reloads the released books after another tab removes one", async ({
    context,
    page,
  }) => {
    const { childId, batchId } = await setUp(context, [
      "Brave Meadow E2E",
      "Quiet Hill E2E",
    ]);
    const path = `/parent/children/${childId}/recommendations/${batchId}`;
    const batch = await storedBatch(batchId);
    const expected = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    }).format(batch?.handoffDeadline as Date);
    const other = await context.newPage();
    await page.goto(path);
    await other.goto(path);
    await expect(page.locator("time")).toHaveText(expected);
    await removeTitle(other, "Brave Meadow E2E");
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(page.getByText(/released to/i)).toBeVisible();
    await expect(page.getByText("Quiet Hill E2E")).toBeVisible();
    await expect(page.getByText("Brave Meadow E2E")).toHaveCount(0);
    await other.close();
  });
});
