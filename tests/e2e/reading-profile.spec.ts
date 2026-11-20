import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import type { ObjectId } from "mongodb";
import { closeE2eDb, e2eDb, signInParent } from "./session-fixture";

// UC-REC-kid-onboarding, end to end. Invented test data only.

test.afterAll(async () => {
  await closeE2eDb();
});

async function insertChild(familyId: ObjectId) {
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
      nickname: "Starfish",
      avatar: "2",
      createdAt: new Date(),
    });
  return _id;
}

async function insertActiveBook(title: string) {
  const db = await e2eDb();
  const _id = randomUUID();
  await db
    .collection<{ _id: string; title: string; author: string; status: string }>(
      "books",
    )
    .insertOne({ _id, title, author: "A. Writer", status: "active" });
  return _id;
}

async function setUp(context: Parameters<typeof signInParent>[0]) {
  const { familyId } = await signInParent(context, {
    parentRole: "main",
    consentConfirmed: true,
  });
  const childId = await insertChild(familyId);
  return {
    familyId,
    childId,
    path: `/parent/children/${childId}/reading-profile`,
  };
}

test("main: the parent picks, agrees, saves and lands on onboarding complete", async ({
  page,
  context,
}) => {
  const { childId, path } = await setUp(context);
  const bookId = await insertActiveBook("Moon Garden E2E");
  await page.goto(path);

  await expect(page.getByText("Starfish")).toBeVisible();
  await page.getByLabel("Fantasy and magic").check();
  await page.getByLabel(/Moon Garden E2E/).check();
  await page.getByLabel(/I have read this notice/).check();
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page).toHaveURL(
    new RegExp(`/parent/children/${childId}/onboarding-complete$`),
  );
  const db = await e2eDb();
  const profile = await db.collection("readingProfiles").findOne({ childId });
  expect(profile).toMatchObject({
    interests: ["fantasy"],
    favoriteBookIds: [bookId],
    onboardingComplete: true,
  });
});

test("abandoned: leaving the form without saving writes nothing", async ({
  page,
  context,
}) => {
  const { childId, path } = await setUp(context);
  await page.goto(path);
  await page.getByLabel("Adventure").check();

  await page.goto("/privacy-notice");

  const db = await e2eDb();
  expect(
    await db.collection("readingProfiles").countDocuments({ childId }),
  ).toBe(0);
  expect(
    await db
      .collection<{ _id: string }>("children")
      .countDocuments({ _id: childId }),
  ).toBe(1);
});

test("notice: Save stays disabled until the parent ticks the box, and the notice link opens the notice in a new tab", async ({
  page,
  context,
}) => {
  const { path } = await setUp(context);
  await page.goto(path);
  const agree = page.getByLabel(/I have read this notice/);
  const save = page.getByRole("button", { name: "Save" });

  await expect(agree).not.toBeChecked();
  await expect(save).toBeDisabled();
  await agree.check();
  await expect(save).toBeEnabled();

  const link = page.getByRole("link", { name: "privacy notice" });
  await expect(link).toHaveAttribute("target", "_blank");
  const popup = context.waitForEvent("page");
  await link.click();
  const notice = await popup;
  await expect(notice).toHaveURL(/\/privacy-notice$/);
  await expect(notice.getByText("Close this tab to go back")).toBeVisible();
  await notice.close();
  await expect(page.getByLabel(/I have read this notice/)).toBeChecked();
});

test("5a: after a failed save every selection is still in the form", async ({
  page,
  context,
}) => {
  const { childId, path } = await setUp(context);
  await insertActiveBook("Sea Glass E2E");
  await page.goto(path);
  await page.getByLabel("Mystery").check();
  await page.getByLabel(/Sea Glass E2E/).check();
  await page.getByLabel(/I have read this notice/).check();
  await page.route("**/*", (route) =>
    route.request().method() === "POST" ? route.abort() : route.continue(),
  );

  await page.getByRole("button", { name: "Save" }).click();

  await expect(
    page.getByRole("alert").filter({ hasText: "couldn" }),
  ).toBeVisible();
  await expect(page.getByLabel("Mystery")).toBeChecked();
  await expect(page.getByLabel(/Sea Glass E2E/)).toBeChecked();
  const db = await e2eDb();
  expect(
    await db.collection("readingProfiles").countDocuments({ childId }),
  ).toBe(0);
});

test("1a: a completed child shows the parent an error and no form", async ({
  page,
  context,
}) => {
  const { childId, path } = await setUp(context);
  const db = await e2eDb();
  await db.collection("readingProfiles").insertOne({
    childId,
    interests: [],
    favoriteBookIds: [],
    onboardingComplete: true,
    savedAt: new Date(),
  });

  await page.goto(path);

  await expect(
    page.getByRole("alert").filter({ hasText: "already complete" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Save" })).toHaveCount(0);
  // The child's own account is untouched.
  expect(
    await db
      .collection<{ _id: string }>("children")
      .countDocuments({ _id: childId }),
  ).toBe(1);
});

test("PRE-2: another family's child is not found", async ({
  page,
  context,
}) => {
  await signInParent(context, { parentRole: "main", consentConfirmed: true });
  const other = await signInParent(context, {
    parentRole: "main",
    consentConfirmed: true,
  });
  const childId = await insertChild(other.familyId);
  // The second sign-in replaced the cookie with the other family's parent, so sign in
  // as a fresh family and open that child.
  await context.clearCookies();
  await signInParent(context, { parentRole: "main", consentConfirmed: true });

  const response = await page.goto(
    `/parent/children/${childId}/reading-profile`,
  );

  expect(response?.status()).toBe(404);
});
