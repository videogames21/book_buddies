import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { expect, it } from "vitest";

it("runs the deployment setup command twice without duplicate-index failures", async () => {
  const run = promisify(execFile);
  for (let attempt = 0; attempt < 2; attempt++) {
    const { stdout } = await run(
      process.execPath,
      ["--conditions=react-server", "scripts/ensure-indexes.mjs"],
      { env: process.env },
    );
    expect(stdout).toContain("collections and indexes are ready");
  }
});

it("creates readingProfiles with a unique childId index and a validator", async () => {
  const { getDb } = await import("@/server/lib/db");
  const { ensureIndexes } = await import("@/server/setup/ensure-indexes");
  await ensureIndexes(getDb());
  const profiles = getDb().collection("readingProfiles");
  const indexes = await profiles.indexes();
  expect(
    indexes.find((index) => index.name === "childId_unique"),
  ).toMatchObject({ key: { childId: 1 }, unique: true });
  // The backstop rejects a document that stores a child detail (KD-pii-segregation).
  await expect(
    profiles.insertOne({
      childId: "c",
      interests: [],
      favoriteBookIds: [],
      onboardingComplete: true,
      savedAt: new Date(),
      age: 8,
    }),
  ).rejects.toThrow();
  await profiles.deleteMany({});
});

// UC-ADM-add-content, "Schema validator": the MongoDB backstop for the `books` collection.
it("validates books and keeps the two unique indexes", async () => {
  const { getDb } = await import("@/server/lib/db");
  const { ensureIndexes } = await import("@/server/setup/ensure-indexes");
  const { insertBook } = await import("../fixtures/catalog");
  await ensureIndexes(getDb());
  const books = getDb().collection("books");
  await books.deleteMany({});

  const indexes = await books.indexes();
  expect(indexes.find((i) => i.name === "matchKey_unique")).toMatchObject({
    key: { matchKey: 1 },
    unique: true,
  });
  expect(indexes.find((i) => i.name === "isbn_unique")).toMatchObject({
    key: { isbn: 1 },
    unique: true,
    partialFilterExpression: { isbn: { $type: "string" } },
  });

  // A book with no isbn field is accepted, and two of them do not collide.
  await insertBook("draft", "No ISBN One");
  await insertBook("draft", "No ISBN Two");

  // Each of these is refused by MongoDB, not by application code.
  await expect(
    insertBook("draft", "Bad", { status: "live" }),
  ).rejects.toThrow();
  await expect(insertBook("draft", "Bad", { genres: [] })).rejects.toThrow();
  await expect(insertBook("draft", "Bad", { moods: [] })).rejects.toThrow();
  await expect(
    insertBook("draft", "Bad", { isbn: "123456789012" }),
  ).rejects.toThrow();
  await expect(
    insertBook("draft", "Bad", { title: undefined }),
  ).rejects.toThrow();

  // The validator does not check tag values, so adding one to tags.ts needs no collMod.
  await insertBook("draft", "Unlisted Tag", { genres: ["a-new-genre"] });
  await books.deleteMany({});
});

it("accepts an admin's catalog audit entry with a book ID and no childId", async () => {
  const { getDb } = await import("@/server/lib/db");
  const { ensureIndexes } = await import("@/server/setup/ensure-indexes");
  const { ObjectId } = await import("mongodb");
  await ensureIndexes(getDb());
  const audit = getDb().collection("auditLog");
  await expect(
    audit.insertOne({
      actorId: new ObjectId(),
      actorRole: "admin",
      event: "catalog.book_added",
      recordId: "6b0f2c6e-0f3c-4b5e-9d51-0c2d5e1a7a11",
      occurredAt: new Date(),
    }),
  ).resolves.toBeTruthy();
  await audit.deleteMany({});
});
