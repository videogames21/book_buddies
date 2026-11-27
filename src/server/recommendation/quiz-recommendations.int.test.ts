import { ObjectId } from "mongodb";
import { beforeEach, expect, it } from "vitest";
import { insertBook } from "../../../tests/fixtures/catalog";
import { insertReaction } from "../../../tests/fixtures/reactions";
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

it("uses the latest reaction per book: Yes and Maybe later raise its keys, a decline lowers that book and, by reason, its subjects or genres; another child's reactions count for nothing", async () => {
  await withTransaction((tx) =>
    insertChildIdentity(tx, { childId, age: 7, grade: "2" }),
  );
  await getDb().collection("readingProfiles").insertOne({
    childId,
    interests: [],
    favoriteBookIds: [],
    onboardingComplete: true,
    savedAt,
  });
  const book = (title: string, overrides: Record<string, unknown>) =>
    insertBook("active", title, overrides);
  const liked = await book("Liked", { genres: ["mystery"] });
  const later = await book("Later", { genres: ["adventure"] });
  const dinosaurs = await book("Dinosaurs", {
    genres: ["non-fiction"],
    subjects: ["dinosaurs"],
  });
  const animalStory = await book("Animal story", { genres: ["animal story"] });
  const fantasySpace = await book("Fantasy in space", {
    genres: ["fantasy"],
    subjects: ["space"],
  });
  const changedMind = await book("Changed mind", {
    genres: ["realistic fiction"],
  });
  const otherChildsPick = await book("Other child's pick", {
    genres: ["realistic fiction"],
    subjects: ["space"],
  });
  const nonFiction = await book("Plain non-fiction", {
    genres: ["non-fiction"],
  });
  for (const [bookId, reaction, declineReason, day] of [
    [liked, "yes", undefined, 20],
    [later, "maybeLater", undefined, 21],
    [dinosaurs, "notForMe", "notInterested", 22],
    [animalStory, "notForMe", "notInterested", 23],
    [fantasySpace, "notForMe", "notMyStyle", 24],
    // The later reaction is the one that counts.
    [changedMind, "yes", undefined, 18],
    [changedMind, "notForMe", undefined, 25],
  ] as const) {
    await insertReaction({
      childId,
      bookId,
      reaction,
      ...(declineReason ? { declineReason } : {}),
      reactedAt: new Date(`2026-11-${String(day)}T12:00:00Z`),
    });
  }
  await insertReaction({
    childId: otherChildId,
    bookId: otherChildsPick,
    reaction: "yes",
  });

  const result = await withTransaction((tx) =>
    rankQuizBooks(childId, anytime, tx),
  );

  // mystery +2, adventure +1, dinosaurs -2 (subjects first, so non-fiction stays 0),
  // animal story -2 (no subjects), fantasy -2 (space stays 0), each declined book a
  // further -2. Scores: liked 2, later 1, other child's pick and plain non-fiction 0,
  // changed mind -2, dinosaurs and fantasy in space -3, animal story -4. The batch
  // keeps the first six (the quiz's OI-2 limit), so a wrong weight moves a book across
  // that cut.
  const ranked = [
    liked,
    later,
    ...[otherChildsPick, nonFiction].sort(),
    changedMind,
    ...[dinosaurs, fantasySpace].sort(),
    animalStory,
  ];
  expect(result).toEqual({ outcome: "ranked", bookIds: ranked.slice(0, 6) });
});

it("a too-easy decline favors longer stories and a too-hard one quick reads", async () => {
  await withTransaction((tx) =>
    insertChildIdentity(tx, { childId, age: 7, grade: "2" }),
  );
  await getDb().collection("readingProfiles").insertOne({
    childId,
    interests: [],
    favoriteBookIds: [],
    onboardingComplete: true,
    savedAt,
  });
  const quick = await insertBook("active", "Quick", { length: "quick read" });
  const longer = await insertBook("active", "Longer", {
    length: "longer story",
  });
  const declined = await insertBook("blocked", "Declined, now blocked");

  await insertReaction({
    childId,
    bookId: declined,
    reaction: "notForMe",
    declineReason: "tooEasy",
  });
  await expect(
    withTransaction((tx) => rankQuizBooks(childId, anytime, tx)),
  ).resolves.toEqual({ outcome: "ranked", bookIds: [longer, quick] });

  await insertReaction({
    childId,
    bookId: declined,
    reaction: "notForMe",
    declineReason: "tooHard",
    reactedAt: new Date("2026-11-27T12:00:00Z"),
  });
  await expect(
    withTransaction((tx) => rankQuizBooks(childId, anytime, tx)),
  ).resolves.toEqual({ outcome: "ranked", bookIds: [quick, longer] });
});
