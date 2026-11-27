import { expect, test } from "@playwright/test";
import { ObjectId } from "mongodb";
import {
  closeE2eDb,
  e2eDb,
  signInChild,
  signInWithRole,
} from "./session-fixture";
import { addBook, shelve } from "./shelf-fixture";

test.afterAll(closeE2eDb);

test("a reported book disappears from the child's shelf after a confirmed admin block", async ({
  browser,
  context,
  page,
}) => {
  const title = "Paper Planets";
  const bookId = await addBook(title);
  const childContext = await browser.newContext();
  try {
    const { childId } = await signInChild(childContext);
    await shelve(childId, bookId, "readingNow");
    await (await e2eDb()).collection("bookReports").insertOne({
      bookId,
      childId,
      reportedByUserId: new ObjectId(),
      reason: "other",
      comment: "Private report comment",
      status: "open",
      reportedAt: new Date(),
    });
    const child = await childContext.newPage();
    await child.goto("/child/shelf");
    await expect(child.getByRole("button", { name: title })).toBeVisible();

    await signInWithRole(context, "admin");
    await page.goto("/admin/reports");
    await page.getByRole("link", { name: title }).click();
    await expect(page.getByText("Private report comment")).toHaveCount(0);
    await expect(page.getByText(/1 shelf entries/)).toBeVisible();
    const block = page.getByRole("button", { name: "Block book", exact: true });
    await page.getByLabel("Reason").selectOption("content concern");
    const form = page.locator("form").filter({ has: block });
    await form.getByLabel("Confirm this decision").check();
    await block.click();
    await expect(page).toHaveURL(/\/admin\/reports\?decision=blocked$/);
    await expect(page.getByRole("status")).toHaveText("Book blocked.");
    await expect(page.getByRole("link", { name: title })).toHaveCount(0);

    await child.reload();
    await expect(child).toHaveURL(/\/child\/shelf$/);
    await expect(child.getByRole("button", { name: title })).toHaveCount(0);
  } finally {
    await childContext.close();
  }
});
