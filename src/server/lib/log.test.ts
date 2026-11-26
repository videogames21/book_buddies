import { afterEach, describe, expect, it, vi } from "vitest";
import { logUnexpectedError } from "./log";

describe("logUnexpectedError", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs the error ID, place but never the message", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const err = Object.assign(
      new Error(
        'E11000 duplicate key error dup key: { username: "invented_kid" }',
      ),
      {
        code: 11000,
      },
    );

    const errorId = logUnexpectedError("createChild", err);

    const line = String(spy.mock.calls[0]?.[0]);
    expect(line).toContain(errorId);
    expect(line).toContain("createChild");
    expect(line).not.toContain("11000");
    expect(line).not.toContain("invented_kid");
    expect(line).not.toContain("duplicate key");
  });

  it("logs a listed error name and code, which say what failed", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const err = Object.assign(new Error("connect failed"), {
      name: "MongoNetworkError",
      code: "ECONNREFUSED",
    });

    logUnexpectedError("health", err);

    expect(JSON.parse(String(spy.mock.calls[0]?.[0]))).toMatchObject({
      errorName: "MongoNetworkError",
      errorCode: "ECONNREFUSED",
    });
  });

  it("drops a name or code that is not listed", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const err = Object.assign(new Error("rejected"), {
      name: "invented_kid",
      code: "invented-parent@example.test",
    });

    logUnexpectedError("sendEmail", err);

    const line = String(spy.mock.calls[0]?.[0]);
    expect(line).not.toContain("invented");
    expect(line).not.toContain("errorName");
    expect(line).not.toContain("errorCode");
  });
});
