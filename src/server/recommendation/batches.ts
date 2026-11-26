import "server-only";
import { getDb, type Tx } from "@/server/lib/db";
import { RECOMMENDATION_BATCHES } from "./batch-schema";

// Recommendation's batches (design/rec.md, UC-REC-parent-review). The only code that
// touches `recommendationBatches`.

/**
 * UC-PAR-delete-kid-account: every batch of the child, whatever its status. Joins
 * DELETE_CHILD_RECORDS in child-deletion.ts once #125 merges.
 */
export async function deleteChildRecords(
  tx: Tx,
  childId: string,
): Promise<void> {
  await getDb()
    .collection(RECOMMENDATION_BATCHES)
    .deleteMany({ childId }, { session: tx });
}
