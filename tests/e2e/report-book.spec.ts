import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { ObjectId } from "mongodb";
import { closeE2eDb, e2eDb, signInParent } from "./session-fixture";

// UC-PAR-report-book, end to end: the main flow from the shelf, 5a, 3b and the refusals
// a parent can meet in the browser. Invented test data only. Nothing in the app writes
// shelf entries yet, so the tests put them in directly.

// The browser tests share one database, and the reading-profile spec lists every active
// book, so this spec removes its books and every record about them when it finishes.
const createdBookIds: string[] = [];

test.afterAll(async () => {
  const db = await e2eDb();
  const bookId = { $in: createdBookIds };
  await db.collection<{ _id: string }>("books").deleteMany({ _id: bookId });
  for (const name of [
    "shelfEntries",
    "bookReports",
    "childBookExclusions",
    "childNotices",
  ]) {
    await db.collection(name).deleteMany({ bookId });
  }
  await closeE2eDb();
});

async function insertChild(familyId: ObjectId) {
  const _id = randomUUID();
  await (
    await e2eDb()
  )
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
      nickname: "Starfish",
      avatar: "1-1",
      createdAt: new Date(),
    });
  return _id;
}

async function insertBookOnShelf(childId: string, title: string) {
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
  await db.collection("shelfEntries").insertOne({
    childId,
    bookId: _id,
    category: "readingNow",
    movedAt: new Date(),
  });
  return _id;
}

async function consentedFamilyWithBook(
  context: Parameters<typeof signInParent>[0],
  title: string,
) {
  const { familyId } = await signInParent(context, {
    parentRole: "main",
    consentConfirmed: true,
  });
  const childId = await insertChild(familyId);
  const bookId = await insertBookOnShelf(childId, title);
  return { familyId, childId, bookId };
}

const reportsFor = async (bookId: string) =>
  (await e2eDb()).collection("bookReports").countDocuments({ bookId });

async function fillForm(page: Page) {
  await page.getByRole("radio", { name: "Inappropriate content" }).check();
  await page.getByRole("textbox", { name: /Comment/ }).fill("Too scary");
}

test("main: from the shelf, report a book through the warning; it leaves the shelf (and 5a keeps the input)", async ({
  page,
  context,
}) => {
  const { childId, bookId } = await consentedFamilyWithBook(
    context,
    "Shadow Lake Report E2E",
  );
  await page.goto(`/parent/children/${childId}/shelf`);
  await page.getByRole("button", { name: /Shadow Lake Report E2E/ }).click();
  await page
    .getByRole("complementary", { name: "Selected book" })
    .getByRole("link", { name: "Report" })
    .click();

  // Step 2: the title and the child's nickname.
  await expect(
    page.getByRole("heading", { name: "Report a book" }),
  ).toBeVisible();
  await expect(page.getByText("Shadow Lake Report E2E")).toBeVisible();
  await expect(page.getByText("Starfish")).toBeVisible();

  // 3a: no reason, no confirmation.
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Please choose a reason." }),
  ).toBeVisible();

  await fillForm(page);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(
    page.getByText("Sending a false report may be punished."),
  ).toBeVisible();

  // 5a: Go back returns to the form, with the input kept, and sends nothing.
  const posts: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") posts.push(request.url());
  });
  await page.getByRole("button", { name: "Go back" }).click();
  await expect(
    page.getByRole("radio", { name: "Inappropriate content" }),
  ).toBeChecked();
  await expect(page.getByRole("textbox", { name: /Comment/ })).toHaveValue(
    "Too scary",
  );
  expect(posts).toEqual([]);

  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Confirm" }).click();

  // Step 8.
  await expect(
    page.getByRole("heading", { name: "Report sent" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Shadow Lake Report E2E will no longer appear for Starfish.",
    ),
  ).toBeVisible();
  expect(await reportsFor(bookId)).toBe(1);

  await page.getByRole("link", { name: "Back to Starfish’s shelf" }).click();
  await expect(
    page.getByRole("heading", { name: "Starfish’s shelf" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Shadow Lake Report E2E/ }),
  ).toHaveCount(0);
});

test("3b: Cancel returns to the shelf and writes nothing", async ({
  page,
  context,
}) => {
  const { childId, bookId } = await consentedFamilyWithBook(
    context,
    "Cancel Report E2E",
  );
  await page.goto(`/parent/children/${childId}/shelf/${bookId}/report`);
  await fillForm(page);

  await page.getByRole("link", { name: "Cancel" }).click();

  await expect(page).toHaveURL(`/parent/children/${childId}/shelf`);
  await expect(
    page.getByRole("button", { name: /Cancel Report E2E/ }),
  ).toBeVisible();
  expect(await reportsFor(bookId)).toBe(0);
});

test("7c: a book already reported shows that, with no form", async ({
  page,
  context,
}) => {
  const { childId, bookId } = await consentedFamilyWithBook(
    context,
    "Already Reported E2E",
  );
  await page.goto(`/parent/children/${childId}/shelf/${bookId}/report`);
  await fillForm(page);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(
    page.getByRole("heading", { name: "Report sent" }),
  ).toBeVisible();

  // Opened again, as from a stale shelf page: the report removed the shelf entry.
  await page.goto(`/parent/children/${childId}/shelf/${bookId}/report`);

  await expect(
    page.getByRole("heading", { name: "Already reported" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue" })).toHaveCount(0);
  expect(await reportsFor(bookId)).toBe(1);
});

test("7c: a report the other parent sent while this page was open gets 'already reported'", async ({
  page,
  context,
}) => {
  const { childId, bookId } = await consentedFamilyWithBook(
    context,
    "Second Parent E2E",
  );
  await page.goto(`/parent/children/${childId}/shelf/${bookId}/report`);
  await fillForm(page);
  await page.getByRole("button", { name: "Continue" }).click();
  // The other parent's report commits first (its records, as the action writes them).
  const db = await e2eDb();
  const reportId = new ObjectId();
  await db.collection("childBookExclusions").insertOne({
    childId,
    bookId,
    reportId,
    createdAt: new Date(),
  });

  await page.getByRole("button", { name: "Confirm" }).click();

  await expect(
    page.getByRole("heading", { name: "Already reported" }),
  ).toBeVisible();
  await expect(
    page.getByText("This book has already been reported for this child."),
  ).toBeVisible();
  expect(await reportsFor(bookId)).toBe(0);
});

test("PRE-3: a book not on the child's shelf gets the 404", async ({
  page,
  context,
}) => {
  const { childId, bookId } = await consentedFamilyWithBook(
    context,
    "Not Shelved E2E",
  );
  await (await e2eDb()).collection("shelfEntries").deleteMany({ bookId });

  const response = await page.goto(
    `/parent/children/${childId}/shelf/${bookId}/report`,
  );

  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "Report a book" }),
  ).toHaveCount(0);
});

test("PRE-3: a book the child took off the shelf after the page opened is refused, and nothing is saved", async ({
  page,
  context,
}) => {
  const { childId, bookId } = await consentedFamilyWithBook(
    context,
    "Taken Off E2E",
  );
  await page.goto(`/parent/children/${childId}/shelf/${bookId}/report`);
  await fillForm(page);
  await page.getByRole("button", { name: "Continue" }).click();
  await (await e2eDb()).collection("shelfEntries").deleteMany({ bookId });

  await page.getByRole("button", { name: "Confirm" }).click();

  await expect(
    page.getByRole("heading", { name: "The report was not sent" }),
  ).toBeVisible();
  await expect(page.getByText(/no longer on your child's shelf/)).toBeVisible();
  expect(await reportsFor(bookId)).toBe(0);
});

test("consent not confirmed: a revoked family's report is refused, and the book stays on the shelf", async ({
  page,
  context,
}) => {
  const { familyId, childId, bookId } = await consentedFamilyWithBook(
    context,
    "Revoked Consent E2E",
  );
  await (
    await e2eDb()
  )
    .collection("consentRecords")
    .updateOne({ familyId }, { $set: { revokedAt: new Date() } });
  await page.goto(`/parent/children/${childId}/shelf/${bookId}/report`);
  await fillForm(page);
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByRole("button", { name: "Confirm" }).click();

  await expect(
    page.getByRole("heading", { name: "The report was not sent" }),
  ).toBeVisible();
  await expect(
    page.getByText(/consent must be confirmed before you can report a book/),
  ).toBeVisible();
  expect(await reportsFor(bookId)).toBe(0);
  expect(
    await (
      await e2eDb()
    )
      .collection("shelfEntries")
      .countDocuments({ childId, bookId }),
  ).toBe(1);
});
