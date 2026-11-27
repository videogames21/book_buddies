import "server-only";
import type { ObjectId } from "mongodb";
import { getDb, type Tx } from "@/server/lib/db";
import type {
  DeclineReason,
  Reaction,
} from "@/shared/recommendation/reactions";
import { RECOMMENDATION_REACTIONS } from "./recommendation-reaction-schema";

// UC-REC-kid-review (design/rec.md, Components): the only code that touches
// `recommendationReactions` (§8.2.4). A reaction is one dated document per answer, kept
// as the recommender's input (Key decisions, "Reactions are kept as a dated history").

export type ReactionDocument = {
  _id: ObjectId;
  childId: string;
  bookId: string;
  reaction: Reaction;
  declineReason?: DeclineReason;
  /** The released batches the book was waiting in; empty for a suggestion alone. */
  batchIds: ObjectId[];
  reactedAt: Date;
};

function reactions() {
  return getDb().collection<ReactionDocument>(RECOMMENDATION_REACTIONS);
}

/**
 * This file's part of the §8.2.8 deletion contract: every reaction of the child. It is
 * in `child-deletion.ts`'s list (UC-PAR-delete-kid-account), and UC-PAR-delete-child-data
 * and the inactivity purge call it too.
 */
export async function deleteChildRecords(
  tx: Tx,
  childId: string,
): Promise<void> {
  await reactions().deleteMany({ childId }, { session: tx });
}
