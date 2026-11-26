import "server-only";
import { MongoServerError } from "mongodb";
import {
  getFamilyIdForChild,
  isConsentConfirmed,
  lockChildForWrite,
} from "@/server/accounts-family/child-accounts";
import { lockConsentForWrite } from "@/server/accounts-family/families";
import {
  getQuizCatalogGuard,
  type QuizCatalogGuard,
} from "@/server/catalog/rule-candidates";
import { getRuleQuizProfile } from "@/server/child-identity/child-identity";
import { fail, ok, type ActionResult } from "@/server/lib/action-result";
import { getConfig, getRecommenderMode } from "@/server/lib/config";
import { withTransaction } from "@/server/lib/db";
import { logSecurityEvent, logUnexpectedError } from "@/server/lib/log";
import type { QuizSubmission } from "@/shared/recommendation/quiz";
import {
  hasQuizBatch,
  insertQuizBatch,
  type QuizBatchLookup,
  releaseExpiredBatchInTx,
} from "./batches";
import { rankQuizBooks } from "./quiz-recommendations";

type QuizCode =
  | "CHILD_NOT_FOUND"
  | "CONSENT_NOT_CONFIRMED"
  | "RULES_UNAVAILABLE"
  | "PROFILE_INCOMPLETE"
  | "NO_MATCHES"
  | "LOAD_FAILED"
  | "SAVE_FAILED";

const messages: Record<QuizCode, string> = {
  CHILD_NOT_FOUND: "Ask a parent for help signing in again.",
  CONSENT_NOT_CONFIRMED:
    "Ask a parent for help before getting recommendations.",
  RULES_UNAVAILABLE: "Recommendations aren’t available right now.",
  PROFILE_INCOMPLETE: "Ask a parent to finish your profile.",
  NO_MATCHES: "We couldn’t find books for those choices. Try the quiz again.",
  LOAD_FAILED: "We couldn’t load your picks. Try sending your choices again.",
  SAVE_FAILED:
    "We couldn’t check if that saved. Try sending your choices again.",
};

class QuizRefusal extends Error {
  constructor(readonly code: QuizCode) {
    super(code);
  }
}

function refuse<Code extends QuizCode>(code: Code, errorId?: string) {
  return fail(code, messages[code], errorId);
}

function logProfileIncomplete() {
  logSecurityEvent("recommendation-request-failed", "PROFILE_INCOMPLETE");
}

export function isRulesQuizAvailable(): boolean {
  return (
    getRecommenderMode() === "rules" && getQuizCatalogGuard() !== undefined
  );
}

export async function readRulesQuiz(
  childId: string,
  lookup?: QuizBatchLookup,
): Promise<ActionResult<"open" | "received", QuizCode>> {
  try {
    const familyId = await getFamilyIdForChild(childId);
    if (!familyId) return refuse("CHILD_NOT_FOUND");
    if (!(await isConsentConfirmed(familyId)))
      return refuse("CONSENT_NOT_CONFIRMED");
    if (await hasQuizBatch(childId, undefined, lookup)) return ok("received");
    if (!isRulesQuizAvailable()) return refuse("RULES_UNAVAILABLE");
    if (!(await getRuleQuizProfile(childId)))
      return refuse("PROFILE_INCOMPLETE");
    return ok("open");
  } catch (err) {
    return refuse("LOAD_FAILED", logUnexpectedError("readRulesQuiz", err));
  }
}

export async function startRulesQuiz(childId: string) {
  const result = await readRulesQuiz(childId);
  if (!result.ok && result.error.code === "PROFILE_INCOMPLETE")
    logProfileIncomplete();
  return result;
}

/** The action supplies only the authenticated child. Tests may supply a fixture guard. */
export async function submitRulesQuiz(
  childId: string,
  submission: QuizSubmission,
  catalogGuard: QuizCatalogGuard | undefined = getQuizCatalogGuard(),
): Promise<ActionResult<null, QuizCode>> {
  const lookup: QuizBatchLookup = {
    requestId: submission.requestId,
    includePending: true,
  };
  if (!catalogGuard || getRecommenderMode() !== "rules") {
    const status = await readRulesQuiz(childId, lookup);
    if (!status.ok) return status;
    return status.data === "received" ? ok(null) : refuse("RULES_UNAVAILABLE");
  }

  const attempt: { stage: "load" | "save" } = { stage: "load" };
  try {
    return await withTransaction(async (tx) => {
      attempt.stage = "load";
      if (!(await lockChildForWrite(tx, childId)))
        throw new QuizRefusal("CHILD_NOT_FOUND");
      const familyId = await getFamilyIdForChild(childId, tx);
      if (!familyId) throw new QuizRefusal("CHILD_NOT_FOUND");
      if (!(await lockConsentForWrite(tx, familyId)))
        throw new QuizRefusal("CONSENT_NOT_CONFIRMED");
      if (await hasQuizBatch(childId, tx, lookup)) return ok(null);

      const ranking = await rankQuizBooks(childId, submission, tx);
      if (ranking.outcome === "profileIncomplete")
        throw new QuizRefusal("PROFILE_INCOMPLETE");
      if (ranking.outcome !== "ranked") throw new QuizRefusal("NO_MATCHES");

      const { BATCH_REVIEW_WINDOW_HOURS } = getConfig();
      attempt.stage = "save";
      if (!(await catalogGuard(tx, ranking.bookIds)))
        throw new QuizRefusal("SAVE_FAILED");

      await releaseExpiredBatchInTx(tx, childId);
      await insertQuizBatch(
        tx,
        childId,
        submission.requestId,
        ranking.bookIds,
        BATCH_REVIEW_WINDOW_HOURS,
      );
      return ok(null);
    });
  } catch (err) {
    if (err instanceof QuizRefusal) {
      if (err.code === "PROFILE_INCOMPLETE") logProfileIncomplete();
      return refuse(err.code);
    }
    if (err instanceof MongoServerError && err.code === 11000) {
      const keys = Object.keys(
        (err.keyPattern ?? {}) as Record<string, unknown>,
      );
      const pendingIndex = keys.length === 1 && keys.includes("childId");
      const requestIndex =
        keys.length === 2 &&
        keys.includes("childId") &&
        keys.includes("requestId");
      if (pendingIndex || requestIndex) {
        const status = await readRulesQuiz(
          childId,
          requestIndex ? { ...lookup, includePending: false } : undefined,
        );
        if (status.ok && status.data === "received") return ok(null);
        if (!status.ok && status.error.code === "CONSENT_NOT_CONFIRMED")
          return status;
      }
    }
    return refuse(
      attempt.stage === "save" ? "SAVE_FAILED" : "LOAD_FAILED",
      logUnexpectedError("submitRulesQuiz", err),
    );
  }
}
