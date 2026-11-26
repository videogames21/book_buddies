import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import type { ObjectId } from "mongodb";
import { closeE2eDb, e2eDb, signInParent } from "./session-fixture";

// UC-PAR-suggest-book, end to end (design/par.md, Tests): main (steps 1-4), 3a and the
// 4a warning. Invented test data only. The server runs with the release gate on.

// The browser tests share one database, and other specs list every active book, so this
// spec removes its books and their suggestions and shelf entries when it finishes.
const createdBookIds: string[] = [];

test.afterAll(async () => {
  const db = await e2eDb();
  const bookId = { $in: createdBookIds };
  await db.collection<{ _id: string }>("books").deleteMany({ _id: bookId });
  await db.collection("parentSuggestions").deleteMany({ bookId });
  await db.collection("shelfEntries").deleteMany({ bookId });
  await closeE2eDb();
});

/** A child with its Child Identity Store record, as createChildAccount leaves it. */
async function insertChild(familyId: ObjectId, nickname: string) {
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
  await db
    .collection("childIdentities")
    .insertOne({ childId: _id, age: 7, grade: "2", createdAt: new Date() });
  return _id;
}

async function insertBook(title: string, _id: string = randomUUID()) {
  const db = await e2eDb();
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

async function suggestionsFor(childId: string) {
  const db = await e2eDb();
  return db
    .collection("parentSuggestions")
    .find({ childId }, { projection: { _id: 0, bookId: 1, note: 1 } })
    .toArray();
}

test("main: the parent finds a book, suggests it with a note and sees the confirmation", async ({
  page,
  context,
}) => {
  const { familyId } = await signInParent(context, {
    parentRole: "main",
    consentConfirmed: true,
  });
  const childId = await insertChild(familyId, "Otterpop");
  const bookId = await insertBook("Juniper Lane Suggest E2E");

  await page.goto("/parent/books");
  await page
    .getByRole("link", { name: "Suggest Juniper Lane Suggest E2E" })
    .click();
  // One child: straight to the confirmation (1a).
  await expect(page).toHaveURL(`/parent/children/${childId}/suggest/${bookId}`);
  await expect(page.getByText("To Otterpop")).toBeVisible();

  await page
    .getByLabel("A note for Otterpop (optional)")
    .fill("You liked the last fox story");
  await page.getByRole("button", { name: "Suggest", exact: true }).click();

  await expect(page.getByRole("status")).toHaveText("Suggested to Otterpop");
  expect(await suggestionsFor(childId)).toEqual([
    { bookId, note: "You liked the last fox story" },
  ]);
});

test("3a: cancelling from the confirmation page writes nothing", async ({
  page,
  context,
}) => {
  const { familyId } = await signInParent(context, {
    parentRole: "main",
    consentConfirmed: true,
  });
  const childId = await insertChild(familyId, "Puffin");
  const bookId = await insertBook("Cedar Cove Suggest E2E");

  await page.goto(`/parent/children/${childId}/suggest/${bookId}`);
  await page.getByLabel("A note for Puffin (optional)").fill("Maybe this one");
  await page.getByRole("link", { name: "Cancel" }).click();

  await expect(page).toHaveURL("/parent/books");
  expect(await suggestionsFor(childId)).toEqual([]);
});

test("4a: the warning shows before the parent confirms, and the button reads Suggest anyway", async ({
  page,
  context,
}) => {
  const { familyId } = await signInParent(context, {
    parentRole: "main",
    consentConfirmed: true,
  });
  const childId = await insertChild(familyId, "Wren");
  const bookId = await insertBook("Harbor Light Suggest E2E");
  const db = await e2eDb();
  await db.collection("shelfEntries").insertOne({
    childId,
    bookId,
    category: "wantToRead",
    movedAt: new Date(),
  });

  await page.goto(`/parent/children/${childId}/suggest/${bookId}`);
  // The warning, not Next.js's route announcer, which is an alert too.
  await expect(
    page.getByRole("alert").filter({ hasText: "already on Wren’s shelf" }),
  ).toHaveText("This book is already on Wren’s shelf.");
  await page.getByRole("button", { name: "Suggest anyway" }).click();

  await expect(page.getByRole("status")).toHaveText("Suggested to Wren");
  expect(await suggestionsFor(childId)).toEqual([{ bookId }]);
});

test("a book ID with URL characters reaches its confirmation page and is suggested (review of #147)", async ({
  page,
  context,
}) => {
  const { familyId } = await signInParent(context, {
    parentRole: "main",
    consentConfirmed: true,
  });
  const childId = await insertChild(familyId, "Heron");
  // Catalog IDs are strings; this one would break an unencoded path.
  const bookId = await insertBook(
    "Odd Path Suggest E2E",
    `e2e/odd?#id ${randomUUID()}`,
  );

  await page.goto("/parent/books");
  await page
    .getByRole("link", { name: "Suggest Odd Path Suggest E2E" })
    .click();
  await expect(page.getByText("To Heron")).toBeVisible();
  await page.getByRole("button", { name: "Suggest", exact: true }).click();

  await expect(page.getByRole("status")).toHaveText("Suggested to Heron");
  expect(await suggestionsFor(childId)).toEqual([{ bookId }]);
});

test.describe("without JavaScript (before hydration; review of #147)", () => {
  test.use({ javaScriptEnabled: false });

  test("the form posts: the suggestion is saved and the note never reaches the URL", async ({
    page,
    context,
  }) => {
    const { familyId } = await signInParent(context, {
      parentRole: "main",
      consentConfirmed: true,
    });
    const childId = await insertChild(familyId, "Kestrel");
    const bookId = await insertBook("No Script Suggest E2E");
    const urls: string[] = [];
    page.on("request", (request) => urls.push(request.url()));

    await page.goto(`/parent/children/${childId}/suggest/${bookId}`);
    await page
      .getByLabel("A note for Kestrel (optional)")
      .fill("private note before hydration");
    await page.getByRole("button", { name: "Suggest", exact: true }).click();

    await expect(page.getByRole("status")).toHaveText("Suggested to Kestrel");
    expect(await suggestionsFor(childId)).toEqual([
      { bookId, note: "private note before hydration" },
    ]);
    expect(page.url()).not.toContain("note=");
    expect(urls.filter((url) => url.includes("note="))).toEqual([]);
  });

  test("4a: Suggest anyway works without JavaScript too", async ({
    page,
    context,
  }) => {
    const { familyId } = await signInParent(context, {
      parentRole: "main",
      consentConfirmed: true,
    });
    const childId = await insertChild(familyId, "Plover");
    const bookId = await insertBook("No Script Anyway Suggest E2E");
    const db = await e2eDb();
    await db.collection("shelfEntries").insertOne({
      childId,
      bookId,
      category: "wantToRead",
      movedAt: new Date(),
    });

    await page.goto(`/parent/children/${childId}/suggest/${bookId}`);
    await page.getByRole("button", { name: "Suggest anyway" }).click();

    await expect(page.getByRole("status")).toHaveText("Suggested to Plover");
    expect(await suggestionsFor(childId)).toEqual([{ bookId }]);
  });
});
