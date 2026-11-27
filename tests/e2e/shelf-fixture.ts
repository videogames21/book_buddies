import { randomUUID } from "node:crypto";
import { e2eDb } from "./session-fixture";

// Invented catalog books and shelf entries for the child's browser tests. Nothing in the
// app writes a shelf entry yet.

export async function addBook(
  title: unknown,
  extra: Record<string, unknown> = {},
) {
  const _id = randomUUID();
  const db = await e2eDb();
  await db
    .collection<{ _id: string; [field: string]: unknown }>("books")
    .insertOne(
      {
        _id,
        title,
        author: "A. Writer",
        matchKey: `shelf-e2e-${_id}`,
        year: 2001,
        genres: ["fantasy"],
        moods: ["calm"],
        format: "picture book",
        length: "quick read",
        ageMin: 6,
        ageMax: 8,
        readingChallenge: "reading independently",
        readingLevel: "650L",
        status: "active",
        createdAt: new Date(),
        ...extra,
      },
      { bypassDocumentValidation: true },
    );
  return _id;
}

export async function shelve(
  childId: string,
  bookId: string,
  category: string,
) {
  const db = await e2eDb();
  await db
    .collection("shelfEntries")
    .insertOne({ childId, bookId, category, movedAt: new Date() });
}
