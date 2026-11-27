import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import type { ObjectId } from "mongodb";
import {
  closeE2eDb,
  e2eDb,
  signInChild,
  signInParent,
} from "./session-fixture";
import { QUIZ_RECEIVED } from "../../src/shared/recommendation/quiz";

test.afterAll(closeE2eDb);

test("opening the quiz directly first requires a child session", async ({
  page,
}) => {
  await page.goto("/child/recommendations/quiz");
  await expect(page).toHaveURL(/\/child\/sign-in$/);
});

test("with the Catalog guard wired, a signed-in child takes the quiz and a batch goes to parent review (OI-58)", async ({
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
  // The age and grade the rules need, as createChildAccount leaves them.
  await db
    .collection("childIdentities")
    .insertOne({ childId, age: 7, grade: "2", createdAt: new Date() });
  const bookId = randomUUID();
  // Invented; the `books` validator requires every field below (design/adm.md).
  await db.collection("books").insertOne({
    _id: bookId as never,
    title: "Quiz Guard E2E",
    author: "A. Writer",
    matchKey: `quiz guard e2ea writer${bookId}`,
    year: 2001,
    genres: ["fantasy"],
    moods: ["calm"],
    format: "picture book",
    length: "quick read",
    ageMin: 6,
    ageMax: 8,
    readingChallenge: "reading independently",
    status: "active",
    createdAt: new Date(),
  });

  try {
    await page.goto("/child");
    await page.getByRole("button", { name: "Get recommendations" }).click();
    await expect(page).toHaveURL(/\/child\/recommendations\/quiz$/);
    await page.getByRole("radio", { name: "Any mood" }).check();
    await page.getByRole("radio", { name: "Any length" }).check();
    await page.getByRole("button", { name: "Send my choices" }).click();
    await expect(page.getByRole("status")).toHaveText(QUIZ_RECEIVED);

    const batch = await db
      .collection<{ bookIds: string[] }>("recommendationBatches")
      .findOne({ childId, status: "pending" });
    expect(batch?.bookIds).toContain(bookId);
    // The guard wrote the book in the save transaction.
    const book = await db
      .collection<{ _id: string; writeVersion?: number }>("books")
      .findOne({ _id: bookId });
    expect(book?.writeVersion).toBe(1);
  } finally {
    await db.collection<{ _id: string }>("books").deleteOne({ _id: bookId });
    await db.collection("recommendationBatches").deleteMany({ childId });
  }
});
