import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { hashPassword } from "../../src/server/identity-access/passwords";
import { closeE2eDb, e2eDb, signInParent } from "./session-fixture";

test.afterAll(closeE2eDb);

test("a parent confirms their password to review and download the selected child's data", async ({
  page,
  context,
}) => {
  const { familyId } = await signInParent(context, {
    parentRole: "main",
    consentConfirmed: true,
  });
  const db = await e2eDb();
  const password = "invented browser test password";
  const childId = randomUUID();
  const siblingId = randomUUID();
  await db
    .collection("users")
    .updateOne(
      { role: "parent", familyId },
      { $set: { passwordHash: await hashPassword(password) } },
    );
  await db
    .collection<{
      _id: string;
      familyId: typeof familyId;
      nickname: string;
      avatar: string;
      createdAt: Date;
    }>("children")
    .insertMany([
      {
        _id: childId,
        familyId,
        nickname: "Puffin",
        avatar: "1-1",
        createdAt: new Date(),
      },
      {
        _id: siblingId,
        familyId,
        nickname: "Finch",
        avatar: "1-1",
        createdAt: new Date(),
      },
    ]);
  await db
    .collection("childIdentities")
    .insertOne({ childId, age: 9, grade: "4", createdAt: new Date() });
  await db.collection("parentNotes").insertMany([
    {
      childId,
      text: "<b>Likes stories about the ocean</b>",
      flag: "none",
      savedAt: new Date(),
    },
    {
      childId: siblingId,
      text: "Private sibling note",
      flag: "none",
      savedAt: new Date(),
    },
  ]);
  await page.goto("/parent/settings/child-data");
  await page.getByLabel("Child", { exact: true }).selectOption(childId);
  await expect(page.getByText(/Likes stories/)).toHaveCount(0);
  await page.getByLabel("Your password").fill("wrong");
  await page.getByRole("button", { name: "Review data" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "That password is incorrect." }),
  ).toBeVisible();

  await page.getByLabel("Your password").fill(password);
  await page.getByRole("button", { name: "Review data" }).click();
  await expect(
    page.getByText("<b>Likes stories about the ocean</b>", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Confirm your password").fill(password);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download child data" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("bookbuddies-child-data.json");
  const json = await readFile(await file.path(), "utf8");
  expect(JSON.parse(json)).toMatchObject({ childId, schemaVersion: 1 });
  expect(json).toContain("Likes stories about the ocean");
  expect(json).not.toContain("Private sibling note");
  await expect(
    page.getByRole("heading", { name: "Stored information" }),
  ).toBeVisible();
  await page.getByLabel("Child", { exact: true }).selectOption(siblingId);
  await expect(
    page.getByRole("heading", { name: "Stored information" }),
  ).toHaveCount(0);
});
