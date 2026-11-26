"use server";

import { requireChild } from "@/server/identity-access/sessions";
import { fail } from "@/server/lib/action-result";
import { getPrivacyNoticeUrl } from "@/server/lib/config";
import {
  startRulesQuiz,
  submitRulesQuiz,
} from "@/server/recommendation/quiz-submission";
import { quizSubmissionSchema } from "@/shared/recommendation/quiz";

export async function startRecommendationQuiz() {
  const session = await requireChild();
  if (!session.ok) return session;
  // Refuse direct action calls if the production privacy notice is unconfigured.
  getPrivacyNoticeUrl();
  return startRulesQuiz(session.data.childId);
}

export async function submitRecommendationQuiz(input: unknown) {
  const session = await requireChild();
  if (!session.ok) return session;
  const submission = quizSubmissionSchema.safeParse(input);
  if (!submission.success)
    return fail("INVALID_QUIZ", "Choose one answer for each question.");
  // Apply the same privacy-notice check when submitting a quiz.
  getPrivacyNoticeUrl();
  return submitRulesQuiz(session.data.childId, submission.data);
}
