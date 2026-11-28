// The remove form's steps (UC-SHLF-parent-remove-book steps 3 to 6, 3b, 5a, 5d), kept
// pure so they are tested without a browser. No step sends anything: the form calls the
// action on "Remove" and feeds the answer back as a `result` event. "Cancel" is a link
// back to the shelf, not a step (3a).

export type ShownError = { message: string; errorId?: string };

export type StopReason =
  "alreadyOffShelf" | "outcomeUnknown" | "consentNotConfirmed" | "refused";

export type RemoveState =
  | { step: "confirm"; error: ShownError | null }
  | { step: "pending" }
  | { step: "removed" }
  /** The removal cannot go on from here; the only way on is back to the shelf. */
  | { step: "stopped"; reason: StopReason; error: ShownError };

export type ActionAnswer =
  | { ok: true }
  | { ok: false; error: { code: string; message: string; errorId?: string } };

export type RemoveEvent =
  { type: "remove" } | { type: "result"; answer: ActionAnswer };

export const INITIAL_REMOVE_STATE: RemoveState = {
  step: "confirm",
  error: null,
};

const STOP_REASONS: Record<string, StopReason> = {
  ALREADY_OFF_SHELF: "alreadyOffShelf",
  OUTCOME_UNKNOWN: "outcomeUnknown",
  CONSENT_NOT_CONFIRMED: "consentNotConfirmed",
};

function shown(error: { message: string; errorId?: string }): ShownError {
  return error.errorId
    ? { message: error.message, errorId: error.errorId }
    : { message: error.message };
}

function afterAnswer(answer: ActionAnswer): RemoveState {
  if (answer.ok) return { step: "removed" }; // step 6
  // 5a: nothing was saved, so the parent may remove again (ROB-no-data-loss).
  if (answer.error.code === "SAVE_FAILED") {
    return { step: "confirm", error: shown(answer.error) };
  }
  return {
    step: "stopped",
    reason: STOP_REASONS[answer.error.code] ?? "refused",
    error: shown(answer.error),
  };
}

export function nextRemoveState(
  state: RemoveState,
  event: RemoveEvent,
): RemoveState {
  switch (event.type) {
    case "remove":
      // Step 4. A second "Remove" while pending changes nothing.
      return state.step === "confirm" ? { step: "pending" } : state;
    case "result":
      return state.step === "pending" ? afterAnswer(event.answer) : state;
  }
}
