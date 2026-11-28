import { describe, expect, it } from "vitest";
import { REPORT_COMMENT_MAX_LENGTH } from "@/shared/accounts-family/book-report";
import { REPORT_BOOK_INPUT_MESSAGES } from "../../../report-book/schema";
import {
  confirmedInput,
  INITIAL_REPORT_FORM,
  reportFormReducer as reduce,
  type ReportFormState,
} from "./report-form-state";

// UC-PAR-report-book 3a, 5a, 7a, 7c and the outcome-unknown answer, on the form's
// screens. Invented values only.

const draft = { reason: "too-difficult", comment: "Hard words" };
const onForm: ReportFormState = { screen: "form", draft, error: null };
const onConfirm: ReportFormState = { screen: "confirm", draft, error: null };
const refused = (code: string, errorId?: string) => ({
  type: "result" as const,
  answer: {
    ok: false as const,
    error: {
      code,
      message: `message for ${code}`,
      ...(errorId ? { errorId } : {}),
    },
  },
});

describe("reportFormReducer (UC-PAR-report-book)", () => {
  it("starts on the form with nothing chosen", () => {
    expect(INITIAL_REPORT_FORM).toEqual({
      screen: "form",
      draft: { reason: "", comment: "" },
      error: null,
    });
  });

  it("step 4: Continue with a reason shows the confirmation", () => {
    expect(reduce(onForm, { type: "continue" })).toEqual(onConfirm);
  });

  it("3a: Continue without a reason stays on the form with an error, and the input is kept", () => {
    const noReason: ReportFormState = {
      screen: "form",
      draft: { reason: "", comment: "Kept" },
      error: null,
    };
    const next = reduce(noReason, { type: "continue" });
    expect(next).toMatchObject({
      screen: "form",
      draft: { reason: "", comment: "Kept" },
      error: { message: "Please choose a reason." },
    });
  });

  it("the form does not continue with a comment over the limit", () => {
    const long: ReportFormState = {
      screen: "form",
      draft: {
        reason: "other",
        comment: "a".repeat(REPORT_COMMENT_MAX_LENGTH + 1),
      },
      error: null,
    };
    expect(reduce(long, { type: "continue" }).screen).toBe("form");
  });

  it("the comment limit counts emoji as one character each, so the textarea sets no cap of its own", () => {
    const emoji = "📚".repeat(REPORT_COMMENT_MAX_LENGTH);
    const atLimit: ReportFormState = {
      screen: "form",
      draft: { reason: "other", comment: emoji },
      error: null,
    };
    expect(reduce(atLimit, { type: "continue" })).toEqual({
      ...atLimit,
      screen: "confirm",
    });
    const over: ReportFormState = {
      screen: "form",
      draft: { reason: "other", comment: `${emoji}📚` },
      error: null,
    };
    expect(reduce(over, { type: "continue" })).toEqual({
      ...over,
      error: { message: REPORT_BOOK_INPUT_MESSAGES.COMMENT_TOO_LONG },
    });
  });

  it("editing clears an earlier error", () => {
    const withError = reduce(
      { screen: "form", draft: { reason: "", comment: "" }, error: null },
      { type: "continue" },
    );
    expect(reduce(withError, { type: "edit", draft })).toEqual(onForm);
  });

  it("5a: Go back returns to the form with the reason and comment kept", () => {
    expect(reduce(onConfirm, { type: "back" })).toEqual(onForm);
  });

  it("5a: no transition but Confirm yields an action input", () => {
    expect(confirmedInput(onForm, "c", "b")).toBeNull();
    expect(
      confirmedInput(reduce(onConfirm, { type: "back" }), "c", "b"),
    ).toBeNull();
    expect(confirmedInput(onConfirm, "c", "b")).toEqual({
      childId: "c",
      bookId: "b",
      reason: "too-difficult",
      comment: "Hard words",
      confirmed: true,
    });
  });

  it("step 8: an ok answer shows the sent screen", () => {
    expect(reduce(onConfirm, { type: "result", answer: { ok: true } })).toEqual(
      { screen: "sent" },
    );
  });

  it("7a: SAVE_FAILED stays on the confirmation with the error ID, and the input is kept", () => {
    expect(reduce(onConfirm, refused("SAVE_FAILED", "id-1"))).toEqual({
      screen: "confirm",
      draft,
      error: { message: "message for SAVE_FAILED", errorId: "id-1" },
    });
  });

  it("7c: ALREADY_REPORTED stops the report", () => {
    expect(reduce(onConfirm, refused("ALREADY_REPORTED"))).toMatchObject({
      screen: "stopped",
      reason: "alreadyReported",
    });
  });

  it("OUTCOME_UNKNOWN stops the report, so the parent checks the shelf before trying again", () => {
    expect(reduce(onConfirm, refused("OUTCOME_UNKNOWN", "id-2"))).toEqual({
      screen: "stopped",
      reason: "outcomeUnknown",
      error: { message: "message for OUTCOME_UNKNOWN", errorId: "id-2" },
    });
  });

  it("a validation code from the server returns to the form with the input kept", () => {
    expect(reduce(onConfirm, refused("COMMENT_TOO_LONG"))).toMatchObject({
      screen: "form",
      draft,
    });
  });

  it("other refusals stop the report with the server's message", () => {
    for (const code of [
      "CONSENT_NOT_CONFIRMED",
      "NOT_ON_SHELF_OR_BATCH",
      "BOOK_NOT_FOUND",
      "CHILD_NOT_FOUND",
      "NOT_SIGNED_IN",
    ]) {
      expect(reduce(onConfirm, refused(code))).toEqual({
        screen: "stopped",
        reason: "refused",
        error: { message: `message for ${code}` },
      });
    }
  });

  it("events that do not belong to the current screen change nothing", () => {
    expect(reduce(onForm, { type: "back" })).toBe(onForm);
    expect(reduce(onForm, refused("SAVE_FAILED"))).toBe(onForm);
    expect(reduce(onConfirm, { type: "continue" })).toBe(onConfirm);
    expect(reduce(onConfirm, { type: "edit", draft })).toBe(onConfirm);
  });
});
