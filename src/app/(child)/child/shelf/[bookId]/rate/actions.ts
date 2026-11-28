"use server";

import { revalidatePath } from "next/cache";
import {
  requireChild,
  type ChildSessionErrorCode,
} from "@/server/identity-access/sessions";
import { fail, type ActionResult } from "@/server/lib/action-result";
import { logUnexpectedError } from "@/server/lib/log";
import { recordRating, type RatingErrorCode } from "@/server/shelf/ratings";
import type { RatingValue } from "@/server/shelf/shelf-collections";
import { CHILD_SHELF_PATH } from "../../../paths";
import { refusalFor, saveRatingSchema } from "./schema";

export type SaveRatingCode =
  ChildSessionErrorCode | RatingErrorCode | "INVALID_RATING";

/** After a save, so Back to the shelf shows the new rating. A failure is only logged. */
function revalidateShelf(): void {
  try {
    revalidatePath(CHILD_SHELF_PATH);
  } catch (err) {
    logUnexpectedError("revalidateChildShelfAfterRating", err);
  }
}

/**
 * UC-SHLF-kid-rate-book steps 3 to 5 (§8.2.3): the session, then validation, then Shelf.
 * The child comes from the session, never the request.
 */
export async function saveRating(
  input: unknown,
): Promise<ActionResult<{ rating: RatingValue }, SaveRatingCode>> {
  try {
    const session = await requireChild();
    if (!session.ok) return session;

    const parsed = saveRatingSchema.safeParse(input);
    if (!parsed.success) {
      return refusalFor(parsed.error) === "NOT_RATABLE"
        ? fail("NOT_RATABLE", "This book can’t be rated right now.")
        : // 4a: off the scale, absent or not a string. Nothing is written.
          fail("INVALID_RATING", "Choose one of the four.");
    }

    const result = await recordRating(session.data, parsed.data);
    if (result.ok) revalidateShelf();
    return result;
  } catch (err) {
    return fail(
      "SAVE_FAILED",
      "That didn’t save. Tap your choice again.",
      logUnexpectedError("saveRating", err),
    );
  }
}
