import { randomUUID } from "node:crypto";
import { expect, test, type Page, type Request } from "@playwright/test";
import { ObjectId } from "mongodb";
import {
  closeE2eDb,
  e2eDb,
  signInChild,
  signInParent,
} from "./session-fixture";
import { addBook, shelve } from "./shelf-fixture";

// UC-REC-kid-review in the browser (design/rec.md, Tests: main, 2 empty, 3a, 4a and
// 7a end-to-end), with the keyboard focus after a card leaves. Invented children and
// books only.
test.afterAll(closeE2eDb);

const EMPTY = "No new picks right now. You can ask again.";
const ALREADY_ON_SHELF = "This book is already on your shelf.";
const MAY_HAVE_SAVED =
  "Your answer may have been saved. Check your shelf, or try again.";
const SAVE_FAILED = "We couldn't save your answer. Please try again.";
const REACTIONS = "recommendationReactions";

/**
 * A signed-in child of a consented family, aged 7, with one released batch holding
 * the given titles in that order (or an emptied batch for none).
 */
async function childWithPicks(
  context: Parameters<typeof signInChild>[0],
  titles: string[],
) {
  const { familyId } = await signInParent(context, {
    parentRole: "main",
    consentConfirmed: true,
  });
  // Signed in last, so the browser's session is the child's.
  const { childId } = await signInChild(context);
  const db = await e2eDb();
  await db
    .collection<{ _id: string; familyId: ObjectId }>("children")
    .updateOne({ _id: childId }, { $set: { familyId } });
  await db
    .collection("childIdentities")
    .insertOne({ childId, age: 7, grade: "2", createdAt: new Date() });
  const bookIds: string[] = [];
  for (const title of titles) bookIds.push(await addBook(title));
  const releasedAt = new Date(Date.now() - 60 * 60 * 1000);
  await db.collection("recommendationBatches").insertOne({
    _id: new ObjectId(),
    requestId: randomUUID(),
    childId,
    source: "rules",
    status: bookIds.length > 0 ? "released" : "empty",
    bookIds,
    createdAt: new Date(releasedAt.getTime() - 60 * 60 * 1000),
    handoffDeadline: new Date(releasedAt.getTime() + 60 * 60 * 1000),
    releasedAt,
  });
  return { childId, bookIds };
}

const card = (page: Page, title: string) =>
  page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: title }) });

const answer = (page: Page, title: string, label: string) =>
  card(page, title).getByRole("button", { name: label, exact: true });

const reactionsOf = async (childId: string) =>
  (await e2eDb())
    .collection(REACTIONS)
    .find({ childId }, { projection: { _id: 0, bookId: 1, reaction: 1 } })
    .sort({ reactedAt: 1, _id: 1 })
    .toArray();

const isAction = (request: Request) =>
  request.method() === "POST" && "next-action" in request.headers();

/** The page's own error, not Next.js's empty route-announcer alert. */
const alertWith = (page: Page, text: string) =>
  page.getByRole("alert").filter({ hasText: text });

async function openList(page: Page) {
  await page.goto("/child/recommendations");
  await expect(
    page.getByRole("heading", { name: "My recommendations" }),
  ).toBeVisible();
}

test("main: the child opens My recommendations from home, answers each book, sees the empty message, and the shelf holds two of them (steps 1–8)", async ({
  page,
  context,
}) => {
  const { childId, bookIds } = await childWithPicks(context, [
    "Otter Cove",
    "Lantern Hill",
    "Pebble Road",
  ]);
  await page.goto("/child");
  await page.getByRole("link", { name: "My recommendations" }).click();
  await expect(page).toHaveURL(/\/child\/recommendations$/);
  await expect(page.getByRole("heading", { level: 2 })).toHaveText([
    "Otter Cove",
    "Lantern Hill",
    "Pebble Road",
  ]);

  await answer(page, "Otter Cove", "Yes").click();
  await expect(card(page, "Otter Cove")).toHaveCount(0);
  await expect(answer(page, "Lantern Hill", "Yes")).toBeFocused();

  await answer(page, "Lantern Hill", "Maybe later").click();
  await expect(card(page, "Lantern Hill")).toHaveCount(0);
  await expect(answer(page, "Pebble Road", "Yes")).toBeFocused();

  // Step 6: the reasons and Skip on the same card; Back returns to the three answers.
  // Focus follows: to the first reason, and back to Not for me.
  await answer(page, "Pebble Road", "Not for me").click();
  await expect(
    answer(page, "Pebble Road", "Not interested in topic"),
  ).toBeFocused();
  await card(page, "Pebble Road").getByRole("button", { name: "Back" }).click();
  await expect(answer(page, "Pebble Road", "Not for me")).toBeFocused();
  await answer(page, "Pebble Road", "Not for me").click();
  await expect(
    answer(page, "Pebble Road", "Not interested in topic"),
  ).toBeFocused();
  await expect(card(page, "Pebble Road").getByRole("button")).toHaveText([
    "Not interested in topic",
    "Too easy / too short",
    "Too hard / too long",
    "Not my style",
    "Other",
    "Skip",
    "Back",
  ]);
  await answer(page, "Pebble Road", "Too hard / too long").click();

  await expect(page.getByText(EMPTY)).toBeFocused();
  await expect(
    page.getByRole("link", { name: "Get recommendations" }),
  ).toHaveAttribute("href", "/child/recommendations/quiz");
  await expect(page.getByRole("main")).not.toContainText(/\d/);
  expect(await reactionsOf(childId)).toEqual([
    { bookId: bookIds[0], reaction: "yes" },
    { bookId: bookIds[1], reaction: "maybeLater" },
    { bookId: bookIds[2], reaction: "notForMe" },
  ]);

  await page.goto("/child/shelf");
  await expect(page.getByRole("region", { name: "Reading Now" })).toContainText(
    "Otter Cove",
  );
  await expect(page.getByRole("region", { name: "Maybe Later" })).toContainText(
    "Lantern Hill",
  );
  await expect(page.getByRole("main")).not.toContainText("Pebble Road");
});

test("2, empty: a batch the parent emptied shows the one empty message, a link to the quiz, and no count", async ({
  page,
  context,
}) => {
  await childWithPicks(context, []);
  await openList(page);
  await expect(page.getByText(EMPTY)).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Get recommendations" }),
  ).toHaveAttribute("href", "/child/recommendations/quiz");
  await expect(page.getByRole("listitem")).toHaveCount(0);
  await expect(page.getByRole("main")).not.toContainText(/\d/);
});

test("3a: leaving without answering, or at the reason step, saves nothing, and the book is listed on the next visit", async ({
  page,
  context,
}) => {
  const { childId } = await childWithPicks(context, ["Willow Lane"]);
  const sent: string[] = [];
  page.on("request", (request) => {
    if (isAction(request)) sent.push(request.url());
  });

  await openList(page);
  await page.getByRole("link", { name: "Back home" }).click();
  await expect(page).toHaveURL(/\/child$/);

  await openList(page);
  await answer(page, "Willow Lane", "Not for me").click();
  await expect(answer(page, "Willow Lane", "Skip")).toBeVisible();
  await page.getByRole("link", { name: "Back home" }).click();
  await expect(page).toHaveURL(/\/child$/);

  expect(sent).toEqual([]);
  expect(await reactionsOf(childId)).toEqual([]);
  await openList(page);
  await expect(answer(page, "Willow Lane", "Yes")).toBeVisible();
});

test("4a: Maybe later, and then Yes, on books already in Finished: each leaves, the child sees already on your shelf, and the entries stay in Finished", async ({
  page,
  context,
}) => {
  const { childId, bookIds } = await childWithPicks(context, [
    "Harbor Lights",
    "Fern Gully Path",
  ]);
  for (const bookId of bookIds) await shelve(childId, bookId, "finished");
  await openList(page);

  await answer(page, "Harbor Lights", "Maybe later").click();
  await expect(card(page, "Harbor Lights")).toHaveCount(0);
  await expect(page.getByRole("status")).toHaveText(ALREADY_ON_SHELF);
  // A next card takes focus first.
  await expect(answer(page, "Fern Gully Path", "Yes")).toBeFocused();

  await answer(page, "Fern Gully Path", "Yes").click();
  await expect(card(page, "Fern Gully Path")).toHaveCount(0);
  // With no next card, the status line takes focus.
  await expect(page.getByRole("status")).toHaveText(ALREADY_ON_SHELF);
  await expect(page.getByRole("status")).toBeFocused();

  const db = await e2eDb();
  expect(
    await db
      .collection("shelfEntries")
      .find({ childId }, { projection: { _id: 0, bookId: 1, category: 1 } })
      .sort({ bookId: 1 })
      .toArray(),
  ).toEqual(
    [...bookIds].sort().map((bookId) => ({ bookId, category: "finished" })),
  );
  expect(await reactionsOf(childId)).toEqual([
    { bookId: bookIds[0], reaction: "maybeLater" },
    { bookId: bookIds[1], reaction: "yes" },
  ]);
});

test.describe("7a", () => {
  test("a failed save keeps the card with the error and focus on it, and a retry succeeds", async ({
    page,
    context,
  }) => {
    const { childId } = await childWithPicks(context, ["Copper Kettle"]);
    await openList(page);
    const db = await e2eDb();
    const [info] = await db
      .listCollections({ name: REACTIONS }, { nameOnly: false })
      .toArray();
    const options = (info as { options?: Record<string, unknown> } | undefined)
      ?.options;
    if (!options?.validator)
      throw new Error("no reactions validator to restore");
    try {
      // Every reaction insert is refused for real, so the transaction aborts.
      await db.command({
        collMod: REACTIONS,
        validator: { neverPresent: { $exists: true } },
        validationAction: "error",
      });
      await answer(page, "Copper Kettle", "Yes").click();
      await expect(alertWith(page, SAVE_FAILED)).toBeVisible();
      await expect(answer(page, "Copper Kettle", "Yes")).toBeFocused();
    } finally {
      await db.command({
        collMod: REACTIONS,
        validator: options.validator,
        ...(options.validationLevel
          ? { validationLevel: options.validationLevel }
          : {}),
        ...(options.validationAction
          ? { validationAction: options.validationAction }
          : {}),
      });
    }
    expect(await reactionsOf(childId)).toEqual([]);
    expect(
      await db.collection("shelfEntries").countDocuments({ childId }),
    ).toBe(0);

    await answer(page, "Copper Kettle", "Yes").click();
    await expect(card(page, "Copper Kettle")).toHaveCount(0);
    expect(await reactionsOf(childId)).toHaveLength(1);
  });

  test("a rejected call that committed (response dropped after the server answered): after the refresh the card has left with no error, and the shelf has the book", async ({
    page,
    context,
  }) => {
    const { childId, bookIds } = await childWithPicks(context, ["Maple Ridge"]);
    await openList(page);
    await page.route("**/*", async (route) => {
      if (!isAction(route.request())) return route.continue();
      await route.fetch();
      return route.abort();
    });

    await answer(page, "Maple Ridge", "Yes").click();

    await expect(card(page, "Maple Ridge")).toHaveCount(0);
    await expect(page.getByText(EMPTY)).toBeFocused();
    await expect(alertWith(page, MAY_HAVE_SAVED)).toHaveCount(0);
    await page.unrouteAll();
    expect(await reactionsOf(childId)).toEqual([
      { bookId: bookIds[0], reaction: "yes" },
    ]);
    await page.goto("/child/shelf");
    await expect(
      page.getByRole("region", { name: "Reading Now" }),
    ).toContainText("Maple Ridge");
  });

  test("a rejected call that never reached the server: the page is refreshed, the card shows the may-have-saved message with its buttons enabled, and a retry succeeds", async ({
    page,
    context,
  }) => {
    const { childId } = await childWithPicks(context, ["Birch Hollow"]);
    await openList(page);
    await page.route("**/*", (route) =>
      isAction(route.request()) ? route.abort() : route.continue(),
    );
    const refreshed = page.waitForRequest(
      (request) =>
        request.method() === "GET" &&
        request.url().includes("/child/recommendations") &&
        "rsc" in request.headers(),
    );

    await answer(page, "Birch Hollow", "Yes").click();

    await refreshed;
    await expect(alertWith(page, MAY_HAVE_SAVED)).toBeVisible();
    await expect(answer(page, "Birch Hollow", "Yes")).toBeEnabled();
    await expect(answer(page, "Birch Hollow", "Yes")).toBeFocused();
    expect(await reactionsOf(childId)).toEqual([]);

    await page.unrouteAll();
    await answer(page, "Birch Hollow", "Yes").click();
    await expect(card(page, "Birch Hollow")).toHaveCount(0);
    expect(await reactionsOf(childId)).toHaveLength(1);
  });
});
