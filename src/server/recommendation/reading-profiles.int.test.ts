import { Collection } from "mongodb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { insertBook } from "../../../tests/fixtures/catalog";
import { insertChild } from "../../../tests/fixtures/children";
import { insertParent } from "../../../tests/fixtures/users";
import { resetDatabase } from "../../../tests/integration/db";
import type { ParentSession } from "@/server/identity-access/sessions";
import { resetClock, setClock } from "@/server/lib/clock";
import { getDb, getMongoClient, withTransaction } from "@/server/lib/db";
import { lockChildForWrite } from "@/server/accounts-family/child-accounts";
import * as readingProfiles from "./reading-profiles";

const { saveOnboardingProfile, isOnboardingComplete } = readingProfiles;

const SAVED_AT = new Date("2026-11-18T09:30:00Z");

async function family() {
  const parent = await insertParent({ parentRole: "main" });
  const session: ParentSession = { ...parent, parentRole: "main" };
  const childId = await insertChild(parent.familyId);
  return { session, childId };
}

const profiles = () => getDb().collection("readingProfiles");

describe("saveOnboardingProfile (UC-REC-kid-onboarding)", () => {
  beforeEach(async () => {
    await resetDatabase();
    setClock(() => SAVED_AT);
  });
  afterEach(() => {
    resetClock();
    vi.restoreAllMocks();
  });

  it("main: saves one complete profile with the chosen values and the clock's time", async () => {
    const { session, childId } = await family();
    const bookId = await insertBook("active");

    const result = await saveOnboardingProfile(session, childId, {
      interests: ["fantasy", "animals"],
      favoriteBookIds: [bookId],
    });

    expect(result.ok).toBe(true);
    const stored = await profiles().find().toArray();
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      childId,
      interests: ["fantasy", "animals"],
      favoriteBookIds: [bookId],
      onboardingComplete: true,
      savedAt: SAVED_AT,
    });
    expect(Object.keys(stored[0] ?? {}).sort()).toEqual(
      [
        "_id",
        "childId",
        "favoriteBookIds",
        "interests",
        "onboardingComplete",
        "savedAt",
      ].sort(),
    );
  });

  it("3 and 4: no interests and no books is accepted and complete", async () => {
    const { session, childId } = await family();

    const result = await saveOnboardingProfile(session, childId, {
      interests: [],
      favoriteBookIds: [],
    });

    expect(result.ok).toBe(true);
    expect(await profiles().countDocuments({ childId })).toBe(1);
    expect(await isOnboardingComplete(session.familyId, childId)).toBe(true);
  });

  it.each(["draft", "blocked"] as const)(
    "4a: a %s book is refused with INVALID_BOOK and nothing is saved",
    async (status) => {
      const { session, childId } = await family();
      const bookId = await insertBook(status);

      const result = await saveOnboardingProfile(session, childId, {
        interests: [],
        favoriteBookIds: [bookId],
      });

      expect(result).toMatchObject({
        ok: false,
        error: { code: "INVALID_BOOK" },
      });
      expect(await profiles().countDocuments()).toBe(0);
    },
  );

  it("4a: an unknown book is refused even beside a valid one", async () => {
    const { session, childId } = await family();
    const real = await insertBook("active");

    const result = await saveOnboardingProfile(session, childId, {
      interests: [],
      favoriteBookIds: [real, "no-such-book"],
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "INVALID_BOOK" },
    });
    expect(await profiles().countDocuments()).toBe(0);
  });

  it("5a: a failed write is SAVE_FAILED with an error ID and nothing is saved", async () => {
    const { session, childId } = await family();
    vi.spyOn(Collection.prototype, "insertOne").mockRejectedValueOnce(
      new Error("disk full: secret detail"),
    );

    const result = await saveOnboardingProfile(session, childId, {
      interests: ["mystery"],
      favoriteBookIds: [],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("SAVE_FAILED");
    expect(result.error.errorId).toEqual(expect.any(String));
    expect(result.error.message).not.toContain("secret detail");
    expect(await profiles().countDocuments()).toBe(0);
  });

  it("1a: a second save is ONBOARDING_ALREADY_COMPLETE and changes nothing", async () => {
    const { session, childId } = await family();
    await saveOnboardingProfile(session, childId, {
      interests: ["fantasy"],
      favoriteBookIds: [],
    });

    const second = await saveOnboardingProfile(session, childId, {
      interests: ["mystery"],
      favoriteBookIds: [],
    });

    expect(second).toMatchObject({
      ok: false,
      error: { code: "ONBOARDING_ALREADY_COMPLETE" },
    });
    const stored = await profiles().find({ childId }).toArray();
    expect(stored).toHaveLength(1);
    expect(stored[0]?.interests).toEqual(["fantasy"]);
  });

  it("1a: two simultaneous saves leave exactly one profile", async () => {
    const { session, childId } = await family();
    const save = () =>
      saveOnboardingProfile(session, childId, {
        interests: ["adventure"],
        favoriteBookIds: [],
      });

    const results = await Promise.all([save(), save()]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.find((result) => !result.ok)).toMatchObject({
      error: { code: "ONBOARDING_ALREADY_COMPLETE" },
    });
    expect(await profiles().countDocuments({ childId })).toBe(1);
  });

  it("PRE-2: a child of another family is CHILD_NOT_FOUND and nothing is saved", async () => {
    const { session } = await family();
    const other = await family();

    const result = await saveOnboardingProfile(session, other.childId, {
      interests: [],
      favoriteBookIds: [],
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "CHILD_NOT_FOUND" },
    });
    expect(await profiles().countDocuments()).toBe(0);
  });

  it("PRE-3: isOnboardingComplete is false until a profile is saved, and for another family", async () => {
    const { session, childId } = await family();
    const stranger = await insertParent({ parentRole: "main" });
    expect(await isOnboardingComplete(session.familyId, childId)).toBe(false);

    await saveOnboardingProfile(session, childId, {
      interests: [],
      favoriteBookIds: [],
    });

    expect(await isOnboardingComplete(session.familyId, childId)).toBe(true);
    expect(await isOnboardingComplete(stranger.familyId, childId)).toBe(false);
  });

  it("logging: a success and a failure log no interests, books or child ID", async () => {
    const { session, childId } = await family();
    const bookId = await insertBook("active");
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const input = {
      interests: ["fantasy" as const],
      favoriteBookIds: [bookId],
    };

    await saveOnboardingProfile(session, childId, input);
    const other = await family();
    vi.spyOn(Collection.prototype, "insertOne").mockRejectedValueOnce(
      new Error(`failed for ${other.childId}`),
    );
    await saveOnboardingProfile(other.session, other.childId, input);

    expect(logged).toHaveBeenCalled();
    const output = JSON.stringify(logged.mock.calls);
    for (const secret of [childId, other.childId, bookId, "fantasy"]) {
      expect(output).not.toContain(secret);
    }
  });

  it("admin boundary: the module offers no function that returns a profile", () => {
    // Admin totals and the parent's export arrive with their own use cases (design/rec.md).
    expect(Object.keys(readingProfiles).sort()).toEqual([
      "READING_PROFILES",
      "ensureReadingProfileIndexes",
      "isOnboardingComplete",
      "saveOnboardingProfile",
    ]);
  });
});

// The child write lock (architecture §8.2.8, as amended by UC-PAR-delete-kid-account):
// every inserting child write first makes a conditional write to the child account, so
// it conflicts with the child's deletion instead of leaving an orphan record.
describe("saveOnboardingProfile and the child write lock (§8.2.8)", () => {
  beforeEach(async () => {
    await resetDatabase();
    setClock(() => SAVED_AT);
  });
  afterEach(() => {
    resetClock();
    vi.restoreAllMocks();
  });

  const children = () =>
    getDb().collection<{ _id: string; writeVersion?: number }>("children");

  it("a save takes the lock: the child account's writeVersion goes up by one", async () => {
    const { session, childId } = await family();

    await saveOnboardingProfile(session, childId, {
      interests: [],
      favoriteBookIds: [],
    });

    expect((await children().findOne({ _id: childId }))?.writeVersion).toBe(1);
  });

  it("lockChildForWrite matches nothing, and writes nothing, for a child with no account", async () => {
    const matched = await withTransaction((tx) =>
      lockChildForWrite(tx, "6b0f2c6e-0f3c-4b5e-9d51-0c2d5e1a7a99"),
    );

    expect(matched).toBe(false);
    expect(await children().countDocuments()).toBe(0);
  });

  it("a child deleted after the family check: CHILD_NOT_FOUND and nothing is saved", async () => {
    const { session, childId } = await family();
    const originalFindOne = Reflect.get(
      Collection.prototype,
      "findOne",
    ) as Collection["findOne"];
    // The family check finds the child; the account is gone before the transaction.
    vi.spyOn(Collection.prototype, "findOne").mockImplementationOnce(
      async function (
        this: Collection,
        ...args: Parameters<Collection["findOne"]>
      ) {
        const found: unknown = await originalFindOne.apply(this, args);
        await getDb()
          .collection<{ _id: string }>("children")
          .deleteOne({ _id: childId });
        return found;
      } as Collection["findOne"],
    );

    const result = await saveOnboardingProfile(session, childId, {
      interests: ["fantasy"],
      favoriteBookIds: [],
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "CHILD_NOT_FOUND" },
    });
    expect(await profiles().countDocuments()).toBe(0);
  });

  it("a transaction holding the lock conflicts with a deletion of that child", async () => {
    const { childId } = await family();
    const client = getMongoClient();
    const writer = client.startSession();
    const deleter = client.startSession();
    try {
      writer.startTransaction();
      expect(await lockChildForWrite(writer, childId)).toBe(true);

      deleter.startTransaction();
      // A snapshot read would not conflict; the conditional write does (WriteConflict).
      await expect(
        getDb()
          .collection<{ _id: string }>("children")
          .deleteOne({ _id: childId }, { session: deleter }),
      ).rejects.toMatchObject({ code: 112 });
    } finally {
      await writer.abortTransaction().catch(() => undefined);
      await deleter.abortTransaction().catch(() => undefined);
      await writer.endSession();
      await deleter.endSession();
    }
  });
});
