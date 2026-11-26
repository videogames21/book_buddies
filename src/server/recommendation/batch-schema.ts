import "server-only";
import type { Db } from "mongodb";
import { ensureCollection } from "@/server/lib/collections";

// The schema of Recommendation's `recommendationBatches` (design/rec.md, "Rules quiz
// data" and the UC-REC-parent-review data model). UC-REC-parent-review is built before
// UC-REC-recommend-quiz-rules (developer decision 2026-11-25), so the collection is
// created here; the quiz's insert, ranking and pages are not. Kept apart from batches.ts
// so the index setup script, which runs outside Next.js, loads no session code (as
// book-report-schema.ts does).

export const RECOMMENDATION_BATCHES = "recommendationBatches";

/** `pending` from the quiz's insert; `released` and `empty` from parent review. */
export const BATCH_STATUSES = ["pending", "released", "empty"] as const;
export type BatchStatus = (typeof BATCH_STATUSES)[number];

/** The only source in V1; `UC-REC-recommend-quiz-ai` adds its own when it is designed. */
export const BATCH_SOURCES = ["rules"] as const;
export type BatchSource = (typeof BATCH_SOURCES)[number];

/** One open batch per child (the quiz's "Retry the same request" decision). */
export const PENDING_BATCH_UNIQUE_INDEX = "childId_pending_unique";
/** A retried request finds its own batch. */
export const REQUEST_UNIQUE_INDEX = "childId_requestId_unique";

export async function ensureRecommendationBatchIndexes(db: Db): Promise<void> {
  await ensureCollection(db, RECOMMENDATION_BATCHES, {
    bsonType: "object",
    required: [
      "_id",
      "requestId",
      "childId",
      "source",
      "status",
      "bookIds",
      "createdAt",
      "handoffDeadline",
    ],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      requestId: { bsonType: "string", minLength: 1 },
      childId: { bsonType: "string", minLength: 1 },
      source: { enum: [...BATCH_SOURCES] },
      status: { enum: [...BATCH_STATUSES] },
      // Ordered by rank at insert; a removal may leave it empty (4a). The six-book
      // maximum is the quiz's OI-2 constant, so the validator sets none.
      bookIds: { bsonType: "array", items: { bsonType: "string" } },
      createdAt: { bsonType: "date" },
      handoffDeadline: { bsonType: "date" },
      removedBookIds: { bsonType: "array", items: { bsonType: "string" } },
      releasedAt: { bsonType: "date" },
    },
  });
  const batches = db.collection(RECOMMENDATION_BATCHES);
  await batches.createIndex(
    { childId: 1, requestId: 1 },
    { unique: true, name: REQUEST_UNIQUE_INDEX },
  );
  await batches.createIndex(
    { childId: 1 },
    {
      unique: true,
      name: PENDING_BATCH_UNIQUE_INDEX,
      partialFilterExpression: { status: "pending" },
    },
  );
  // The family's pending list, the review read and the child's released read.
  await batches.createIndex(
    { childId: 1, status: 1, createdAt: 1 },
    { name: "childId_status_createdAt" },
  );
}
