"use server";

import { revalidatePath } from "next/cache";
import {
  requireChild,
  type ChildSessionErrorCode,
} from "@/server/identity-access/sessions";
import { fail, type ActionResult } from "@/server/lib/action-result";
import { logUnexpectedError } from "@/server/lib/log";
import {
  recordReaction,
  type RecordReactionCode,
  type ShelfOutcome,
} from "@/server/recommendation/reactions";
import { CHILD_RECOMMENDATIONS_PATH, CHILD_SHELF_PATH } from "../paths";
import { reactToRecommendationSchema } from "./schema";

export type ReactToRecommendationCode =
  ChildSessionErrorCode | "INVALID_INPUT" | RecordReactionCode;

/** The results after which the list and the shelf may have changed (design/rec.md, Components). */
const REVALIDATE_ON: ReadonlySet<ReactToRecommendationCode> = new Set([
  "OUTCOME_UNKNOWN",
  "BOOK_NOT_IN_LIST",
]);

/**
 * Runs after the save, so a failure is only logged: the result stands, and the client
 * refreshes on any unconfirmed outcome anyway.
 */
function revalidateListAndShelf(): void {
  for (const path of [CHILD_RECOMMENDATIONS_PATH, CHILD_SHELF_PATH]) {
    try {
      revalidatePath(path);
    } catch (err) {
      logUnexpectedError("revalidateRecommendationReaction", err);
    }
  }
}

/**
 * UC-REC-kid-review steps 3–7, 4a, 6a and 7a (design/rec.md, API contract): the
 * child's Yes, Maybe later or Not for me. The child is the session's, never the
 * request's (§8.1). Order (§8.2.3): session, zod, then Recommendation.
 */
export async function reactToRecommendation(
  input: unknown,
): Promise<ActionResult<{ shelf: ShelfOutcome }, ReactToRecommendationCode>> {
  const session = await requireChild();
  if (!session.ok) return session;
  const parsed = reactToRecommendationSchema.safeParse(input);
  if (!parsed.success) {
    return fail("INVALID_INPUT", "That didn’t work. Try again.");
  }
  const result = await recordReaction(session.data, parsed.data);
  if (result.ok || REVALIDATE_ON.has(result.error.code)) {
    revalidateListAndShelf();
  }
  return result;
}
