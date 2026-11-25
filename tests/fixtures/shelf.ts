import { ObjectId } from "mongodb";
import { getDb } from "@/server/lib/db";
import type {
  RatingValue,
  ShelfCategory,
} from "@/server/shelf/shelf-collections";

// Invented shelf records for tests. Nothing in the app writes these yet (the kid-side
// SHLF use cases are not built), so tests put them in directly.

export async function insertShelfEntry(
  childId: string,
  bookId: string,
  category: ShelfCategory,
  movedAt = new Date("2026-11-01T12:00:00Z"),
) {
  await getDb()
    .collection("shelfEntries")
    .insertOne({ childId, bookId, category, movedAt });
}

export async function insertRating(
  childId: string,
  bookId: string,
  value: RatingValue,
) {
  await getDb()
    .collection("ratings")
    .insertOne({
      childId,
      bookId,
      value,
      ratedAt: new Date("2026-11-02T12:00:00Z"),
    });
}

export async function insertFinishConfirmation(
  childId: string,
  bookId: string,
) {
  await getDb()
    .collection("finishConfirmations")
    .insertOne({
      childId,
      bookId,
      confirmedByParentId: new ObjectId(),
      confirmedAt: new Date("2026-11-03T12:00:00Z"),
    });
}
