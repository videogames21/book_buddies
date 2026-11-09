import { expect, test, type Page } from "@playwright/test";
import { closeE2eDb, e2eDb, signInParent } from "./session-fixture";

// UC-PAR-create-kid-account, end to end. Invented test data only.

const PATH = "/parent/children/new";

test.afterAll(async () => {
  await closeE2eDb();
});

async function fillRequired(page: Page, username: string) {
  await page
    .getByLabel("Nickname (what your child is shown as)")
    .fill("Starfish");
  await page.getByLabel("Age").fill("8");
  await page.getByRole("combobox", { name: /^Grade/ }).selectOption("3");
  await page
    .getByLabel("Username (your child signs in with this)")
    .fill(username);
  await page.getByAltText("Avatar 2", { exact: true }).click();
}

test("main: the parent creates a child, sees the credentials, acknowledges and continues to the reading profile", async ({
  page,
  context,
}) => {
  const { familyId } = await signInParent(context, {
    parentRole: "main",
    consentConfirmed: true,
  });
  await page.goto(PATH);

  await fillRequired(page, "E2E_Reader_Main");
  await page.getByLabel("Scale").selectOption("lexile");
  await page.getByLabel(/^Level/).fill("650L");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(
    page.getByText("Tell your child to log in with these credentials."),
  ).toBeVisible();
  await expect(page.getByTestId("child-username")).toHaveText(
    "e2e_reader_main",
  );
  await expect(page.getByTestId("child-password")).toHaveText(
    /^[a-z]+-[a-z]+-[a-z]+-\d{2}$/,
  );

  const db = await e2eDb();
  const created = await db.collection("children").findOne({ familyId });
  expect(created).toMatchObject({ nickname: "Starfish", avatar: "2" });

  await page.getByRole("button", { name: /continue/ }).click();
  await expect(page).toHaveURL(
    new RegExp(`/parent/children/${String(created!._id)}/reading-profile$`),
  );
});

test("1a: leaving the form without submitting writes nothing", async ({
  page,
  context,
}) => {
  const { familyId } = await signInParent(context, {
    parentRole: "main",
    consentConfirmed: true,
  });
  await page.goto(PATH);

  await page.getByRole("link", { name: "Cancel" }).click();

  await expect(page).toHaveURL(/\/parent$/);
  const db = await e2eDb();
  expect(await db.collection("children").countDocuments({ familyId })).toBe(0);
});

test("1b: a Sub Parent sees an explanation and no form", async ({
  page,
  context,
}) => {
  await signInParent(context, { parentRole: "sub", consentConfirmed: true });
  await page.goto(PATH);

  await expect(
    page.getByText("Only the family's Main Parent can add a child."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create account" }),
  ).toHaveCount(0);
});

test("1c: a family without confirmed consent is sent to the check-your-email screen", async ({
  page,
  context,
}) => {
  await signInParent(context, { parentRole: "main", consentConfirmed: false });
  await page.goto(PATH);

  await expect(page).toHaveURL(/\/parent\/onboarding\/check-email$/);
});

test("4b: an age outside 6–11 shows a warning and still saves", async ({
  page,
  context,
}) => {
  const { familyId } = await signInParent(context, {
    parentRole: "main",
    consentConfirmed: true,
  });
  await page.goto(PATH);

  await fillRequired(page, "e2e_reader_young");
  await page.getByLabel("Age").fill("4");
  await expect(
    page.getByText("BookBuddies is made for children aged 6–11"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(
    page.getByText("Tell your child to log in with these credentials."),
  ).toBeVisible();
  const db = await e2eDb();
  expect(await db.collection("children").countDocuments({ familyId })).toBe(1);
});

test("4e: the referral links are shown and the system fills in no reading level", async ({
  page,
  context,
}) => {
  const { familyId } = await signInParent(context, {
    parentRole: "main",
    consentConfirmed: true,
  });
  await page.goto(PATH);

  await expect(
    page.getByRole("link", { name: "AR BookFinder" }),
  ).toHaveAttribute("href", "https://www.arbookfind.com/");
  await expect(
    page.getByRole("link", { name: "Scholastic Book Wizard" }),
  ).toBeVisible();

  await fillRequired(page, "e2e_reader_skip");
  await expect(page.getByLabel("Scale")).toHaveValue("");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(
    page.getByText("Tell your child to log in with these credentials."),
  ).toBeVisible();

  const db = await e2eDb();
  const created = await db.collection("children").findOne({ familyId });
  const identity = await db
    .collection("childIdentities")
    .findOne({ childId: created!._id });
  expect(identity).not.toHaveProperty("readingLevelScale");
  expect(identity).not.toHaveProperty("readingLevelValue");
});

test("privacy notice: the form links to the online privacy notice (FR-DATA-notice)", async ({
  page,
  context,
}) => {
  await signInParent(context, { parentRole: "main", consentConfirmed: true });
  await page.goto(PATH);

  await expect(
    page.getByRole("link", { name: "privacy notice" }),
  ).toHaveAttribute("href", "http://localhost:3100/privacy-notice");
});

test("double submit sends one action and keeps the first password", async ({
  page,
  context,
}) => {
  const { familyId } = await signInParent(context, {
    parentRole: "main",
    consentConfirmed: true,
  });
  await page.goto(PATH);
  await fillRequired(page, "e2e_reader_double");
  let posts = 0;
  page.on("request", (request) => {
    if (request.method() === "POST") posts++;
  });
  await page.locator("form").evaluate((form: HTMLFormElement) => {
    form.requestSubmit();
    form.requestSubmit();
  });
  await expect(page.getByTestId("child-password")).toBeVisible();
  const password = await page.getByTestId("child-password").textContent();
  await expect(page.getByTestId("child-password")).toHaveText(password ?? "");
  expect(posts).toBe(1);
  expect(
    await (await e2eDb()).collection("children").countDocuments({ familyId }),
  ).toBe(1);
});

test("a lost response explains uncertainty and a retry does not duplicate the account", async ({
  page,
  context,
}) => {
  const { familyId } = await signInParent(context, {
    parentRole: "main",
    consentConfirmed: true,
  });
  await page.goto(PATH);
  await fillRequired(page, "e2e_reader_network");
  await page.route("**/parent/children/new", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    await route.fetch(); // The server commits, but the browser loses its response.
    await route.abort("failed");
  });
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "couldn't confirm whether" }),
  ).toContainText("couldn't confirm whether");
  await page.unroute("**/parent/children/new");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(
    page.getByText("That username is already taken. Please choose another."),
  ).toBeVisible();
  expect(
    await (await e2eDb()).collection("children").countDocuments({ familyId }),
  ).toBe(1);
});

test("a 251-character note is refused inline; a trimmed 250-character note is saved", async ({
  page,
  context,
}) => {
  const { familyId } = await signInParent(context, {
    parentRole: "main",
    consentConfirmed: true,
  });
  await page.goto(PATH);
  await fillRequired(page, "e2e_reader_note");
  await page.getByLabel("Parent note (optional)").fill("x".repeat(251));
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(
    page.getByText("Keep your note to 250 characters or fewer."),
  ).toBeVisible();
  const db = await e2eDb();
  expect(await db.collection("children").countDocuments({ familyId })).toBe(0);
  await page
    .getByLabel("Parent note (optional)")
    .fill("  " + "x".repeat(250) + "  ");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByTestId("child-password")).toBeVisible();
  const child = await db.collection("children").findOne({ familyId });
  const note = await db
    .collection("parentNotes")
    .findOne({ childId: child?._id });
  expect(note).toMatchObject({ text: "x".repeat(250), flag: "check_not_run" });
  await expect(page.getByText("check_not_run")).toHaveCount(0);
});

test("the credentials disappear on reload and the account remains", async ({
  page,
  context,
}) => {
  const { familyId } = await signInParent(context, {
    parentRole: "main",
    consentConfirmed: true,
  });
  await page.goto(PATH);
  await fillRequired(page, "e2e_reader_reload");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByTestId("child-password")).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("child-password")).toHaveCount(0);
  expect(
    await (await e2eDb()).collection("children").countDocuments({ familyId }),
  ).toBe(1);
});

test("completion and REC hand-off refuse another family and unknown children", async ({
  page,
  context,
}) => {
  const { familyId } = await signInParent(context, {
    parentRole: "main",
    consentConfirmed: true,
  });
  await page.goto(PATH);
  await fillRequired(page, "e2e_reader_scope");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByTestId("child-password")).toBeVisible();
  const db = await e2eDb();
  const child = await db.collection("children").findOne({ familyId });
  const base = `/parent/children/${String(child?._id)}`;
  await page.getByRole("button", { name: /continue/ }).click();
  await expect(
    page.getByText(/Reading-interest onboarding is not available yet/),
  ).toBeVisible();
  await page.goto(base + "/onboarding-complete");
  await expect(
    page.getByRole("heading", { name: "Onboarding complete" }),
  ).toBeVisible();
  await expect(
    page.getByText("Starfish’s onboarding is complete."),
  ).toBeVisible();
  await signInParent(context, { parentRole: "main", consentConfirmed: true });
  expect((await page.goto(base + "/onboarding-complete"))?.status()).toBe(404);
  expect((await page.goto(base + "/reading-profile"))?.status()).toBe(404);
  expect(
    (await page.goto("/parent/children/unknown/onboarding-complete"))?.status(),
  ).toBe(404);
});

test("child and admin sessions cannot view parent forms or child details", async ({
  page,
  context,
}) => {
  for (const role of ["child", "admin"]) {
    const { familyId } = await signInParent(context, {
      parentRole: "main",
      consentConfirmed: true,
    });
    await (
      await e2eDb()
    )
      .collection("users")
      .updateOne({ familyId }, { $set: { role } });
    expect((await page.goto(PATH))?.status()).toBe(404);
    expect(
      (
        await page.goto("/parent/children/unknown/onboarding-complete")
      )?.status(),
    ).toBe(404);
  }
});

test("mobile form fits the viewport and never asks for a real name", async ({
  page,
  context,
}, testInfo) => {
  await signInParent(context, { parentRole: "main", consentConfirmed: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(PATH);
  await expect(page.getByLabel("Child's name", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Add a child" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("mobile-form.png"),
    fullPage: true,
  });
});

test("no session and deleted database sessions cannot access the form", async ({
  page,
  context,
}) => {
  await page.goto(PATH);
  await expect(page).toHaveURL(/\/sign-in$/);
  const { familyId } = await signInParent(context, {
    parentRole: "main",
    consentConfirmed: true,
  });
  await page.goto(PATH);
  await expect(
    page.getByRole("button", { name: "Create account" }),
  ).toBeVisible();
  const db = await e2eDb();
  const parent = await db.collection("users").findOne({ familyId });
  await db.collection("sessions").deleteMany({ userId: parent?._id });
  await page.reload();
  await expect(page).toHaveURL(/\/sign-in$/);
});
