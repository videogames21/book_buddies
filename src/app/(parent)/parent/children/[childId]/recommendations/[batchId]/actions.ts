"use server";

import { revalidatePath } from "next/cache";
import {
  requireParent,
  type SessionErrorCode,
} from "@/server/identity-access/sessions";
import { fail, type ActionResult } from "@/server/lib/action-result";
import { logUnexpectedError } from "@/server/lib/log";
import {
  confirmBatch as confirmStoredBatch,
  removeBookFromBatch as removeStoredBook,
  type BatchActionCode,
  type RemoveBookCode,
} from "@/server/recommendation/batches";
import {
  batchReviewPath,
  confirmBatchSchema,
  INVALID_INPUT_MESSAGE,
  removeBookSchema,
} from "./schema";

// UC-REC-parent-review steps 4-6 (design/rec.md, API contract). In order (§8.2.3): the
// session, then the zod shape, then Recommendation, which checks the child against the
// session's family and the family's consent. The family never comes from the request.

const SAVE_FAILED_MESSAGE =
  "We couldn't save that. Nothing changed, and nothing was sent to your child. Please try again.";

function revalidate(childId: string, batchId: string): void {
  revalidatePath(batchReviewPath(childId, batchId));
  revalidatePath("/parent");
}

/** Step 4: remove one book, saved at once. */
export async function removeBookFromBatch(
  input: unknown,
): Promise<
  ActionResult<null, SessionErrorCode | "INVALID_INPUT" | RemoveBookCode>
> {
  try {
    const session = await requireParent();
    if (!session.ok) return session;
    const parsed = removeBookSchema.safeParse(input);
    if (!parsed.success) return fail("INVALID_INPUT", INVALID_INPUT_MESSAGE);
    const removed = await removeStoredBook(session.data, parsed.data);
    if (removed.ok) revalidate(parsed.data.childId, parsed.data.batchId);
    return removed;
  } catch (err) {
    return fail(
      "SAVE_FAILED",
      SAVE_FAILED_MESSAGE,
      logUnexpectedError("removeBookFromBatchAction", err),
    );
  }
}

/** Steps 5-6 and 4a: confirm, which releases the batch to the child. */
export async function confirmBatch(
  input: unknown,
): Promise<
  ActionResult<
    { state: "released" | "empty" },
    SessionErrorCode | "INVALID_INPUT" | BatchActionCode
  >
> {
  try {
    const session = await requireParent();
    if (!session.ok) return session;
    const parsed = confirmBatchSchema.safeParse(input);
    if (!parsed.success) return fail("INVALID_INPUT", INVALID_INPUT_MESSAGE);
    const confirmed = await confirmStoredBatch(session.data, parsed.data);
    if (confirmed.ok) revalidate(parsed.data.childId, parsed.data.batchId);
    return confirmed;
  } catch (err) {
    return fail(
      "SAVE_FAILED",
      SAVE_FAILED_MESSAGE,
      logUnexpectedError("confirmBatchAction", err),
    );
  }
}
