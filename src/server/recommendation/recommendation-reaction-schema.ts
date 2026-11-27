import "server-only";
import type { Db } from "mongodb";
import { ensureCollection } from "@/server/lib/collections";
import { DECLINE_REASONS, REACTIONS } from "@/shared/recommendation/reactions";

// The schema of Recommendation's `recommendationReactions` (UC-REC-kid-review;
// design/rec.md, Data model). Kept apart from reactions.ts so the index setup script,
// which runs outside Next.js, loads no session code (as batch-schema.ts does).

export const RECOMMENDATION_REACTIONS = "recommendationReactions";

export async function ensureRecommendationReactionIndexes(
  db: Db,
): Promise<void> {
  // That `declineReason` appears only with `notForMe` is the zod schema's check (§8.2.5).
  await ensureCollection(db, RECOMMENDATION_REACTIONS, {
    bsonType: "object",
    required: ["_id", "childId", "bookId", "reaction", "batchIds", "reactedAt"],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      childId: { bsonType: "string", minLength: 1 },
      bookId: { bsonType: "string", minLength: 1 },
      reaction: { enum: [...REACTIONS] },
      declineReason: { enum: [...DECLINE_REASONS] },
      // The released batches the book was waiting in; empty for a suggestion alone.
      batchIds: { bsonType: "array", items: { bsonType: "objectId" } },
      reactedAt: { bsonType: "date" },
    },
  });
  // No unique index: the child lock serializes reactions (design/rec.md, Key decisions).
  const reactions = db.collection(RECOMMENDATION_REACTIONS);
  // The quiz's reader and the export.
  await reactions.createIndex(
    { childId: 1, reactedAt: 1 },
    { name: "childId_reactedAt" },
  );
  // The child's recommendation list.
  await reactions.createIndex(
    { childId: 1, batchIds: 1 },
    { name: "childId_batchIds" },
  );
}
