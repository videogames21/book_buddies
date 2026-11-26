import { expect, test, type Page } from "@playwright/test";
import type { ObjectId } from "mongodb";
import {
  closeE2eDb,
  e2eDb,
  signInChild,
  signInParent,
} from "./session-fixture";
import { addBook, shelve } from "./shelf-fixture";

// Child sign-in, the home screen, sign-out, keep-alive and the error screen
// (design/shlf.md, supporting flows). Invented test data only.
test.afterAll(closeE2eDb);

/**
 * Just past the e2e server's CHILD_KEEPALIVE_SECONDS (start-server.mjs, 45), so one
 * keep-alive is due.
 */
const ONE_INTERVAL = "00:46";

const SIGN_IN = /\/child\/sign-in$/;
const SIGN_OUT_FAILED = "That didn’t work. Try again or ask a grown-up.";

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

async function openShelf(page: Page) {
  await page.getByRole("link", { name: "My Shelf" }).click();
  await expect(page).toHaveURL(/\/child\/shelf$/);
}

async function backHome(page: Page) {
  await page.getByRole("link", { name: "Back" }).click();
  await expect(page).toHaveURL(/\/child$/);
}

/** Every POST from now on: the keep-alives and the other server actions. */
function postsFrom(page: Page) {
  const posts: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") posts.push(request.url());
  });
  return posts;
}

/**
 * Brings on the next keep-alive and waits until the server has answered it. The action
 * has run by then. Not response.finished(), which for these streamed responses
 * sometimes never resolves.
 */
async function nextKeepAlive(page: Page) {
  const answered = page.waitForResponse(
    (response) => response.request().method() === "POST",
  );
  await page.clock.fastForward(ONE_INTERVAL);
  await answered;
}

/** Loses every server action on the child home, as a dropped connection would. */
async function loseServerActions(page: Page) {
  await page.route("**/child", (route) =>
    route.request().method() === "POST" ? route.abort() : route.fallback(),
  );
}

test("the home screen leads to the shelf and back, and signs out", async ({
  page,
  context,
  baseURL,
}) => {
  // The address the e2e server is given as PRIVACY_NOTICE_URL (start-server.mjs).
  const notice = `${baseURL}/privacy-notice`;
  const privacyLink = page.getByRole("link", { name: "Privacy notice" });
  const { sessionId } = await signInChild(context);
  await page.goto("/child");
  await expect(page.getByRole("heading", { name: "Starfish" })).toBeVisible();
  await expect(privacyLink).toHaveAttribute("href", notice);

  await openShelf(page);
  await backHome(page);

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(SIGN_IN);
  await expect(privacyLink).toHaveAttribute("href", notice);
  expect(await endRecord(sessionId)).toBeNull();
  await page.goto("/child");
  await expect(page).toHaveURL(SIGN_IN);
});

test("the longest nickname wraps on a narrow screen", async ({
  page,
  context,
}) => {
  const { childId } = await signInChild(context);
  // 20 wide characters, the most a parent can enter, with nowhere to break.
  const nickname = "W".repeat(20);
  await (
    await e2eDb()
  )
    .collection<{ _id: string; nickname: string }>("children")
    .updateOne({ _id: childId }, { $set: { nickname } });
  // 320 CSS pixels: a small phone, or a 1280-pixel window zoomed to 400%.
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/child");
  await expect(page.getByRole("heading", { name: nickname })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
});

test("the shelf is not fetched before the child asks for it", async ({
  page,
  context,
}) => {
  await signInChild(context);
  const fetched: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/child/shelf") {
      fetched.push(request.url());
    }
  });
  await page.goto("/child");
  await expect(page.getByRole("link", { name: "My Shelf" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
  expect(fetched).toEqual([]);
});

test("the keep-alive is sent at the configured interval", async ({
  page,
  context,
}) => {
  await signInChild(context);
  await openHome(page);
  const posts = postsFrom(page);
  // Longer than the default of 30 seconds, short of the 45 configured here.
  await page.clock.fastForward("00:40");
  await page.waitForTimeout(500);
  expect(posts).toEqual([]);
  await page.clock.fastForward("00:06");
  await expect.poll(() => posts.length).toBe(1);
});

test("the keep-alive reports activity only after the child touched the page", async ({
  page,
  context,
}) => {
  const { sessionId } = await signInChild(context);
  await openHome(page);

  const untouched = await backdate(sessionId, 5);
  await nextKeepAlive(page);
  expect(isRecent((await endRecord(sessionId))?.lastSeenAt)).toBe(true);
  // Neither the keep-alive nor a re-render it might cause counts as activity.
  expect((await endRecord(sessionId))?.lastActiveAt).toEqual(untouched);

  await backdate(sessionId, 5);
  // A tap that makes no request.
  await page.getByRole("heading", { name: "Starfish" }).click();
  await nextKeepAlive(page);
  expect(isRecent((await endRecord(sessionId))?.lastActiveAt)).toBe(true);
});

test("one tap is reported once, not by every keep-alive after it", async ({
  page,
  context,
}) => {
  const { sessionId } = await signInChild(context);
  await openHome(page);
  await page.getByRole("heading", { name: "Starfish" }).click();
  await nextKeepAlive(page);

  const untouched = await backdate(sessionId, 5);
  await nextKeepAlive(page);
  expect(isRecent((await endRecord(sessionId))?.lastSeenAt)).toBe(true);
  expect((await endRecord(sessionId))?.lastActiveAt).toEqual(untouched);
});

/** Turns the mouse wheel, with no click, and waits for the scroll event it causes. */
async function wheelOver(page: Page, target: string) {
  await page.evaluate((selector) => {
    const scrolled = selector === "body" ? window : null;
    (scrolled ?? document.querySelector(selector))?.addEventListener(
      "scroll",
      () => document.body.setAttribute("data-scrolled", ""),
      { once: true },
    );
  }, target);
  await page.locator(target).hover();
  await page.mouse.wheel(0, 100);
  await expect(page.locator("body[data-scrolled]")).toBeAttached();
}

// Each of these touches the page without a tap.
const touches: [string, (page: Page) => Promise<unknown>][] = [
  ["a key press", (page) => page.keyboard.press("Shift")],
  [
    "a scroll of the page",
    async (page) => {
      // Small enough that the home screen has to scroll.
      await page.setViewportSize({ width: 400, height: 200 });
      await wheelOver(page, "body");
    },
  ],
  [
    "a scroll inside an element",
    async (page) => {
      // No child page has a scrolling box yet, so the test adds one.
      await page.evaluate(() => {
        const box = document.createElement("div");
        box.id = "box";
        box.style.cssText = "height: 80px; overflow: auto";
        box.innerHTML = '<div style="height: 400px"></div>';
        document.body.prepend(box);
      });
      await wheelOver(page, "#box");
    },
  ],
];

for (const [name, touch] of touches) {
  test(`the keep-alive counts ${name} as activity`, async ({
    page,
    context,
  }) => {
    const { sessionId } = await signInChild(context);
    await openHome(page);
    await backdate(sessionId, 5);
    await touch(page);
    await nextKeepAlive(page);
    expect(isRecent((await endRecord(sessionId))?.lastActiveAt)).toBe(true);
  });
}

test("activity in a keep-alive that was not delivered is reported again", async ({
  page,
  context,
}) => {
  const { sessionId } = await signInChild(context);
  await openHome(page);
  await loseServerActions(page);
  await page.getByRole("heading", { name: "Starfish" }).click();
  const lost = page.waitForEvent("requestfailed");
  await page.clock.fastForward(ONE_INTERVAL);
  await lost;
  await page.unrouteAll();
  // Time for the page to notice the failure.
  await page.waitForTimeout(500);

  await backdate(sessionId, 5);
  await nextKeepAlive(page);
  expect(isRecent((await endRecord(sessionId))?.lastActiveAt)).toBe(true);
});

test("an open page goes to sign-in once the session has ended, and Back stays signed out", async ({
  page,
  context,
}) => {
  const { sessionId } = await signInChild(context);
  await openHome(page);
  await openShelf(page);
  await backHome(page);
  await openShelf(page);
  await backdate(sessionId, 31);
  await page.clock.fastForward(ONE_INTERVAL);
  await expect(page).toHaveURL(SIGN_IN);
  await page.waitForLoadState("networkidle");
  expect(await endRecord(sessionId)).toBeNull();

  // The sign-in page sends no keep-alive.
  const posts = postsFrom(page);
  await page.clock.fastForward("02:00");
  await page.waitForTimeout(500);
  expect(posts).toEqual([]);

  // The home screen seen earlier must not come back from the browser's memory.
  await page.goBack();
  await expect(page).toHaveURL(SIGN_IN);
  await expect(page.getByText("Starfish")).toHaveCount(0);
});

test("the keep-alive stops when the app moves to sign-in without a reload", async ({
  page,
  context,
}) => {
  const { sessionId } = await signInChild(context);
  await openHome(page);
  await openShelf(page);
  await backdate(sessionId, 31);
  await page.evaluate(() => Object.assign(window, { samePage: true }));
  // The home screen refuses the ended session and redirects inside the app.
  await page.getByRole("link", { name: "Back" }).click();
  await expect(page).toHaveURL(SIGN_IN);
  await page.waitForLoadState("networkidle");
  expect(await page.evaluate(() => "samePage" in window)).toBe(true);

  const posts = postsFrom(page);
  await page.clock.fastForward("02:00");
  await page.waitForTimeout(500);
  expect(posts).toEqual([]);
});

test("an open page goes to sign-in when the browser signs in as someone else", async ({
  page,
  context,
}) => {
  await signInChild(context);
  await openHome(page);
  // The same cookie name, so this replaces the child's session in the browser.
  await signInParent(context, { parentRole: "main", consentConfirmed: true });
  await page.clock.fastForward(ONE_INTERVAL);
  await expect(page).toHaveURL(SIGN_IN);
});

test("Sign out after the session has ended goes to sign-in, and Back stays signed out", async ({
  page,
  context,
}) => {
  const { sessionId } = await signInChild(context);
  await openHome(page);
  await openShelf(page);
  await backHome(page);
  await backdate(sessionId, 31);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(SIGN_IN);
  await expect(page.getByText(SIGN_OUT_FAILED)).toHaveCount(0);

  // The shelf seen earlier is asked for again, and refused.
  await page.goBack();
  await expect(page).toHaveURL(SIGN_IN);
  await expect(page.getByText("Starfish")).toHaveCount(0);
});

test("a Sign out that is refused stays on the page and says so", async ({
  page,
  context,
}) => {
  await signInChild(context);
  await openHome(page);
  await signInParent(context, { parentRole: "main", consentConfirmed: true });
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByText(SIGN_OUT_FAILED)).toBeVisible();
  await expect(page).toHaveURL(/\/child$/);
});

test("a Sign out that cannot be sent says so and can be tried again", async ({
  page,
  context,
}) => {
  await signInChild(context);
  await openHome(page);
  await loseServerActions(page);
  const button = page.getByRole("button", { name: "Sign out" });
  await button.click();
  await expect(page.getByText(SIGN_OUT_FAILED)).toBeVisible();
  await expect(button).toBeEnabled();

  await page.unrouteAll();
  await button.click();
  await expect(page).toHaveURL(SIGN_IN);
});

test("Try again on the error screen loads the page again", async ({
  page,
  context,
}) => {
  const { childId } = await signInChild(context);
  const children = (await e2eDb()).collection<{
    _id: string;
    nickname: unknown;
  }>("children");
  const setNickname = (nickname: unknown) =>
    children.updateOne(
      { _id: childId },
      { $set: { nickname } },
      { bypassDocumentValidation: true },
    );

  // A nickname that is not text makes this one server render fail.
  await setNickname({ broken: true });
  await page.goto("/child");
  await expect(page.getByRole("heading", { name: "Oops!" })).toBeVisible();
  await setNickname("Starfish");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { name: "Starfish" })).toBeVisible();
});

test("a parent gets a 404 on the child home", async ({ page, context }) => {
  await signInParent(context, { parentRole: "main", consentConfirmed: true });
  const response = await page.goto("/child");
  expect(response?.status()).toBe(404);
});

/** The signed-in parent adds a child on screen and reads the password shown once. */
async function createChildAsParent(page: Page, username: string) {
  await signInParent(page.context(), {
    parentRole: "main",
    consentConfirmed: true,
  });
  await page.goto("/parent/children/new");
  await page
    .getByLabel("Nickname (what your child is shown as)")
    .fill("Starfish");
  await page.getByLabel("Age").fill("8");
  await page.getByRole("combobox", { name: /^Grade/ }).selectOption("3");
  await page
    .getByLabel("Username (your child signs in with this)")
    .fill(username);
  await page.getByAltText("Avatar 2", { exact: true }).click();
  await page.getByRole("button", { name: "Create account" }).click();
  return page.getByTestId("child-password").innerText();
}

async function fillSignIn(page: Page, username: string, password: string) {
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("a parent creates a child, who signs in, opens My Shelf and signs out", async ({
  page,
  context,
}) => {
  const password = await createChildAsParent(page, "e2e_sign_in");
  await page.goto("/child/sign-in");
  await expect(
    page.getByRole("link", { name: "Privacy notice" }),
  ).toBeVisible();

  // A wrong password stays here, keeping the username only.
  await fillSignIn(page, "e2e_sign_in", "wrong-guess-00");
  await expect(
    page.getByRole("alert").filter({ hasText: "isn’t right" }),
  ).toBeVisible();
  await expect(page.getByLabel("Username")).toHaveValue("e2e_sign_in");
  await expect(page.getByLabel("Password")).toHaveValue("");

  // On the tablet the parent was just signed in on, typed with a capital.
  await fillSignIn(page, "E2E_Sign_In", password);
  await expect(page).toHaveURL(/\/child$/);
  await expect(page.getByRole("heading", { name: "Starfish" })).toBeVisible();

  const cookies = await context.cookies(`${new URL(page.url()).origin}/child`);
  const cookie = (name: string) => cookies.find((c) => c.name === name);
  expect(cookie("next-auth.session-token")).toMatchObject({
    httpOnly: true,
    sameSite: "Lax",
  });
  // The session cookie is Secure on https only (session-cookie.ts); this one always is.
  expect(cookie("child_device")).toMatchObject({
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
  });

  // A signed-in child has no use for the sign-in page.
  await page.goto("/child/sign-in");
  await expect(page).toHaveURL(/\/child$/);

  const created = await (
    await e2eDb()
  )
    .collection<{ childId: string }>("users")
    .findOne({ username: "e2e_sign_in" });
  await shelve(
    String(created?.childId),
    await addBook("First Book"),
    "readingNow",
  );
  await openShelf(page);
  await page.getByRole("button", { name: "First Book" }).click();
  await expect(
    page.getByRole("complementary", { name: "Selected book" }),
  ).toContainText("A. Writer");
  await backHome(page);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(SIGN_IN);
  await page.goto("/child");
  await expect(page).toHaveURL(SIGN_IN);
});

test("an empty sign-in form asks for the username and sends nothing", async ({
  page,
}) => {
  await page.goto("/child/sign-in");
  await page.waitForLoadState("networkidle");
  const posts = postsFrom(page);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Type your username.")).toBeVisible();
  expect(posts).toEqual([]);
});
