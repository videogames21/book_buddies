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
    const books = db.collection<{ _id: string; writeVersion?: number }>(
      "books",
    );
    const versionsBefore = new Map(
      (await books.find({}, { projection: { writeVersion: 1 } }).toArray()).map(
        ({ _id, writeVersion }) => [_id, writeVersion ?? 0],
      ),
    );

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
    const selectedIds = batch?.bookIds ?? [];
    expect(selectedIds.length).toBeGreaterThan(0);
    // Other tests seed eligible books too. The guard must write every pick.
    const selectedBooks = await books
      .find({ _id: { $in: selectedIds } }, { projection: { writeVersion: 1 } })
      .toArray();
    expect(selectedBooks).toHaveLength(selectedIds.length);
    for (const { _id, writeVersion } of selectedBooks) {
      expect(writeVersion).toBe((versionsBefore.get(_id) ?? 0) + 1);
    }
  } finally {
    await db.collection<{ _id: string }>("books").deleteOne({ _id: bookId });
    await db.collection("recommendationBatches").deleteMany({ childId });
  }
});
