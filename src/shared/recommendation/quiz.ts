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

export type QuizSubmission = z.infer<typeof quizSubmissionSchema>;

export const QUIZ_LABELS = {
  mood: {
    "funny/silly": "Funny",
    exciting: "Exciting",
    heartwarming: "Heartwarming",
    "spooky-but-safe": "A little spooky",
    fascinating: "Fascinating",
    calm: "Calm",
    inspiring: "Inspiring",
    any: "Any mood",
  },
  length: {
    "quick read": "A quick read",
    "longer story": "A longer story",
    any: "Any length",
  },
} satisfies {
  [Question in keyof QuizAnswers]: Record<QuizAnswers[Question], string>;
};

export const QUIZ_RECEIVED =
  "Your recommendations were sent for parent review.";
