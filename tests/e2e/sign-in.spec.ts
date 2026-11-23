import { createHash, randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import { ObjectId } from "mongodb";
import { hashPassword } from "../../src/server/identity-access/passwords";
import { closeE2eDb, e2eDb } from "./session-fixture";

// The real sign-in page, auth() and database. Invented account only.
test.afterAll(closeE2eDb);

const PASSWORD = "invented-e2e-password";

async function insertConfirmedMainParent(): Promise<string> {
  const db = await e2eDb();
  const userId = new ObjectId();
  const familyId = new ObjectId();
  const email = `parent-${userId.toHexString()}@example.test`;
  await db.collection("users").insertOne({
    _id: userId,
    role: "parent",
    parentRole: "main",
    familyId,
    name: "Invented Parent",
    email,
    passwordHash: await hashPassword(PASSWORD),
  });
  const acknowledgedAt = new Date();
  await db.collection("consentRecords").insertOne({
    familyId,
    parentUserId: userId,
    noticeVersion: "test",
    method: "email-plus",
    acknowledgedAt,
    confirmBy: new Date(acknowledgedAt.getTime() + 14 * 24 * 60 * 60 * 1000),
    confirmationTokenHash: createHash("sha256")
      .update(randomBytes(32))
      .digest("hex"),
    confirmedAt: acknowledgedAt,
  });
  return email;
}

test("a parent opens the app, signs in and reaches the first-child form", async ({
  page,
}) => {
  const email = await insertConfirmedMainParent();
  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in$/);

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("invented-wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(
    page.getByText("That email or password is incorrect."),
  ).toBeVisible();

  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/parent\/children\/new$/);
  await expect(
    page.getByRole("button", { name: "Create account" }),
  ).toBeVisible();
});
