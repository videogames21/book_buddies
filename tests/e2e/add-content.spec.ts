import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import {
  closeE2eDb,
  e2eDb,
  signInParent,
  signInWithRole,
} from "./session-fixture";

// UC-ADM-add-content, end to end. Invented test data only.

test.afterAll(async () => {
  await closeE2eDb();
});

async function insertSecretBook() {
  const db = await e2eDb();
  await db.collection("books").insertOne({
    _id: randomUUID() as never,
    title: "Hidden E2E Title",
    author: "A. Writer",
    matchKey: `hidden e2e title${randomUUID()}`,
    year: 2001,
    genres: ["fantasy"],
    moods: ["calm"],
    format: "picture book",
    length: "quick read",
    ageMin: 6,
    ageMax: 8,
    readingChallenge: "reading independently",
    status: "draft",
    createdAt: new Date(),
  });
}

async function bookCount(title: string) {
  const db = await e2eDb();
  return db.collection("books").countDocuments({ title });
}

test("main: the admin adds a book and sees it in the list as draft", async ({
  page,
  context,
}) => {
  await signInWithRole(context, "admin");
  await page.goto("/admin/catalog");

  await page.getByRole("link", { name: "Add Book" }).click();
  await page.getByLabel("Title").fill("Starlight E2E Book");
  await page.getByLabel("Author").fill("A. Writer");
  await page.getByLabel("Year published").fill("2001");
  await page.getByLabel("This book has no ISBN").check();
  await page.getByLabel("fantasy").check();
  await page.getByLabel("calm").check();
  await page.getByLabel("Format").selectOption("picture book");
  await page.getByLabel("Length").selectOption("quick read");
  await page.getByLabel("Suggested age min").fill("6");
  await page.getByLabel("Suggested age max").fill("8");
  await page
    .getByLabel("Reading challenge")
    .selectOption("reading independently");
  await page.getByRole("button", { name: "Save book" }).click();

  await expect(page).toHaveURL(/\/admin\/catalog$/);
  const row = page.getByRole("row", { name: /Starlight E2E Book/ });
  await expect(row).toContainText("A. Writer");
  await expect(row).toContainText("draft");
  expect(await bookCount("Starlight E2E Book")).toBe(1);
});

test("4a: a missing title shows an inline error and keeps the entries", async ({
  page,
  context,
}) => {
  await signInWithRole(context, "admin");
  await page.goto("/admin/catalog/new");
  await page.getByLabel("Author").fill("A. Writer");

  await page.getByRole("button", { name: "Save book" }).click();

  await expect(page.getByText("Enter the book's title.")).toBeVisible();
  await expect(page.getByLabel("Author")).toHaveValue("A. Writer");
});

test("3a: leaving the form without saving writes nothing", async ({
  page,
  context,
}) => {
  await signInWithRole(context, "admin");
  await page.goto("/admin/catalog/new");
  await page.getByLabel("Title").fill("Never Saved E2E");

  await page.getByRole("link", { name: "Cancel" }).click();

  await expect(page).toHaveURL(/\/admin\/catalog$/);
  expect(await bookCount("Never Saved E2E")).toBe(0);
});

test("1a: a parent, a child and a signed-out visitor cannot use either page", async ({
  page,
  context,
}) => {
  await insertSecretBook();
  for (const path of ["/admin/catalog", "/admin/catalog/new"]) {
    await context.clearCookies();
    await signInParent(context, { parentRole: "main", consentConfirmed: true });
    const asParent = await page.goto(path);
    expect(asParent?.status()).toBe(403);
    await expect(page.getByText("Not authorized")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save book" })).toHaveCount(
      0,
    );
    expect(await page.content()).not.toContain("Hidden E2E Title");

    await context.clearCookies();
    await signInWithRole(context, "child");
    expect((await page.goto(path))?.status()).toBe(403);

    await context.clearCookies();
    await page.goto(path);
    await expect(page).toHaveURL(/\/sign-in/);
  }
});
