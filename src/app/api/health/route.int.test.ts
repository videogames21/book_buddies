import { Db } from "mongodb";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

/** The error lines the route logged, parsed. */
function captureLog() {
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  return () =>
    spy.mock.calls.map(
      ([line]) => JSON.parse(String(line)) as Record<string, string>,
    );
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("GET /api/health", () => {
  it("answers 200 with the database time when the database answers", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = (await response.json()) as { data: { databaseMs: number } };
    expect(body).toMatchObject({ ok: true, data: { commit: null } });
    expect(body.data.databaseMs).toBeGreaterThanOrEqual(0);
  });

  it("answers 503 with the ID of the log line when the database fails, and no detail", async () => {
    vi.spyOn(Db.prototype, "command").mockRejectedValue(
      Object.assign(new Error("connect ECONNREFUSED db.example.test"), {
        name: "MongoServerSelectionError",
      }),
    );
    const log = captureLog();

    const response = await GET();

    expect(response.status).toBe(503);
    const text = await response.text();
    expect(text).not.toContain("example.test");
    expect(log()).toMatchObject([
      { where: "health", errorName: "MongoServerSelectionError" },
    ]);
    expect(JSON.parse(text)).toEqual({
      ok: false,
      error: {
        code: "UNHEALTHY",
        message: "The service is unavailable.",
        errorId: log()[0]?.errorId,
      },
    });
  });

  it("answers 503 and names the error when the configuration is invalid", async () => {
    vi.stubEnv("AUTH_SECRET", "");
    // The config is cached once read, so load the route again.
    vi.resetModules();
    const route = await import("./route");
    const log = captureLog();

    const response = await route.GET();

    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("AUTH_SECRET");
    expect(log()).toMatchObject([
      { where: "health", errorName: "ConfigError" },
    ]);
  });

  it("answers 503 when the database does not answer in time", async () => {
    vi.spyOn(Db.prototype, "command").mockReturnValue(new Promise(() => {}));
    const log = captureLog();

    const response = await GET();

    expect(response.status).toBe(503);
    expect(log()).toMatchObject([
      { where: "health", errorName: "HealthTimeoutError" },
    ]);
  });
});
