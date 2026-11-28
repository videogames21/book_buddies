import { describe, expect, it } from "vitest";
import {
  INITIAL_REMOVE_STATE,
  nextRemoveState,
  type ActionAnswer,
  type RemoveState,
} from "./remove-state";

// design/shlf.md, Tests, "3, form steps" for UC-SHLF-parent-remove-book.

const pending: RemoveState = { step: "pending" };
const answer = (code: string, message = code, errorId?: string) =>
  ({
    type: "result",
    answer: {
      ok: false,
      error: errorId ? { code, message, errorId } : { code, message },
    } satisfies ActionAnswer,
  }) as const;

describe("nextRemoveState (UC-SHLF-parent-remove-book)", () => {
  it("step 3 to 4: Remove moves the confirmation to pending, and a second Remove changes nothing", () => {
    const once = nextRemoveState(INITIAL_REMOVE_STATE, { type: "remove" });
    expect(once).toEqual(pending);
    expect(nextRemoveState(once, { type: "remove" })).toBe(once);
  });

  it("step 6: ok gives the result", () => {
    expect(
      nextRemoveState(pending, { type: "result", answer: { ok: true } }),
    ).toEqual({ step: "removed" });
  });

  it("3b: ALREADY_OFF_SHELF gives the off-shelf message", () => {
    expect(
      nextRemoveState(pending, answer("ALREADY_OFF_SHELF", "Already off")),
    ).toEqual({
      step: "stopped",
      reason: "alreadyOffShelf",
      error: { message: "Already off" },
    });
  });

  it("5a: SAVE_FAILED returns to the confirmation with Nothing was saved, so the parent can retry", () => {
    const failed = nextRemoveState(
      pending,
      answer("SAVE_FAILED", "Nothing was saved. Please try again.", "e-1"),
    );
    expect(failed).toEqual({
      step: "confirm",
      error: {
        message: "Nothing was saved. Please try again.",
        errorId: "e-1",
      },
    });
    expect(nextRemoveState(failed, { type: "remove" })).toEqual(pending);
  });

  it("5a: OUTCOME_UNKNOWN gives the check-the-shelf message, from which Remove does nothing", () => {
    const unknown = nextRemoveState(
      pending,
      answer("OUTCOME_UNKNOWN", "Check the shelf", "e-2"),
    );
    expect(unknown).toEqual({
      step: "stopped",
      reason: "outcomeUnknown",
      error: { message: "Check the shelf", errorId: "e-2" },
    });
    expect(nextRemoveState(unknown, { type: "remove" })).toBe(unknown);
  });

  it("5d: CONSENT_NOT_CONFIRMED gives the consent message", () => {
    expect(
      nextRemoveState(pending, answer("CONSENT_NOT_CONFIRMED")),
    ).toMatchObject({ step: "stopped", reason: "consentNotConfirmed" });
  });

  it("any other refusal stops with its message, and a result outside pending is ignored", () => {
    expect(nextRemoveState(pending, answer("CHILD_NOT_FOUND"))).toMatchObject({
      step: "stopped",
      reason: "refused",
    });
    expect(
      nextRemoveState(INITIAL_REMOVE_STATE, {
        type: "result",
        answer: { ok: true },
      }),
    ).toBe(INITIAL_REMOVE_STATE);
  });
});
