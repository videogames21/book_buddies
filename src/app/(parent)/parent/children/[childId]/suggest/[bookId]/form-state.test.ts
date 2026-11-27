import { describe, expect, it } from "vitest";
import { initialFormState, toFormState } from "./form-state";

// What the suggest form shows after a submission (UC-PAR-suggest-book steps 3-4, 4a).

const refused = (code: string, errorId?: string) => ({
  ok: false as const,
  error: { code, message: `Message for ${code}`, ...(errorId && { errorId }) },
});

describe("toFormState", () => {
  it("starts editing with the warning the page found, and no note", () => {
    expect(initialFormState("onShelf")).toEqual({
      status: "editing",
      note: "",
      conflict: "onShelf",
      error: null,
    });
  });

  it("ends the form on ok", () => {
    expect(toFormState({ ok: true, data: null }, "A note", null)).toEqual({
      status: "done",
    });
  });

  it.each([
    ["ALREADY_SUGGESTED", "suggested"],
    ["ALREADY_RECOMMENDED", "recommended"],
    ["ALREADY_ON_SHELF", "onShelf"],
  ] as const)(
    "4a after the page loaded: %s shows the %s warning and keeps the note",
    (code, conflict) => {
      expect(toFormState(refused(code), "Keep me", null)).toEqual({
        status: "editing",
        note: "Keep me",
        conflict,
        error: null,
      });
    },
  );

  it("any other refusal keeps the note and the warning shown, and gives the message with its error ID", () => {
    expect(
      toFormState(refused("SAVE_FAILED", "err-1"), "Keep me", "suggested"),
    ).toEqual({
      status: "editing",
      note: "Keep me",
      conflict: "suggested",
      error: "Message for SAVE_FAILED (Error ID: err-1)",
    });
    expect(toFormState(refused("NOTE_TOO_LONG"), "x", null)).toMatchObject({
      error: "Message for NOTE_TOO_LONG",
    });
  });
});
