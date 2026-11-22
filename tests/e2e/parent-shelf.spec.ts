import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { ObjectId } from "mongodb";
import { closeE2eDb, e2eDb, signInAs, signInParent } from "./session-fixture";

// UC-SHLF-parent-view-shelf, end to end. Invented test data only. Nothing in the app
// writes shelf records yet, so the tests put them in directly.

// All the browser tests share one database in one run, and the reading-profile spec lists
// every active book. So this spec removes the books it made (and the shelf records for
// them) when it finishes, and its titles never repeat another spec's.
const createdBookIds: string[] = [];

test.afterAll(async () => {
  const db = await e2eDb();
  const bookId = { $in: createdBookIds };
  await db.collection<{ _id: string }>("books").deleteMany({ _id: bookId });
  await db.collection("shelfEntries").deleteMany({ bookId });
  await db.collection("ratings").deleteMany({ bookId });
  await db.collection("finishConfirmations").deleteMany({ bookId });
  await closeE2eDb();
});

async function insertChild(familyId: ObjectId, nickname = "Starfish") {
  const db = await e2eDb();
  const _id = randomUUID();
  await db
    .collection<{
      _id: string;
      familyId: ObjectId;
      nickname: string;
      avatar: string;
      createdAt: Date;
    }>("children")
    .insertOne({
      _id,
      familyId,
      nickname,
      avatar: "1-1",
      createdAt: new Date(),
    });
  return _id;
}

async function insertBook(title: string, status = "active") {
  const db = await e2eDb();
  const _id = randomUUID();
  await db
    .collection<{ _id: string; title: string; author: string; status: string }>(
      "books",
    )
    .insertOne({ _id, title, author: "A. Writer", status });
  createdBookIds.push(_id);
  return _id;
}

async function shelve(
  childId: string,
  bookId: string,
  category: "readingNow" | "wantToRead" | "maybeLater" | "finished",
  options: { confirmed?: boolean; rating?: string } = {},
) {
  const db = await e2eDb();
  await db
    .collection("shelfEntries")
    .insertOne({ childId, bookId, category, movedAt: new Date() });
  if (options.confirmed) {
    await db.collection("finishConfirmations").insertOne({
      childId,
      bookId,
      confirmedByParentId: new ObjectId(),
      confirmedAt: new Date(),
    });
  }
  if (options.rating) {
    await db.collection("ratings").insertOne({
      childId,
      bookId,
      value: options.rating,
      ratedAt: new Date(),
    });
  }
}

test("main: the four categories show in order and a tapped book shows its rating and links", async ({
  page,
  context,
}) => {
  const { familyId } = await signInParent(context, {
    parentRole: "main",
    consentConfirmed: true,
  });
  const childId = await insertChild(familyId);
  const moon = await insertBook("Lantern Hill E2E");
  await shelve(childId, moon, "finished", {
    confirmed: true,
    rating: "lovedIt",
  });
  await page.goto(`/parent/children/${childId}/shelf`);

  await expect(
    page.getByRole("heading", { name: "Starfish’s shelf" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { level: 2 })).toHaveText([
    "Reading Now",
    "Want to Read",
    "Maybe Later",
    "Finished",
  ]);
  await expect(
    page.getByRole("complementary", { name: "Selected book" }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: /Lantern Hill E2E/ }).click();

  const panel = page.getByRole("complementary", { name: "Selected book" });
  await expect(panel).toBeFocused();
  await expect(panel.getByText("Loved it")).toBeVisible();
  await expect(panel.getByRole("link", { name: "Edit note" })).toHaveAttribute(
    "href",
    `/parent/children/${childId}/shelf/${moon}/finish`,
  );
  await expect(
    panel.getByRole("link", { name: "Remove from shelf" }),
  ).toHaveAttribute("href", `/parent/children/${childId}/shelf/${moon}/remove`);
  await expect(panel.getByRole("link", { name: "Report" })).toHaveAttribute(
    "href",
    `/parent/children/${childId}/shelf/${moon}/report`,
  );

  await panel.getByRole("button", { name: "Close" }).click();
  await expect(
    page.getByRole("complementary", { name: "Selected book" }),
  ).toHaveCount(0);
  // Closing returns focus to the book that was open.
  await expect(
    page.getByRole("button", { name: /Lantern Hill E2E/ }),
  ).toBeFocused();
});

test("choosing a book makes no request and changes no address", async ({
  page,
  context,
}) => {
  const { familyId } = await signInParent(context, {
    parentRole: "main",
    consentConfirmed: true,
  });
  const childId = await insertChild(familyId);
  const bookId = await insertBook("No Request E2E");
  await shelve(childId, bookId, "readingNow");
  await page.goto(`/parent/children/${childId}/shelf`);
  await expect(
    page.getByRole("button", { name: /No Request E2E/ }),
  ).toBeVisible();
  const urlBefore = page.url();
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));

  await page.getByRole("button", { name: /No Request E2E/ }).click();
  await expect(
    page.getByRole("complementary", { name: "Selected book" }),
  ).toBeVisible();

  expect(requests).toEqual([]);
  expect(page.url()).toBe(urlBefore);
});

test("5a: a confirmed book in Reading Now keeps its icon and Edit note, and an unconfirmed Finished book offers Confirm finished", async ({
  page,
  context,
}) => {
  const { familyId } = await signInParent(context, {
    parentRole: "main",
    consentConfirmed: true,
  });
  const childId = await insertChild(familyId);
  const reread = await insertBook("Re-read E2E");
  const waiting = await insertBook("Waiting E2E");
  await shelve(childId, reread, "readingNow", {
    confirmed: true,
    rating: "likedIt",
  });
  await shelve(childId, waiting, "finished");
  await page.goto(`/parent/children/${childId}/shelf`);

  const rereadButton = page.getByRole("button", { name: /Re-read E2E/ });
  await expect(
    rereadButton.getByRole("img", { name: "Finish confirmed" }),
  ).toBeVisible();
  await rereadButton.click();
  const panel = page.getByRole("complementary", { name: "Selected book" });
  await expect(panel.getByText("Liked it")).toBeVisible();
  await expect(panel.getByRole("link", { name: "Edit note" })).toBeVisible();
  await expect(
    panel.getByRole("link", { name: "Confirm finished" }),
  ).toHaveCount(0);

  const waitingButton = page.getByRole("button", { name: /Waiting E2E/ });
  await expect(
    waitingButton.getByRole("img", { name: "Finish confirmed" }),
  ).toHaveCount(0);
  await waitingButton.click();
  await expect(
    panel.getByRole("link", { name: "Confirm finished" }),
  ).toHaveAttribute(
    "href",
    `/parent/children/${childId}/shelf/${waiting}/finish`,
  );
  await expect(panel.getByRole("link", { name: "Edit note" })).toHaveCount(0);
  await expect(panel.getByText("Rating:")).toHaveCount(0);
});

test("2a and 5b: a child with no books shows the empty message, and a blocked book is not shown", async ({
  page,
  context,
}) => {
  const { familyId } = await signInParent(context, {
    parentRole: "main",
    consentConfirmed: true,
  });
  const childId = await insertChild(familyId);
  await page.goto(`/parent/children/${childId}/shelf`);
  await expect(
    page.getByText("Starfish has no books on the shelf yet."),
  ).toBeVisible();

  const blocked = await insertBook("Blocked E2E", "blocked");
  await shelve(childId, blocked, "readingNow");
  await page.reload();
  await expect(page.getByText("Blocked E2E")).toHaveCount(0);
});

test("a Sub Parent of the family sees the same shelf", async ({
  page,
  context,
}) => {
  const { familyId } = await signInParent(context, {
    parentRole: "sub",
    consentConfirmed: true,
  });
  const childId = await insertChild(familyId);
  const bookId = await insertBook("Sub Parent E2E");
  await shelve(childId, bookId, "maybeLater");
  await page.goto(`/parent/children/${childId}/shelf`);

  await expect(
    page.getByRole("button", { name: /Sub Parent E2E/ }),
  ).toBeVisible();
});

test("2c: another family's child, an unknown ID and a malformed ID all give the same 404, and no session goes to sign-in", async ({
  page,
  context,
}) => {
  const { familyId } = await signInParent(context, {
    parentRole: "main",
    consentConfirmed: true,
  });
  const mine = await insertChild(familyId);
  const theirs = await insertChild(new ObjectId(), "Comet");
  const bookId = await insertBook("Theirs E2E");
  await shelve(theirs, bookId, "readingNow");

  const bodies: string[] = [];
  for (const id of [theirs, "does-not-exist", "..%2F..%2Fx"]) {
    const response = await page.goto(`/parent/children/${id}/shelf`);
    expect(response?.status(), id).toBe(404);
    await expect(page.getByText("Theirs E2E")).toHaveCount(0);
    bodies.push(await page.locator("body").innerText());
  }
  expect(new Set(bodies).size).toBe(1);
  await page.goto(`/parent/children/${mine}/shelf`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // Signed out: the same address goes to sign-in.
  await context.clearCookies();
  await page.goto(`/parent/children/${mine}/shelf`);
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("1a: a parent with one child goes straight to that child's shelf", async ({
  page,
  context,
}) => {
  const { familyId } = await signInParent(context, {
    parentRole: "main",
    consentConfirmed: true,
  });
  const childId = await insertChild(familyId);

  await page.goto("/parent/shelf");

  await expect(page).toHaveURL(
    new RegExp(`/parent/children/${childId}/shelf$`),
  );
  await expect(
    page.getByRole("heading", { name: "Starfish’s shelf" }),
  ).toBeVisible();
});

test("1a: a parent with several children chooses by nickname and lands on that child's shelf", async ({
  page,
  context,
}) => {
  const { familyId } = await signInParent(context, {
    parentRole: "main",
    consentConfirmed: true,
  });
  await insertChild(familyId, "Comet");
  const nova = await insertChild(familyId, "Nova");

  await page.goto("/parent/shelf");
  await expect(
    page.getByRole("heading", { name: "Whose shelf?" }),
  ).toBeVisible();
  await expect(page.getByRole("link")).toHaveText(["Comet", "Nova"]);
  await page.getByRole("link", { name: "Nova" }).click();

  await expect(page).toHaveURL(new RegExp(`/parent/children/${nova}/shelf$`));
  await expect(
    page.getByRole("heading", { name: "Nova’s shelf" }),
  ).toBeVisible();
});

test("1b: with no child, a Main Parent is taken to add one and a Sub Parent is asked to have the Main Parent do it", async ({
  page,
  context,
}) => {
  await signInParent(context, { parentRole: "main", consentConfirmed: true });
  await page.goto("/parent/shelf");
  await expect(page).toHaveURL(/\/parent\/children\/new$/);

  await context.clearCookies();
  await signInParent(context, { parentRole: "sub", consentConfirmed: true });
  await page.goto("/parent/shelf");
  await expect(
    page.getByText("Ask the family’s Main Parent to add a child first."),
  ).toBeVisible();
});

test("signed out, the picker goes to sign-in", async ({ page }) => {
  await page.goto("/parent/shelf");

  await expect(page).toHaveURL(/\/sign-in$/);
});

for (const role of ["child", "admin"] as const) {
  test(`authorization: a ${role} session is refused on the shelf and the picker`, async ({
    page,
    context,
  }) => {
    const { familyId } = await signInParent(context, {
      parentRole: "main",
      consentConfirmed: true,
    });
    const childId = await insertChild(familyId);
    const bookId = await insertBook(`Refused ${role} E2E`);
    await shelve(childId, bookId, "readingNow");
    await context.clearCookies();
    await signInAs(context, role);

    const shelf = await page.goto(`/parent/children/${childId}/shelf`);
    expect(shelf?.status()).toBe(404);
    await expect(page.getByText(`Refused ${role} E2E`)).toHaveCount(0);
    const picker = await page.goto("/parent/shelf");
    expect(picker?.status()).toBe(404);
  });
}
