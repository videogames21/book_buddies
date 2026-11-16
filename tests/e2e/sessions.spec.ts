import { expect, test } from "@playwright/test";
import { closeE2eDb, e2eDb, signInParent } from "./session-fixture";

// Identity & Access: use the real auth library and its database adapter.
test.afterAll(closeE2eDb);

test("deleting a database session revokes access on the next request", async ({
  page,
  context,
}) => {
  const { familyId } = await signInParent(context, {
    parentRole: "main",
    consentConfirmed: true,
  });
  await page.goto("/parent/children/new");
  await expect(
    page.getByRole("button", { name: "Create account" }),
  ).toBeVisible();
  const db = await e2eDb();
  const parent = await db.collection("users").findOne({ familyId });
  await db.collection("sessions").deleteMany({ userId: parent?._id });
  await page.reload();
  await expect(page).toHaveURL(/\/sign-in$/);
});
