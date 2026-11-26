import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { ObjectId } from "mongodb";
import { hashPassword } from "../../src/server/identity-access/passwords";
import { closeE2eDb, e2eDb, signInParent } from "./session-fixture";

// UC-PAR-delete-kid-account, end to end. No page links to the delete page yet, so the
// test opens it by its address (design/par.md, Open questions). Invented data only.
test.afterAll(closeE2eDb);

const PASSWORD = "invented-e2e-password";

async function setUp(context: Parameters<typeof signInParent>[0]) {
  const { familyId } = await signInParent(context, {
    parentRole: "main",
    consentConfirmed: true,
  });
  const db = await e2eDb();
  await db
    .collection("users")
    .updateOne(
      { familyId, parentRole: "main" },
      { $set: { passwordHash: await hashPassword(PASSWORD) } },
    );
  const childId = randomUUID();
  await db
    .collection<{
      _id: string;
      familyId: ObjectId;
      nickname: string;
      avatar: string;
      createdAt: Date;
    }>("children")
    .insertOne({
      _id: childId,
      familyId,
      nickname: "Starfish",
      avatar: "2",
      createdAt: new Date(),
    });
  return { childId, path: `/parent/children/${childId}/delete` };
}

const childCount = async (childId: string) =>
  (await e2eDb())
    .collection<{ _id: string }>("children")
    .countDocuments({ _id: childId });

test("main (steps 1–7): the parent reads the warning, confirms with password and nickname, and sees the confirmation", async ({
  page,
  context,
}) => {
  const { childId, path } = await setUp(context);
  await page.goto(path);

  await expect(page.getByText("Starfish").first()).toBeVisible();
  await expect(page.getByText(/cannot be undone/)).toBeVisible();
  await expect(page.getByText(/no longer be able to sign in/)).toBeVisible();
  await page.getByLabel("Your password").fill(PASSWORD);
  await page.getByLabel("Type Starfish to confirm").fill("Starfish");
  await page.getByRole("button", { name: /Delete this child/ }).click();

  await expect(
    page.getByRole("heading", { name: "The account was deleted" }),
  ).toBeVisible();
  expect(await childCount(childId)).toBe(0);
  await page.getByRole("link", { name: "Back to home" }).click();
  // 7a: the last child is gone, so the onboarding gate asks for a first child.
  await expect(page).toHaveURL(/\/parent\/children\/new$/);
});

test("4a: a wrong nickname shows the error, stays on the form and deletes nothing", async ({
  page,
  context,
}) => {
  const { childId, path } = await setUp(context);
  await page.goto(path);

  await page.getByLabel("Your password").fill(PASSWORD);
  await page.getByLabel("Type Starfish to confirm").fill("starfish");
  await page.getByRole("button", { name: /Delete this child/ }).click();

  // By text: Next.js's route announcer also has role "alert".
  await expect(page.getByText(/That nickname doesn't match/)).toBeVisible();
  await expect(page.getByLabel("Your password")).toBeVisible();
  expect(await childCount(childId)).toBe(1);
});

test("2a: leaving the page without confirming deletes nothing", async ({
  page,
  context,
}) => {
  const { childId, path } = await setUp(context);
  await page.goto(path);
  await page.getByLabel("Your password").fill(PASSWORD);

  await page.getByRole("link", { name: "Cancel" }).click();

  await expect(page).not.toHaveURL(/\/delete$/);
  expect(await childCount(childId)).toBe(1);
});

test("a failed call shows a retryable error and re-enables the button", async ({
  page,
  context,
}) => {
  const { childId, path } = await setUp(context);
  await page.goto(path);
  // The server action is a POST to the page; make that request fail as network loss.
  await page.route(`**${path}`, (route) =>
    route.request().method() === "POST" ? route.abort() : route.continue(),
  );
  await page.getByLabel("Your password").fill(PASSWORD);
  await page.getByLabel("Type Starfish to confirm").fill("Starfish");
  const button = page.getByRole("button", { name: /Delete this child/ });
  await button.click();

  await expect(page.getByText(/couldn't reach BookBuddies/)).toBeVisible();
  await expect(button).toBeEnabled();
  expect(await childCount(childId)).toBe(1);
});

test("1a: a Sub Parent sees the explanation and no form", async ({
  page,
  context,
}) => {
  const { familyId } = await signInParent(context, {
    parentRole: "sub",
    consentConfirmed: true,
  });
  const childId = randomUUID();
  const db = await e2eDb();
  await db
    .collection<{
      _id: string;
      familyId: ObjectId;
      nickname: string;
      avatar: string;
      createdAt: Date;
    }>("children")
    .insertOne({
      _id: childId,
      familyId,
      nickname: "Starfish",
      avatar: "2",
      createdAt: new Date(),
    });

  await page.goto(`/parent/children/${childId}/delete`);

  await expect(page.getByText(/Only the Main Parent/)).toBeVisible();
  await expect(page.getByLabel("Your password")).toHaveCount(0);
  expect(await childCount(childId)).toBe(1);
});
