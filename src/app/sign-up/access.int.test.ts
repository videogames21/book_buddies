import { ObjectId } from "mongodb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { insertConsentRecord } from "../../../tests/fixtures/family";
import {
  insertParent,
  insertUserWithRole,
} from "../../../tests/fixtures/users";
import { resetDatabase } from "../../../tests/integration/db";

vi.mock("@/server/identity-access/auth", () => ({ auth: vi.fn() }));

const { mustLeaveSignUp } = await import("./access");
const { auth } = await import("@/server/identity-access/auth");
const { resetClock, setClock } = await import("@/server/lib/clock");
const mockedAuth = vi.mocked(
  auth as unknown as () => Promise<{ user: { id: string } } | null>,
);
const signedInAs = (userId: string) => {
  mockedAuth.mockResolvedValue({ user: { id: userId } });
};

// The fixture's unconfirmed record has confirmBy 2026-10-15T12:00:00Z.
const BEFORE = new Date("2026-10-15T11:59:59Z");
const AT_DEADLINE = new Date("2026-10-15T12:00:00Z");

describe("who sees the /sign-up form (UC-PAR-onboarding 6a)", () => {
  beforeEach(resetDatabase);
  afterEach(() => {
    resetClock();
    mockedAuth.mockReset();
  });

  it("shows the form to a visitor who is not signed in", async () => {
    mockedAuth.mockResolvedValue(null);
    expect(await mustLeaveSignUp()).toBe(false);
  });

  it("shows the form to a Main Parent whose sign-up has expired", async () => {
    const parent = await insertParent({ parentRole: "main" });
    await insertConsentRecord(parent, false);
    signedInAs(parent.userId);
    setClock(() => AT_DEADLINE);
    expect(await mustLeaveSignUp()).toBe(false);
  });

  it("redirects a Main Parent still awaiting confirmation", async () => {
    const parent = await insertParent({ parentRole: "main" });
    await insertConsentRecord(parent, false);
    signedInAs(parent.userId);
    setClock(() => BEFORE);
    expect(await mustLeaveSignUp()).toBe(true);
  });

  it("redirects a confirmed Main Parent, even long after the deadline", async () => {
    const parent = await insertParent({ parentRole: "main" });
    await insertConsentRecord(parent, true);
    signedInAs(parent.userId);
    setClock(() => new Date("2027-01-01T00:00:00Z"));
    expect(await mustLeaveSignUp()).toBe(true);
  });

  it("redirects a Sub Parent of an expired family", async () => {
    const main = await insertParent({ parentRole: "main" });
    await insertConsentRecord(main, false);
    const sub = await insertParent({
      parentRole: "sub",
      familyId: new ObjectId(main.familyId),
    });
    signedInAs(sub.userId);
    setClock(() => AT_DEADLINE);
    expect(await mustLeaveSignUp()).toBe(true);
  });

  it("redirects a child or admin session", async () => {
    for (const role of ["child", "admin"] as const) {
      const user = await insertUserWithRole(role);
      signedInAs(user.userId);
      expect(await mustLeaveSignUp()).toBe(true);
    }
  });
});
