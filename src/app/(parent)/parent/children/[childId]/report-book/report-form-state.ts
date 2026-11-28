import {
  firstErrorCode,
  REPORT_BOOK_INPUT_MESSAGES,
  reportFormSchema,
} from "./schema";

// The report form's screens and what moves between them (UC-PAR-report-book steps 3 to
// 8, 3a, 5a, 7a, 7c), kept pure so it is tested without a browser. No transition here
// sends anything: the form calls the action only on "Confirm", and feeds the answer back
// in as a `result` event. The draft travels through every screen, so going back or a
// failed save never loses the parent's input (ROB-no-data-loss).

export type ReportDraft = { reason: string; comment: string };

export type ShownError = { message: string; errorId?: string };

export type ReportFormState =
  | { screen: "form"; draft: ReportDraft; error: ShownError | null }
  | { screen: "confirm"; draft: ReportDraft; error: ShownError | null }
  | { screen: "sent" }
  /** The report cannot go on from here; the message says why, with a way back. */
  | { screen: "stopped"; reason: StopReason; error: ShownError };

export type StopReason = "alreadyReported" | "outcomeUnknown" | "refused";

export type ActionAnswer =
  | { ok: true }
  | { ok: false; error: { code: string; message: string; errorId?: string } };

export type ReportFormEvent =
  | { type: "edit"; draft: ReportDraft }
  | { type: "continue" }
  | { type: "back" }
  | { type: "result"; answer: ActionAnswer };

export const INITIAL_REPORT_FORM: ReportFormState = {
  screen: "form",
  draft: { reason: "", comment: "" },
  error: null,
};

/** Codes the parent fixes on the form itself. */
const FORM_CODES = new Set([
  "REASON_REQUIRED",
  "INVALID_REASON",
  "COMMENT_TOO_LONG",
]);

function shown(error: { message: string; errorId?: string }): ShownError {
  return error.errorId
    ? { message: error.message, errorId: error.errorId }
    : { message: error.message };
}

function afterAnswer(
  draft: ReportDraft,
  answer: ActionAnswer,
): ReportFormState {
  if (answer.ok) return { screen: "sent" }; // step 8
  const { code } = answer.error;
  // 7a: the save failed and nothing was kept, so the parent may confirm again.
  if (code === "SAVE_FAILED") {
    return { screen: "confirm", draft, error: shown(answer.error) };
  }
  if (FORM_CODES.has(code)) {
    return { screen: "form", draft, error: shown(answer.error) };
  }
  if (code === "ALREADY_REPORTED") {
    return {
      screen: "stopped",
      reason: "alreadyReported",
      error: shown(answer.error),
    };
  }
  // The report may have been saved; the parent checks the shelf before trying again.
  if (code === "OUTCOME_UNKNOWN") {
    return {
      screen: "stopped",
      reason: "outcomeUnknown",
      error: shown(answer.error),
    };
  }
  return { screen: "stopped", reason: "refused", error: shown(answer.error) };
}

export function reportFormReducer(
  state: ReportFormState,
  event: ReportFormEvent,
): ReportFormState {
  switch (event.type) {
    case "edit":
      return state.screen === "form"
        ? { screen: "form", draft: event.draft, error: null }
        : state;
    case "continue": {
      // Step 4, and 3a: the form does not continue without a valid reason.
      if (state.screen !== "form") return state;
      const parsed = reportFormSchema.safeParse(state.draft);
      if (!parsed.success) {
        const code = firstErrorCode(parsed.error);
        return {
          screen: "form",
          draft: state.draft,
          error: { message: REPORT_BOOK_INPUT_MESSAGES[code] },
        };
      }
      return { screen: "confirm", draft: state.draft, error: null };
    }
    case "back":
      // 5a: back to the form with the reason and comment kept.
      return state.screen === "confirm"
        ? { screen: "form", draft: state.draft, error: null }
        : state;
    case "result":
      return state.screen === "confirm"
        ? afterAnswer(state.draft, event.answer)
        : state;
  }
}

/** The action's input for "Confirm" (step 6). Only the confirmation screen sends. */
export function confirmedInput(
  state: ReportFormState,
  childId: string,
  bookId: string,
) {
  if (state.screen !== "confirm") return null;
  return {
    childId,
    bookId,
    reason: state.draft.reason,
    comment: state.draft.comment,
    confirmed: true as const,
  };
}
