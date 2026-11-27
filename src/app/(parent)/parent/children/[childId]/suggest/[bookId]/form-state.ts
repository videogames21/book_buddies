import type { ActionResult } from "@/server/lib/action-result";
import type { SuggestionConflict } from "@/server/accounts-family/suggestions";

// What the suggest form shows after a submission (UC-PAR-suggest-book steps 3-4, 4a).
// Pure, so it is unit-tested apart from the action and the form. The note is carried
// back in the state so a refused or failed submission keeps it, also without
// JavaScript; it travels only in the POST and its response, never in a URL.

export type SuggestFormState =
  | { status: "done" }
  | {
      status: "editing";
      note: string;
      /** 4a: shown before the parent confirms, and the button reads "Suggest anyway". */
      conflict: SuggestionConflict | null;
      error: string | null;
    };

export function initialFormState(
  conflict: SuggestionConflict | null,
): SuggestFormState {
  return { status: "editing", note: "", conflict, error: null };
}

const CONFLICT_FROM_CODE: Partial<Record<string, SuggestionConflict>> = {
  ALREADY_SUGGESTED: "suggested",
  ALREADY_RECOMMENDED: "recommended",
  ALREADY_ON_SHELF: "onShelf",
};

/**
 * `ok` ends the form. A conflict code means the state changed after the page loaded: warn,
 * keep the note and offer "Suggest anyway". Any other refusal keeps the note and the
 * warning already shown, and shows the message (with the error ID when there is one).
 */
export function toFormState(
  result: ActionResult<null>,
  note: string,
  shownConflict: SuggestionConflict | null,
): SuggestFormState {
  if (result.ok) return { status: "done" };
  const conflict = CONFLICT_FROM_CODE[result.error.code];
  if (conflict) return { status: "editing", note, conflict, error: null };
  return {
    status: "editing",
    note,
    conflict: shownConflict,
    error: result.error.errorId
      ? `${result.error.message} (Error ID: ${result.error.errorId})`
      : result.error.message,
  };
}
