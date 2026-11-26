import { beforeAll, describe, expect, it, vi } from "vitest";
import type { AuthOptions } from "next-auth";

// design/shlf.md, Tests, "Sign-in, parent sessions unchanged": the child session rules
// live in childSessionEnds, so no Auth.js setting changes for either role.

const received = vi.hoisted(() => [] as AuthOptions[]);
vi.mock("next-auth", () => ({
  getServerSession: (options: AuthOptions) => {
    received.push(options);
    return Promise.resolve(null);
  },
}));
vi.mock("next/headers", () => ({ cookies: () => Promise.resolve({}) }));

const { auth } = await import("./auth");

describe("auth()", () => {
  beforeAll(async () => {
    await auth();
  });

  it("keeps database sessions with the 30 day lifetime and sets no updateAge", () => {
    expect(received[0]?.session).toEqual({
      strategy: "database",
      maxAge: 30 * 24 * 60 * 60,
    });
  });

  it("passes on only the user's ID, so a child session carries no name", () => {
    const callback = received[0]?.callbacks?.session as unknown as (args: {
      session: object;
      user: object;
    }) => unknown;
    expect(
      callback({
        session: { expires: "2026-12-20T00:00:00.000Z" },
        user: { id: "invented-id", username: "reader_one", childId: "child" },
      }),
    ).toEqual({
      expires: "2026-12-20T00:00:00.000Z",
      user: { id: "invented-id" },
    });
  });
});
