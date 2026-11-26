import { randomUUID } from "node:crypto";
import { ObjectId } from "mongodb";
import { getDb } from "@/server/lib/db";

// Invented recommendation batches in the shape design/rec.md fixes ("Rules quiz data").
// UC-REC-recommend-quiz-rules, which inserts them, is not built yet, so tests put them in
// directly. By default a pending batch created at `createdAt` with a 24-hour window.

export type FixtureBatch = {
  childId: string;
  bookIds: string[];
  status?: "pending" | "released" | "empty";
  createdAt?: Date;
  handoffDeadline?: Date;
  removedBookIds?: string[];
  releasedAt?: Date;
};

export const FIXTURE_CREATED_AT = new Date("2026-11-24T12:00:00Z");
export const FIXTURE_DEADLINE = new Date("2026-11-25T12:00:00Z");

export async function insertBatch(batch: FixtureBatch): Promise<string> {
  const _id = new ObjectId();
  await getDb()
    .collection("recommendationBatches")
    .insertOne({
      _id,
      requestId: randomUUID(),
      childId: batch.childId,
      source: "rules",
      status: batch.status ?? "pending",
      bookIds: batch.bookIds,
      createdAt: batch.createdAt ?? FIXTURE_CREATED_AT,
      handoffDeadline: batch.handoffDeadline ?? FIXTURE_DEADLINE,
      ...(batch.removedBookIds && { removedBookIds: batch.removedBookIds }),
      ...(batch.releasedAt && { releasedAt: batch.releasedAt }),
    });
  return _id.toHexString();
}
