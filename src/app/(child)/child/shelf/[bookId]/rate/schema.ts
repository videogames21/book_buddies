import { z } from "zod";
import { RATING_VALUES } from "@/server/shelf/shelf-collections";

// saveRating's input (§8.2.5). The child is the session's, so any other key, such as a
// childId, is stripped.
export const saveRatingSchema = z.object({
  bookId: z.string().min(1).max(100),
  rating: z.enum(RATING_VALUES),
});

/**
 * Which code a refused input gets (API contract): a missing, empty or oversized book ID
 * is answered like an unknown book, and anything else is 4a.
 */
export function refusalFor(
  error: z.ZodError,
): "NOT_RATABLE" | "INVALID_RATING" {
  return error.issues.some((issue) => issue.path[0] !== "rating")
    ? "NOT_RATABLE"
    : "INVALID_RATING";
}
