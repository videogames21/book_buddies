import { expect, test } from "@playwright/test";
import type { ObjectId } from "mongodb";
import {
  closeE2eDb,
  e2eDb,
  signInChild,
  signInParent,
} from "./session-fixture";

test.afterAll(closeE2eDb);

test("opening the quiz directly first requires a child session", async ({
  page,
}) => {
  await page.goto("/child/recommendations/quiz");
  await expect(page).toHaveURL(/\/child\/sign-in$/);
});

test("the rules quiz remains gated for a signed-in child until its write guard exists", async ({
  page,
  context,
}) => {
  const { familyId } = await signInParent(context, {
    parentRole: "main",
    consentConfirmed: true,
  });
  const { childId } = await signInChild(context);
  const db = await e2eDb();
  await db
    .collection<{ _id: string; familyId: ObjectId }>("children")
    .updateOne({ _id: childId }, { $set: { familyId } });

  await page.goto("/child");
  await expect(
    page.getByRole("button", { name: "Get recommendations" }),
  ).toHaveCount(0);
  await page.goto("/child/recommendations/quiz");
  await expect(
    page.getByText("Recommendations aren’t available right now."),
  ).toBeVisible();
  await expect(page.getByRole("radio")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Privacy notice" }),
  ).toBeVisible();
  expect(
    await db.collection("recommendationBatches").countDocuments({ childId }),
  ).toBe(0);
});
