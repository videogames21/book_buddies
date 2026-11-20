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

it("creates the three shelf collections with a unique childId and bookId index", async () => {
  const { getDb } = await import("@/server/lib/db");
  const { ensureIndexes } = await import("@/server/setup/ensure-indexes");
  await ensureIndexes(getDb());
  for (const name of ["shelfEntries", "ratings", "finishConfirmations"]) {
    const indexes = await getDb().collection(name).indexes();
    expect(
      indexes.find((index) => index.name === "childId_bookId_unique"),
      name,
    ).toMatchObject({ key: { childId: 1, bookId: 1 }, unique: true });
  }
});

it("refuses a second shelf entry, rating or confirmation for the same child and book", async () => {
  const { getDb } = await import("@/server/lib/db");
  const { ObjectId } = await import("mongodb");
  const { ensureIndexes } = await import("@/server/setup/ensure-indexes");
  await ensureIndexes(getDb());
  const when = new Date("2026-11-01T12:00:00Z");
  const entry = {
    childId: "c1",
    bookId: "b1",
    category: "wantToRead",
    movedAt: when,
  };
  const rating = {
    childId: "c1",
    bookId: "b1",
    value: "lovedIt",
    ratedAt: when,
  };
  const confirmation = {
    childId: "c1",
    bookId: "b1",
    confirmedByParentId: new ObjectId(),
    confirmedAt: when,
  };
  const cases = [
    ["shelfEntries", entry],
    ["ratings", rating],
    ["finishConfirmations", confirmation],
  ] as const;
  for (const [name, doc] of cases) {
    const collection = getDb().collection(name);
    await collection.deleteMany({});
    await collection.insertOne({ ...doc });
    await expect(collection.insertOne({ ...doc }), name).rejects.toThrow();
    await collection.deleteMany({});
  }
});

it("rejects a shelf document that holds a child detail or an unknown value (KD-pii-segregation)", async () => {
  const { getDb } = await import("@/server/lib/db");
  const { ObjectId } = await import("mongodb");
  const { ensureIndexes } = await import("@/server/setup/ensure-indexes");
  await ensureIndexes(getDb());
  const when = new Date("2026-11-01T12:00:00Z");
  const bad = [
    [
      "shelfEntries",
      {
        childId: "c",
        bookId: "b",
        category: "finished",
        movedAt: when,
        nickname: "Starfish",
      },
    ],
    [
      "shelfEntries",
      { childId: "c", bookId: "b", category: "favorites", movedAt: when },
    ],
    [
      "ratings",
      { childId: "c", bookId: "b", value: "five stars", ratedAt: when },
    ],
    [
      "ratings",
      { childId: "c", bookId: "b", value: "lovedIt", ratedAt: when, age: 8 },
    ],
    [
      "finishConfirmations",
      {
        childId: "c",
        bookId: "b",
        confirmedByParentId: "a parent",
        confirmedAt: when,
      },
    ],
    [
      "finishConfirmations",
      {
        childId: "c",
        bookId: "b",
        confirmedByParentId: new ObjectId(),
        confirmedAt: when,
        note: "free text",
      },
    ],
  ] as const;
  for (const [name, doc] of bad) {
    await expect(
      getDb()
        .collection(name)
        .insertOne({ ...doc }),
      `${name}: ${JSON.stringify(doc)}`,
    ).rejects.toThrow();
  }
});
