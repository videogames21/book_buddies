import { expect, test, type Page } from "@playwright/test";
import type { ObjectId } from "mongodb";
import {
  closeE2eDb,
  e2eDb,
  signInChild,
  signInParent,
} from "./session-fixture";

// The child's home, sign-out and keep-alive (design/shlf.md, supporting flows). Child
// sign-in itself is not built yet. Invented test data only.
test.afterAll(closeE2eDb);

async function endRecord(sessionId: ObjectId) {
  const db = await e2eDb();
  return db.collection("childSessionEnds").findOne({ sessionId });
}

/** Moves both times back, so the next keep-alive's writes show. */
async function backdate(sessionId: ObjectId, minutes: number) {
  const db = await e2eDb();
  const then = new Date(Date.now() - minutes * 60 * 1000);
  await db
    .collection("childSessionEnds")
    .updateOne(
      { sessionId },
      { $set: { lastSeenAt: then, lastActiveAt: then } },
    );
  return then;
}

const isRecent = (time: unknown) =>
  time instanceof Date && Date.now() - time.getTime() < 60 * 1000;

async function openHome(page: Page) {
  await page.clock.install();
  await page.goto("/child");
  await page.waitForLoadState("networkidle");
}

test("the home screen leads to the shelf and back, and signs out", async ({
  page,
  context,
}) => {
  const { sessionId } = await signInChild(context);
  await page.goto("/child");
  await expect(page.getByRole("heading", { name: "Starfish" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Privacy notice" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "My Shelf" }).click();
  await expect(page).toHaveURL(/\/child\/shelf$/);
  await page.getByRole("link", { name: "Back" }).click();
  await expect(page).toHaveURL(/\/child$/);

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/child\/sign-in$/);
  await expect(
    page.getByRole("link", { name: "Privacy notice" }),
  ).toBeVisible();
  expect(await endRecord(sessionId)).toBeNull();
  await page.goto("/child");
  await expect(page).toHaveURL(/\/child\/sign-in$/);
});

test("the keep-alive reports activity only after the child touched the page", async ({
  page,
  context,
}) => {
  const { sessionId } = await signInChild(context);
  await openHome(page);

  const untouched = await backdate(sessionId, 5);
  await page.clock.fastForward("00:31");
  await expect
    .poll(async () => isRecent((await endRecord(sessionId))?.lastSeenAt))
    .toBe(true);
  // Neither the keep-alive nor a re-render it might cause counts as activity.
  expect((await endRecord(sessionId))?.lastActiveAt).toEqual(untouched);

  await backdate(sessionId, 5);
  // A tap that makes no request.
  await page.getByRole("heading", { name: "Starfish" }).click();
  await page.clock.fastForward("00:31");
  await expect
    .poll(async () => isRecent((await endRecord(sessionId))?.lastActiveAt))
    .toBe(true);

  await page.close();
  const closed = await backdate(sessionId, 5);
  await new Promise((resolve) => setTimeout(resolve, 1000));
  expect((await endRecord(sessionId))?.lastSeenAt).toEqual(closed);
});

test("an open page goes to sign-in once the session has ended", async ({
  page,
  context,
}) => {
  const { sessionId } = await signInChild(context);
  await openHome(page);
  await backdate(sessionId, 31);
  await page.clock.fastForward("00:31");
  await expect(page).toHaveURL(/\/child\/sign-in$/);
  expect(await endRecord(sessionId)).toBeNull();

  // The sign-in page sends no keep-alive.
  const posts: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") posts.push(request.url());
  });
  await page.clock.fastForward("02:00");
  await page.waitForTimeout(500);
  expect(posts).toEqual([]);
});

test("a parent gets a 404 on the child home", async ({ page, context }) => {
  await signInParent(context, { parentRole: "main", consentConfirmed: true });
  const response = await page.goto("/child");
  expect(response?.status()).toBe(404);
});
