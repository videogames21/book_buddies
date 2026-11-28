import { MongoServerError } from "mongodb";
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

  it("logs the code name of a database server error, but not its message", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const err = new MongoServerError({
      message: "Authentication failed for invented_user",
      code: 18,
      codeName: "AuthenticationFailed",
    });

    logUnexpectedError("health", err);

    const line = String(spy.mock.calls[0]?.[0]);
    expect(JSON.parse(line)).toMatchObject({
      errorName: "MongoServerError",
      errorCodeName: "AuthenticationFailed",
    });
    expect(line).not.toContain("invented_user");
  });

  it("drops a name, code or code name that is not listed", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const err = Object.assign(new Error("rejected"), {
      name: "invented_kid",
      code: "invented-parent@example.test",
      codeName: "invented_nickname",
    });

    logUnexpectedError("sendEmail", err);

    const line = String(spy.mock.calls[0]?.[0]);
    expect(line).not.toContain("invented");
    expect(line).not.toContain("errorName");
    expect(line).not.toContain("errorCode");
  });
});
