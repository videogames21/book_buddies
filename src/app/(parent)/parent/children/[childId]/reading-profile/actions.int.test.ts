import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { insertBook } from "../../../../../../../tests/fixtures/catalog";
import { insertChild } from "../../../../../../../tests/fixtures/children";
import { insertConsentRecord } from "../../../../../../../tests/fixtures/family";
import {
  insertParent,
  insertUserWithRole,
} from "../../../../../../../tests/fixtures/users";
import { resetDatabase } from "../../../../../../../tests/integration/db";

vi.mock("@/server/identity-access/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/server/identity-access/auth");
const { getDb } = await import("@/server/lib/db");
const { saveReadingProfile } = await import("./actions");
const { onboardingCompletePath } = await import("./paths");

const mockedAuth = vi.mocked(
  auth as unknown as () => Promise<{ user: { id: string } } | null>,
);
const signInAs = (userId: string | null) =>
  mockedAuth.mockResolvedValue(userId ? { user: { id: userId } } : null);

// Invented data only.
async function consentedFamily(parentRole: "main" | "sub" = "main") {
  const parent = await insertParent({ parentRole });
  await insertConsentRecord(parent, true);
  const childId = await insertChild(parent.familyId);
  return { ...parent, childId };
}

const profiles = () => getDb().collection("readingProfiles");
const nothingSaved = async () => {
  expect(await profiles().countDocuments()).toBe(0);
};

describe("saveReadingProfile (UC-REC-kid-onboarding)", () => {
  beforeEach(async () => {
    await resetDatabase();
    mockedAuth.mockReset();
  });

  it("main: a parent of the family saves, and the result carries no profile data", async () => {
    const family = await consentedFamily();
    const bookId = await insertBook("active");
    signInAs(family.userId);

    const result = await saveReadingProfile({
      childId: family.childId,
      interests: ["fantasy"],
      favoriteBookIds: [bookId],
    });

    expect(result).toEqual({ ok: true, data: null });
    expect(await profiles().countDocuments({ childId: family.childId })).toBe(
      1,
    );
  });

  it("authorization: a Sub Parent of the family may save", async () => {
    const family = await consentedFamily("sub");
    signInAs(family.userId);

    const result = await saveReadingProfile({
      childId: family.childId,
      interests: [],
      favoriteBookIds: [],
    });

    expect(result.ok).toBe(true);
  });

  it("PRE-2: a parent of another family, and an unknown child, get CHILD_NOT_FOUND", async () => {
    const family = await consentedFamily();
    const other = await consentedFamily();
    signInAs(family.userId);

    for (const childId of [other.childId, "unknown-child"]) {
      const result = await saveReadingProfile({
        childId,
        interests: [],
        favoriteBookIds: [],
      });
      expect(result).toMatchObject({
        ok: false,
        error: { code: "CHILD_NOT_FOUND" },
      });
    }
    await nothingSaved();
  });

  it("authorization: signed out, a child session and an admin session are refused", async () => {
    const family = await consentedFamily();
    const input = {
      childId: family.childId,
      interests: [],
      favoriteBookIds: [],
    };

    signInAs(null);
    expect(await saveReadingProfile(input)).toMatchObject({
      error: { code: "NOT_SIGNED_IN" },
    });
    for (const role of ["child", "admin"] as const) {
      signInAs((await insertUserWithRole(role)).userId);
      expect(await saveReadingProfile(input)).toMatchObject({
        ok: false,
        error: { code: "NOT_A_PARENT" },
      });
    }
    await nothingSaved();
  });

  it("consent: unconfirmed, revoked or missing consent is CONSENT_NOT_CONFIRMED", async () => {
    const unconfirmed = await insertParent({ parentRole: "main" });
    await insertConsentRecord(unconfirmed, false);
    const revoked = await insertParent({ parentRole: "main" });
    await insertConsentRecord(revoked, true);
    await getDb()
      .collection("consentRecords")
      .updateOne(
        { familyId: new ObjectId(revoked.familyId) },
        { $set: { revokedAt: new Date("2026-10-02T12:00:00Z") } },
      );
    const missing = await insertParent({ parentRole: "main" });

    for (const parent of [unconfirmed, revoked, missing]) {
      const childId = await insertChild(parent.familyId);
      signInAs(parent.userId);
      const result = await saveReadingProfile({
        childId,
        interests: [],
        favoriteBookIds: [],
      });
      expect(result).toMatchObject({
        ok: false,
        error: { code: "CONSENT_NOT_CONFIRMED" },
      });
    }
    await nothingSaved();
  });

  it("check order: a foreign child with an invalid interest is CHILD_NOT_FOUND", async () => {
    const family = await consentedFamily();
    const other = await consentedFamily();
    signInAs(family.userId);

    const result = await saveReadingProfile({
      childId: other.childId,
      interests: ["not-an-interest"],
      favoriteBookIds: [],
    });

    expect(result).toMatchObject({ error: { code: "CHILD_NOT_FOUND" } });
  });

  it("check order: access is checked before validation for every session kind", async () => {
    signInAs(null);
    expect(
      await saveReadingProfile({
        childId: 5,
        interests: 7,
        favoriteBookIds: 9,
      }),
    ).toMatchObject({ error: { code: "NOT_SIGNED_IN" } });
    expect(await saveReadingProfile("not an object")).toMatchObject({
      error: { code: "NOT_SIGNED_IN" },
    });
  });

  it("3, 4a: an invalid interest, an invalid book and too many books are refused, nothing saved", async () => {
    const family = await consentedFamily();
    const draft = await insertBook("draft");
    signInAs(family.userId);
    const save = (extra: object) =>
      saveReadingProfile({
        childId: family.childId,
        interests: [],
        favoriteBookIds: [],
        ...extra,
      });

    expect(await save({ interests: ["nope"] })).toMatchObject({
      error: { code: "INVALID_INTEREST" },
    });
    expect(await save({ favoriteBookIds: [draft] })).toMatchObject({
      error: { code: "INVALID_BOOK" },
    });
    expect(
      await save({
        favoriteBookIds: Array.from({ length: 11 }, (_, i) => `b${String(i)}`),
      }),
    ).toMatchObject({ error: { code: "TOO_MANY_BOOKS" } });
    await nothingSaved();
  });

  it("1a: saving twice gives ONBOARDING_ALREADY_COMPLETE the second time", async () => {
    const family = await consentedFamily();
    signInAs(family.userId);
    const input = {
      childId: family.childId,
      interests: [],
      favoriteBookIds: [],
    };

    expect((await saveReadingProfile(input)).ok).toBe(true);

    expect(await saveReadingProfile(input)).toMatchObject({
      ok: false,
      error: { code: "ONBOARDING_ALREADY_COMPLETE" },
    });
  });

  it("the family comes from the session: a request-supplied family is ignored", async () => {
    const family = await consentedFamily();
    const other = await consentedFamily();
    signInAs(family.userId);

    const result = await saveReadingProfile({
      childId: other.childId,
      familyId: other.familyId,
      interests: [],
      favoriteBookIds: [],
    });

    expect(result).toMatchObject({ error: { code: "CHILD_NOT_FOUND" } });
    await nothingSaved();
  });

  it("step 6: the redirect target is always the child's completion page", () => {
    expect(onboardingCompletePath("abc-123")).toBe(
      "/parent/children/abc-123/onboarding-complete",
    );
  });
});
