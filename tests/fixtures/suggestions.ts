import { ObjectId } from "mongodb";
import { getDb } from "@/server/lib/db";

// An invented parent suggestion in the `parentSuggestions` shape (design/par.md, Data
// model), for tests that need one stored before the code under test runs.
export async function insertSuggestion(
  childId: string,
  bookId: string,
  overrides: { note?: string; suggestedAt?: Date } = {},
) {
  const _id = new ObjectId();
  await getDb()
    .collection("parentSuggestions")
    .insertOne({
      _id,
      childId,
      bookId,
      ...(overrides.note ? { note: overrides.note } : {}),
      suggestedAt: overrides.suggestedAt ?? new Date("2026-11-20T12:00:00Z"),
    });
  return _id;
}
