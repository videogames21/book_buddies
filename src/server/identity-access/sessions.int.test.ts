import { beforeEach, describe, expect, it, vi } from "vitest";
import { insertParent, insertUserWithRole } from "../../../tests/fixtures/users";
import { resetDatabase } from "../../../tests/integration/db";

vi.mock("./auth", () => ({ auth: vi.fn() }));

const { auth } = await import("./auth");
const { requireParent } = await import("./sessions");
const mockedAuth = vi.mocked(auth as unknown as () => Promise<{ user: { id: string } } | null>);

function signInAs(userId: string | null) {
  mockedAuth.mockResolvedValue(userId ? { user: { id: userId } } : null);
}

describe("requireParent", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("returns the Main Parent's user, family and role from the session", async () => {
    const parent = await insertParent({ parentRole: "main" });
    signInAs(parent.userId);
    expect(await requireParent()).toEqual({
      ok: true,
      data: { userId: parent.userId, familyId: parent.familyId, parentRole: "main" },
    });
  });

  it("returns a Sub Parent with the sub role", async () => {
    const parent = await insertParent({ parentRole: "sub" });
    signInAs(parent.userId);
    const result = await requireParent();
    expect(result.ok && result.data.parentRole).toBe("sub");
  });

  it("refuses a request with no session", async () => {
    signInAs(null);
    expect(await requireParent()).toMatchObject({ ok: false, error: { code: "NOT_SIGNED_IN" } });
  });

  it.each(["child", "admin"] as const)("refuses a %s session", async (role) => {
    const user = await insertUserWithRole(role);
    signInAs(user.userId);
    expect(await requireParent()).toMatchObject({ ok: false, error: { code: "NOT_A_PARENT" } });
  });
});
