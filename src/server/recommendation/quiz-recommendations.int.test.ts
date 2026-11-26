import { ObjectId } from "mongodb";
import { beforeEach, expect, it } from "vitest";
import { insertBook } from "../../../tests/fixtures/catalog";
import { resetDatabase } from "../../../tests/integration/db";
import { insertParentNote } from "@/server/accounts-family/parent-notes";
import { insertChildIdentity } from "@/server/child-identity/child-identity";
import { getDb, withTransaction } from "@/server/lib/db";
import { rankQuizBooks } from "./quiz-recommendations";

const childId = "invented-quiz-child";
const otherChildId = "invented-other-child";
const anytime = { mood: "any", length: "any" } as const;
const savedAt = new Date("2026-11-26T06:00:00Z");

beforeEach(resetDatabase);

it("uses the child's retained signals and excludes reported or unavailable books", async () => {
  const animal = await insertBook("active", "Animal", {
    genres: ["animal story"],
  });
  const mystery = await insertBook("active", "Mystery", {
    genres: ["mystery"],
  });
  const fantasy = await insertBook("active", "Fantasy");
  const reported = await insertBook("active", "Reported", {
    genres: ["animal story"],
  });
  const blockedFavorite = await insertBook("blocked", "Blocked favorite", {
    genres: ["fantasy"],
  });
  await insertBook("draft", "Draft");
  const db = getDb();
  await db.collection("readingProfiles").insertOne({
    childId,
    interests: ["animals"],
    favoriteBookIds: [blockedFavorite],
    onboardingComplete: true,
    savedAt,
  });
  await db.collection("childBookExclusions").insertOne({
    childId,
    bookId: reported,
    reportId: new ObjectId(),
    createdAt: savedAt,
  });
  await db.collection("shelfEntries").insertOne({
    childId,
    bookId: mystery,
    category: "readingNow",
    movedAt: savedAt,
  });
  await db.collection("finishConfirmations").insertOne({
    childId,
    bookId: fantasy,
    confirmedByParentId: new ObjectId(),
    confirmedAt: savedAt,
  });
  await db.collection("ratings").insertMany([
    { childId, bookId: fantasy, value: "notForMe", ratedAt: savedAt },
    {
      childId: otherChildId,
      bookId: fantasy,
      value: "lovedIt",
      ratedAt: savedAt,
    },
  ]);

  const result = await withTransaction(async (tx) => {
    await insertChildIdentity(tx, { childId, age: 7, grade: "2" });
    await insertParentNote(tx, childId, "Mystery, not sciencefiction.", "none");
    return rankQuizBooks(childId, anytime, tx);
  });

  // Animals +2, mystery +1 from the shelf and +1 from the note,
  // fantasy +1 from a finished book and -1 from its rating.
  expect(result).toEqual({
    outcome: "ranked",
    bookIds: [...[animal, mystery].sort(), fantasy],
  });
});

it("treats missing profile details separately from missing optional signals and no matches", async () => {
  const book = await insertBook("active", "Calm pick");
  await expect(
    withTransaction((tx) => rankQuizBooks(childId, anytime, tx)),
  ).resolves.toEqual({ outcome: "profileIncomplete" });

  await withTransaction((tx) =>
    insertChildIdentity(tx, {
      childId,
      age: 7,
      grade: "2",
      readingLevel: { scale: "lexile", value: "BR200L" },
    }),
  );
  await expect(
    withTransaction((tx) => rankQuizBooks(childId, anytime, tx)),
  ).resolves.toEqual({ outcome: "ranked", bookIds: [book] });
  await expect(
    withTransaction((tx) =>
      rankQuizBooks(
        childId,
        {
          mood: "exciting",
          length: "any",
        },
        tx,
      ),
    ),
  ).resolves.toEqual({ outcome: "noMatches" });
});

it("returns only up to three recognized keys from the latest note", async () => {
  await getDb()
    .collection("parentNotes")
    .insertMany([
      { childId, text: "Vehicles", flag: "none", savedAt },
      {
        childId,
        text: "Fantasyland. Animal stories, animals, science & technology, sports.",
        flag: "none",
        savedAt: new Date(savedAt.getTime() + 1),
      },
      { childId: otherChildId, text: "Adventure", flag: "none", savedAt },
    ]);
  const { listLatestNoteInterestKeys } =
    await import("@/server/accounts-family/parent-notes");
  await expect(listLatestNoteInterestKeys(childId)).resolves.toEqual([
    "animal story",
    "animals",
    "science & technology",
  ]);
});
