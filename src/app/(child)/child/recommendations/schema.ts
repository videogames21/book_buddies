import { z } from "zod";
import { DECLINE_REASONS, REACTIONS } from "@/shared/recommendation/reactions";

// reactToRecommendation's input (design/rec.md, Components; §8.2.5,
// BR-child-structured-responses). The child comes from the session, so an extra key,
// a child ID among them, is refused. A malformed book ID passes and is answered
// BOOK_NOT_IN_LIST, as an unknown one is.
export const reactToRecommendationSchema = z
  .strictObject({
    bookId: z.string().min(1).max(100),
    reaction: z.enum(REACTIONS),
    declineReason: z.enum(DECLINE_REASONS).optional(),
  })
  .refine(
    (input) =>
      input.declineReason === undefined || input.reaction === "notForMe",
    { message: "A decline reason goes only with Not for me." },
  );

export type ReactToRecommendationInput = z.infer<
  typeof reactToRecommendationSchema
>;
