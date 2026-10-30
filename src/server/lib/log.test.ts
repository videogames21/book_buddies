import { afterEach, describe, expect, it, vi } from "vitest";
import { logUnexpectedError } from "./log";

describe("logUnexpectedError", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs the error ID, place, class and code but never the message", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const err = Object.assign(new Error('E11000 duplicate key error dup key: { username: "invented_kid" }'), {
      code: 11000,
    });

    const errorId = logUnexpectedError("createChild", err);

    const line = String(spy.mock.calls[0]?.[0]);
    expect(line).toContain(errorId);
    expect(line).toContain("createChild");
    expect(line).toContain("11000");
    expect(line).not.toContain("invented_kid");
    expect(line).not.toContain("duplicate key");
  });
});
