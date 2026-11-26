import { z } from "zod";
import { LENGTHS, MOODS } from "@/shared/catalog/tags";

/** Fixed OI-2 proposal. "any" is an answer, separate from missing input. */
export const quizAnswersSchema = z.strictObject({
  mood: z.enum([...MOODS, "any"]),
  length: z.enum([...LENGTHS, "any"]),
});

export const quizSubmissionSchema = quizAnswersSchema.extend({
  requestId: z.uuid(),
});

export type QuizAnswers = z.infer<typeof quizAnswersSchema>;
