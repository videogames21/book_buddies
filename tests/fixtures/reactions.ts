import { ObjectId } from "mongodb";
import { getDb } from "@/server/lib/db";
import type {
  DeclineReason,
  Reaction,
} from "@/shared/recommendation/reactions";

// Invented recommendation reactions in the shape design/rec.md fixes (Data model), for
// tests that need a reaction history without going through the child's action.

export async function insertReaction(reaction: {
  childId: string;
  bookId: string;
  reaction: Reaction;
  declineReason?: DeclineReason;
  batchIds?: string[];
  reactedAt?: Date;
}): Promise<string> {
  const _id = new ObjectId();
  await getDb()
    .collection("recommendationReactions")
    .insertOne({
      _id,
      childId: reaction.childId,
      bookId: reaction.bookId,
      reaction: reaction.reaction,
      ...(reaction.declineReason && { declineReason: reaction.declineReason }),
      batchIds: (reaction.batchIds ?? []).map((id) => new ObjectId(id)),
      reactedAt: reaction.reactedAt ?? new Date("2026-11-26T12:00:00Z"),
    });
  return _id.toHexString();
}
