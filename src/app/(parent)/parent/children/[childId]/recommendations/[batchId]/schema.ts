import { z } from "zod";

// The schemas of the batch page's two actions (UC-REC-parent-review; §8.2.5). They check
// shape only: each ID is a non-empty string of at most 100 characters, so a malformed ID
// passes here and is answered by Recommendation like an unknown one (CHILD_NOT_FOUND,
// then BATCH_NOT_FOUND), never by a validation error that would say which IDs exist.

const id = z
  .string({ error: "INVALID_INPUT" })
  .min(1, "INVALID_INPUT")
  .max(100, "INVALID_INPUT");

export const confirmBatchSchema = z.object({ childId: id, batchId: id });
export const removeBookSchema = confirmBatchSchema.extend({ bookId: id });

export const INVALID_INPUT_MESSAGE =
  "Something went wrong. Reload the page and try again.";

/** The page this batch is reviewed on, which both actions revalidate. */
export function batchReviewPath(childId: string, batchId: string): string {
  return `/parent/children/${childId}/recommendations/${batchId}`;
}
