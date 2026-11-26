import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { ObjectId } from "mongodb";
import { hashPassword } from "../../src/server/identity-access/passwords";
import { emailText, linkIn } from "./mailpit";
import { closeE2eDb, e2eDb, signInParent } from "./session-fixture";

// UC-PAR-onboarding and its supporting flows (OI-44) against the production build, the
// real database and Mailpit. Every account and address is invented.
test.afterAll(closeE2eDb);

const PASSWORD = "invented e2e password";
const newEmail = () => `parent-${randomUUID()}@example.test`;

async function fillSignUp(page: Page, email: string) {
  await page.getByLabel("Your name").fill("Invented Parent");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByLabel(/I am the parent or guardian/).check();
}

async function signUp(page: Page, email: string) {
  await page.goto("/sign-up");
  await fillSignUp(page, email);
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page).toHaveURL(/\/parent\/onboarding\/check-email$/);
}

async function recordOf(email: string) {
  const db = await e2eDb();
  const user = await db.collection("users").findOne({ email });
  if (!user) return null;
  return db
    .collection("consentRecords")
    .findOne({ familyId: user.familyId as ObjectId });
}

test("main (steps 1-8) and proving slice: confirm parent consent, add a child and save the reading profile", async ({
  page,
}) => {
  const email = newEmail();
  await page.goto("/sign-in");
  await page.getByRole("link", { name: "Create Account" }).click();
  await expect(page).toHaveURL(/\/sign-up$/);

  // Step 2: the notice, its version and the privacy notice link; the box starts unchecked.
  await expect(page.getByTestId("consent-notice")).toBeVisible();
  await expect(page.getByTestId("notice-version")).not.toBeEmpty();
  await expect(
    page.getByRole("link", { name: "privacy notice" }),
  ).toHaveAttribute("href", /privacy-notice/);
  await expect(
    page.getByLabel(/I am the parent or guardian/),
  ).not.toBeChecked();

  await fillSignUp(page, email);
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page).toHaveURL(/\/parent\/onboarding\/check-email$/);
  await expect(
    page.getByRole("heading", { name: "Check your email" }),
  ).toBeVisible();

  const link = linkIn(await emailText(email), "/consent/confirm");
  await page.goto(link);
  // Step 7, no click: loading the page confirms nothing.
  await expect(page.getByRole("button", { name: "Confirm" })).toBeVisible();
  expect((await recordOf(email))?.confirmedAt).toBeUndefined();

  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page).toHaveURL(/\/parent\/children\/new$/);
  const consent = await recordOf(email);
  expect(consent?.confirmedAt).toBeInstanceOf(Date);

  await page
    .getByLabel("Nickname (what your child is shown as)")
    .fill("Starfish");
  await page.getByLabel("Age").fill("8");
  await page.getByRole("combobox", { name: /^Grade/ }).selectOption("3");
  await page
    .getByLabel("Username (your child signs in with this)")
    .fill("Slice_Reader");
  await page.getByAltText("Avatar 2", { exact: true }).click();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByTestId("child-username")).toHaveText("slice_reader");
  await expect(page.getByTestId("child-password")).toBeVisible();

  const db = await e2eDb();
  const child = await db.collection("children").findOne({
    familyId: consent?.familyId,
    nickname: "Starfish",
  });
  expect(child).not.toBeNull();
  const path = `/parent/children/${String(child?._id)}`;
  await page.getByRole("button", { name: /continue/i }).click();
  await expect(page).toHaveURL(new RegExp(`${path}/reading-profile$`));
  await page.getByLabel("Fantasy and magic").check();
  await page.getByLabel(/I have read this notice/).check();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(new RegExp(`${path}/onboarding-complete$`));

  expect(
    await db.collection("readingProfiles").findOne({
      childId: child?._id,
    }),
  ).toMatchObject({ interests: ["fantasy"], onboardingComplete: true });
});

test("3a: leaving the form without submitting writes nothing", async ({
  page,
}) => {
  const email = newEmail();
  await page.goto("/sign-up");
  await fillSignUp(page, email);
  await page.goto("/sign-in");
  const db = await e2eDb();
  expect(await db.collection("users").countDocuments({ email })).toBe(0);
});

test("6a, start again: an expired parent signs up again with the same email", async ({
  page,
}) => {
  const email = newEmail();
  await signUp(page, email);
  const db = await e2eDb();
  const old = await db.collection("users").findOne({ email });
  await db
    .collection("consentRecords")
    .updateOne(
      { familyId: old?.familyId as ObjectId },
      { $set: { confirmBy: new Date(Date.now() - 1000) } },
    );

  await page.goto("/parent");
  await expect(
    page.getByRole("heading", { name: "Your sign-up expired" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "start again" }).click();
  await expect(page).toHaveURL(/\/sign-up$/);

  await fillSignUp(page, email);
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page).toHaveURL(/\/parent\/onboarding\/check-email$/);
  await expect(
    page.getByRole("heading", { name: "Check your email" }),
  ).toBeVisible();
  const users = await db.collection("users").find({ email }).toArray();
  expect(users).toHaveLength(1);
  expect(users[0]?._id).not.toEqual(old?._id);
  expect(
    await db.collection("sessions").countDocuments({ userId: old?._id }),
  ).toBe(0);
});

test("a signed-in parent at any other step is sent from /sign-up to /parent", async ({
  context,
  page,
}) => {
  await signInParent(context, { parentRole: "main", consentConfirmed: false });
  await page.goto("/sign-up");
  await expect(page).toHaveURL(/\/parent\/onboarding\/check-email$/);
});

test("5b and 6b: the could-not-send notice, then a resend that sends a new link", async ({
  context,
  page,
}) => {
  await signInParent(context, { parentRole: "main", consentConfirmed: false });
  await page.goto("/parent/onboarding/check-email?notSent=1");
  await expect(page.getByText("We couldn't send the email.")).toBeVisible();
  await page.getByRole("button", { name: "Send it again" }).click();
  await expect(page.getByText("We sent a new email.")).toBeVisible();
});

test("8a: a confirmed parent with a child comes back to the parent home, and signs out", async ({
  context,
  page,
}) => {
  const { familyId } = await signInParent(context, {
    parentRole: "main",
    consentConfirmed: true,
  });
  const db = await e2eDb();
  await db
    .collection<{ _id: string; [field: string]: unknown }>("children")
    .insertOne({
      _id: randomUUID(),
      familyId,
      nickname: "Otter",
      avatar: "1-1",
      createdAt: new Date(),
    });
  await page.goto("/parent");
  await expect(
    page.getByRole("heading", { name: "Welcome to BookBuddies" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.goto("/parent");
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("sign-out is on every parent page, including the first-child form (8a)", async ({
  context,
  page,
}) => {
  await signInParent(context, { parentRole: "main", consentConfirmed: true });
  await page.goto("/parent");
  await expect(page).toHaveURL(/\/parent\/children\/new$/);
  await expect(page.getByRole("button", { name: "Sign out" })).toHaveCount(1);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.goto("/parent/children/new");
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("password reset: the link changes nothing until submitted, and the token never reaches a URL", async ({
  page,
}) => {
  const email = newEmail();
  const db = await e2eDb();
  const userId = new ObjectId();
  await db.collection("users").insertOne({
    _id: userId,
    role: "parent",
    parentRole: "main",
    familyId: new ObjectId(),
    name: "Invented Parent",
    email,
    passwordHash: await hashPassword(PASSWORD),
  });

  await page.goto("/sign-in");
  await page.getByRole("link", { name: "Forgot password?" }).click();
  // Sign-in has an Email field too: wait for the new page before filling it.
  await expect(
    page.getByRole("heading", { name: "Forgot your password?" }),
  ).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send the link" }).click();
  await expect(page.getByRole("status")).toContainText("If a parent account");

  const link = linkIn(await emailText(email), "/reset-password");
  const token = decodeURIComponent(link.split("#token=")[1] ?? "");
  const requested: string[] = [];
  page.on("request", (request) => requested.push(request.url()));

  const before = (await db.collection("users").findOne({ _id: userId }))
    ?.passwordHash as string;
  await page.goto(link);
  await expect(
    page.getByRole("heading", { name: "Choose a new password" }),
  ).toBeVisible();
  expect(
    (await db.collection("users").findOne({ _id: userId }))?.passwordHash,
  ).toBe(before);

  await page.getByLabel("New password").fill("invented new e2e password");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page).toHaveURL(/\/sign-in\?passwordChanged=1$/);
  await expect(page.getByText("Your password was changed.")).toBeVisible();
  expect(requested.some((url) => url.includes(token))).toBe(false);

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("invented new e2e password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/parent/);
});
