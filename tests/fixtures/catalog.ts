import { randomUUID } from "node:crypto";
import type { Document } from "mongodb";
import { getDb } from "@/server/lib/db";

// Invented fixture books in the Catalog's `books` shape (design/adm.md, Data model).
// The collection's validator requires every field below, so a fixture carries them all.

export type FixtureBookStatus = "draft" | "active" | "blocked";

export async function insertBook(
  status: FixtureBookStatus,
  title = "Moon Garden",
  overrides: Record<string, unknown> = {},
) {
  const _id = randomUUID();
  await getDb()
    .collection<{ _id: string } & Document>("books")
    .insertOne({
      _id,
      title,
      author: "A. Writer",
      // Unique per fixture, so two fixtures never collide on the matchKey index.
      matchKey: `${title.toLowerCase()}a writer${_id}`,
      year: 2001,
      genres: ["fantasy"],
      moods: ["calm"],
      format: "picture book",
      length: "quick read",
      ageMin: 6,
      ageMax: 8,
      readingChallenge: "reading independently",
      status,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      ...overrides,
    });
  return _id;
}
