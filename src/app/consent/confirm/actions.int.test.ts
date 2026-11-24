import { Collection, ObjectId } from "mongodb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { insertConsentRecord } from "../../../../tests/fixtures/family";
import { insertParent } from "../../../../tests/fixtures/users";
import { resetDatabase } from "../../../../tests/integration/db";

vi.mock("@/server/identity-access/auth", () => ({ auth: vi.fn() }));

const { confirmConsent } = await import("./actions");
const { auth } = await import("@/server/identity-access/auth");
const { hashConfirmationToken } =
  await import("@/server/accounts-family/families");
const { getDb } = await import("@/server/lib/db");
const { resetClock, setClock } = await import("@/server/lib/clock");
const mockedAuth = vi.mocked(
  auth as unknown as () => Promise<{ user: { id: string } } | null>,
);

const TOKEN = "invented-confirmation-token";
// The fixture's unconfirmed record has confirmBy 2026-10-15T12:00:00Z.
const BEFORE = new Date("2026-10-10T12:00:00Z");
const AT_DEADLINE = new Date("2026-10-15T12:00:00Z");

const records = () => getDb().collection("consentRecords");
const recordOf = (familyId: string) =>
  records().findOne({ familyId: new ObjectId(familyId) });

async function seed() {
  const parent = await insertParent({ parentRole: "main" });
  await insertConsentRecord(parent, false);
  await records().updateOne(
    { familyId: new ObjectId(parent.familyId) },
    { $set: { confirmationTokenHash: hashConfirmationToken(TOKEN) } },
  );
  return parent;
}

describe("confirmConsent (UC-PAR-onboarding step 7)", () => {
  beforeEach(async () => {
    await resetDatabase();
    mockedAuth.mockResolvedValue(null);
    setClock(() => BEFORE);
  });
  afterEach(() => {
    resetClock();
    mockedAuth.mockReset();
  });

  it("sets confirmedAt once; the same link used again is ok and changes nothing", async () => {
    const parent = await seed();
    expect(await confirmConsent(TOKEN)).toEqual({
      ok: true,
      data: { next: "/sign-in" },
    });
    expect((await recordOf(parent.familyId))?.confirmedAt).toEqual(BEFORE);

    setClock(() => new Date("2026-10-12T12:00:00Z"));
    expect(await confirmConsent(TOKEN)).toMatchObject({ ok: true });
    expect((await recordOf(parent.familyId))?.confirmedAt).toEqual(BEFORE);
  });

  it("the same link still answers ok after the deadline once it has confirmed", async () => {
    const parent = await seed();
    await confirmConsent(TOKEN);
    setClock(() => AT_DEADLINE);
    expect(await confirmConsent(TOKEN)).toMatchObject({ ok: true });
    expect((await recordOf(parent.familyId))?.confirmedAt).toEqual(BEFORE);
  });

  it("two simultaneous confirmations both succeed and write one time", async () => {
    const parent = await seed();
    const results = await Promise.all([
      confirmConsent(TOKEN),
      confirmConsent(TOKEN),
    ]);
    expect(results.every((result) => result.ok)).toBe(true);
    expect((await recordOf(parent.familyId))?.confirmedAt).toEqual(BEFORE);
  });

  it("continues to the child form with this family's session", async () => {
    const parent = await seed();
    mockedAuth.mockResolvedValue({ user: { id: parent.userId } });
    expect(await confirmConsent(TOKEN)).toEqual({
      ok: true,
      data: { next: "/parent/children/new" },
    });
  });

  it("continues to sign-in with another family's session", async () => {
    await seed();
    const other = await insertParent({ parentRole: "main" });
    mockedAuth.mockResolvedValue({ user: { id: other.userId } });
    expect(await confirmConsent(TOKEN)).toEqual({
      ok: true,
      data: { next: "/sign-in" },
    });
  });

  it.each(["unknown-token", "", 42, null, "x".repeat(129)])(
    "refuses %s with LINK_INVALID and confirms nothing",
    async (token) => {
      const parent = await seed();
      expect(await confirmConsent(token)).toMatchObject({
        ok: false,
        error: { code: "LINK_INVALID" },
      });
      expect((await recordOf(parent.familyId))?.confirmedAt).toBeUndefined();
    },
  );

  it("6a: from the deadline on, returns LINK_EXPIRED and confirms nothing", async () => {
    const parent = await seed();
    setClock(() => AT_DEADLINE);
    expect(await confirmConsent(TOKEN)).toMatchObject({
      ok: false,
      error: { code: "LINK_EXPIRED" },
    });
    expect((await recordOf(parent.familyId))?.confirmedAt).toBeUndefined();
  });

  it("a revoked record is LINK_INVALID and stays unconfirmed", async () => {
    const parent = await seed();
    await records().updateOne(
      { familyId: new ObjectId(parent.familyId) },
      { $set: { revokedAt: BEFORE } },
    );
    expect(await confirmConsent(TOKEN)).toMatchObject({
      error: { code: "LINK_INVALID" },
    });
    expect((await recordOf(parent.familyId))?.confirmedAt).toBeUndefined();
  });

  it("a session failure after saving still reports confirmed", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const parent = await seed();
    mockedAuth.mockRejectedValue(new Error("session failure"));
    expect(await confirmConsent(TOKEN)).toMatchObject({ ok: true });
    expect((await recordOf(parent.familyId))?.confirmedAt).toEqual(BEFORE);
    vi.restoreAllMocks();
  });

  it("logs no token when saving fails unexpectedly", async () => {
    const lines: string[] = [];
    vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      lines.push(args.map(String).join(" "));
    });
    await seed();
    vi.spyOn(Collection.prototype, "findOneAndUpdate").mockRejectedValueOnce(
      new Error(`failed for ${TOKEN}`),
    );
    const result = await confirmConsent(TOKEN);
    vi.restoreAllMocks();
    expect(result).toMatchObject({ error: { code: "CONFIRM_FAILED" } });
    expect(JSON.stringify(result)).not.toContain(TOKEN);
    expect(lines.join("\n")).not.toContain(TOKEN);
  });
});
