import { expect, test, type Page } from "@playwright/test";
import { closeE2eDb, e2eDb, signInParent } from "./session-fixture";

// UC-PAR-create-kid-account, end to end. Invented test data only.

const PATH = "/parent/children/new";

test.afterAll(async () => {
  await closeE2eDb();
});

async function fillRequired(page: Page, username: string) {
  await page.getByLabel("Child's name").fill("Invented Child");
  await page.getByLabel("Nickname (what your child is shown as)").fill("Starfish");
  await page.getByLabel("Age").fill("8");
  await page.getByRole("combobox", { name: /^Grade/ }).selectOption("3");
  await page.getByLabel("Username (your child signs in with this)").fill(username);
  await page.getByAltText("Avatar 2", { exact: true }).click();
}

test("main: the parent creates a child, sees the credentials, acknowledges and continues to the reading profile", async ({
  page,
  context,
}) => {
  const { familyId } = await signInParent(context, { parentRole: "main", consentConfirmed: true });
  await page.goto(PATH);

  await fillRequired(page, "E2E_Reader_Main");
  await page.getByLabel("Scale").selectOption("lexile");
  await page.getByLabel(/^Level/).fill("650L");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByText("Tell your child to log in with these credentials.")).toBeVisible();
  await expect(page.getByTestId("child-username")).toHaveText("e2e_reader_main");
  await expect(page.getByTestId("child-password")).toHaveText(/^[a-z]+-[a-z]+-[a-z]+-\d{2}$/);

  const db = await e2eDb();
  const created = await db.collection("children").findOne({ familyId });
  expect(created).toMatchObject({ nickname: "Starfish", avatar: "2" });

  await page.getByRole("button", { name: /continue/ }).click();
  await expect(page).toHaveURL(new RegExp(`/parent/children/${created!._id.toHexString()}/reading-profile$`));
});

test("1a: leaving the form without submitting writes nothing", async ({ page, context }) => {
  const { familyId } = await signInParent(context, { parentRole: "main", consentConfirmed: true });
  await page.goto(PATH);

  await page.getByLabel("Child's name").fill("Invented Child");
  await page.getByRole("link", { name: "Cancel" }).click();

  await expect(page).toHaveURL(/\/parent$/);
  const db = await e2eDb();
  expect(await db.collection("children").countDocuments({ familyId })).toBe(0);
});

test("1b: a Sub Parent sees an explanation and no form", async ({ page, context }) => {
  await signInParent(context, { parentRole: "sub", consentConfirmed: true });
  await page.goto(PATH);

  await expect(page.getByText("Only the family's Main Parent can add a child.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Create account" })).toHaveCount(0);
});

test("1c: a family without confirmed consent is sent to the check-your-email screen", async ({ page, context }) => {
  await signInParent(context, { parentRole: "main", consentConfirmed: false });
  await page.goto(PATH);

  await expect(page).toHaveURL(/\/parent\/onboarding\/check-email$/);
});

test("4b: an age outside 6–11 shows a warning and still saves", async ({ page, context }) => {
  const { familyId } = await signInParent(context, { parentRole: "main", consentConfirmed: true });
  await page.goto(PATH);

  await fillRequired(page, "e2e_reader_young");
  await page.getByLabel("Age").fill("4");
  await expect(page.getByText("BookBuddies is made for children aged 6–11")).toBeVisible();
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByText("Tell your child to log in with these credentials.")).toBeVisible();
  const db = await e2eDb();
  expect(await db.collection("children").countDocuments({ familyId })).toBe(1);
});

test("4e: the referral links are shown and the system fills in no reading level", async ({ page, context }) => {
  const { familyId } = await signInParent(context, { parentRole: "main", consentConfirmed: true });
  await page.goto(PATH);

  await expect(page.getByRole("link", { name: "AR BookFinder" })).toHaveAttribute("href", "https://www.arbookfind.com/");
  await expect(page.getByRole("link", { name: "Scholastic Book Wizard" })).toBeVisible();

  await fillRequired(page, "e2e_reader_skip");
  await expect(page.getByLabel("Scale")).toHaveValue("");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Tell your child to log in with these credentials.")).toBeVisible();

  const db = await e2eDb();
  const created = await db.collection("children").findOne({ familyId });
  const identity = await db.collection("childIdentities").findOne({ childId: created!._id });
  expect(identity).not.toHaveProperty("readingLevelScale");
  expect(identity).not.toHaveProperty("readingLevelValue");
});

test("privacy notice: the form links to the online privacy notice (FR-DATA-notice)", async ({ page, context }) => {
  await signInParent(context, { parentRole: "main", consentConfirmed: true });
  await page.goto(PATH);

  await expect(page.getByRole("link", { name: "privacy notice" })).toHaveAttribute(
    "href",
    "https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa",
  );
});
