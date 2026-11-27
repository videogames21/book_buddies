// Part of the local demo harness: one invented child with books already on the shelf, so
// UC-SHLF-kid-view-shelf can be shown. Nothing in the app writes shelf entries,
// confirmations, ratings or finish notices yet, so they are written directly, into the
// demo's temporary database only. Run after the catalog seed.
import { randomUUID } from "node:crypto";
import { ObjectId } from "mongodb";

export async function seedDemoShelf(db, { familyId, parentId, passwordHash }) {
  const books = db.collection("books");
  const picked = await books
    .find({ status: "active" })
    .sort({ title: 1 })
    .limit(5)
    .toArray();
  if (picked.length < 5) throw new Error("The demo shelf needs five books.");
  const [rated, wanted, waiting, finished, removed] = picked;
  // The seed catalog fills no series name. A numbered title gives the demo one.
  const [seriesName, number] = rated.title.split(" #");
  if (number) {
    await books.updateOne({ _id: rated._id }, { $set: { seriesName } });
  }

  const now = new Date();
  const minutesAgo = (minutes) => new Date(now.getTime() - minutes * 60 * 1000);
  const childId = randomUUID();
  await db.collection("children").insertOne({
    _id: childId,
    familyId,
    nickname: "Comet",
    avatar: "2",
    createdAt: now,
  });
  await db
    .collection("childIdentities")
    .insertOne({ childId, age: 8, grade: "3", createdAt: now });
  await db.collection("users").insertOne({
    _id: new ObjectId(),
    role: "child",
    username: "demo_reader",
    passwordHash,
    childId,
    createdAt: now,
  });

  // Newest move first within a category. Maybe Later stays empty (3a).
  await db.collection("shelfEntries").insertMany(
    [
      [rated, "readingNow"],
      [wanted, "wantToRead"],
      [waiting, "finished"],
      [finished, "finished"],
    ].map(([book, category], index) => ({
      childId,
      bookId: book._id,
      category,
      movedAt: minutesAgo(index),
    })),
  );
  // The other finished book has neither record, so it awaits confirmation (3c).
  for (const [book, value] of [
    [rated, "lovedIt"],
    [finished, "likedIt"],
  ]) {
    const key = { childId, bookId: book._id };
    await db.collection("finishConfirmations").insertOne({
      ...key,
      confirmedByParentId: parentId,
      confirmedAt: now,
    });
    await db.collection("ratings").insertOne({ ...key, value, ratedAt: now });
  }
  await db.collection("childNotices").insertMany([
    {
      childId,
      kind: "book-removed",
      bookId: removed._id,
      createdAt: minutesAgo(1),
    },
    { childId, kind: "finish-declined", createdAt: now },
  ]);
}
