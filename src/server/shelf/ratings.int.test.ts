import { ObjectId, MongoError } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { insertBook } from "../../../tests/fixtures/catalog";
import { insertChild } from "../../../tests/fixtures/children";
import { insertConsentRecord } from "../../../tests/fixtures/family";
import {
  insertFinishConfirmation,
  insertRating,
  insertShelfEntry,
} from "../../../tests/fixtures/shelf";
import { insertParent } from "../../../tests/fixtures/users";
import { resetDatabase } from "../../../tests/integration/db";
import type { ChildSession } from "@/server/identity-access/sessions";
import { RATING_VALUES } from "./shelf-collections";

// UC-SHLF-kid-rate-book's Shelf functions (design/shlf.md, Tests). Invented children and
// books only. The race tests move, remove or block the entry from outside the rating's
// transaction after it has started and before it writes the entry.

vi.mock("@/server/accounts-family/child-accounts", async (importOriginal) => {
  const real =
    await importOriginal<
      typeof import("@/server/accounts-family/child-accounts")
    >();
  return { ...real, getFamilyIdForChild: vi.fn(real.getFamilyIdForChild) };
});
vi.mock("@/server/lib/db", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/server/lib/db")>();
  return { ...real, withTransaction: vi.fn(real.withTransaction) };
});

const { getRatableBook, recordRating } = await import("./ratings");
const { deleteChildRecords, ensureShelfIndexes } =
  await import("./shelf-collections");
const { getShelfForParent } = await import("./parent-shelf");
const { getFamilyIdForChild } =
  await import("@/server/accounts-family/child-accounts");
const realChildAccounts = await vi.importActual<
  typeof import("@/server/accounts-family/child-accounts")
>("@/server/accounts-family/child-accounts");
const { getDb, withTransaction } = await import("@/server/lib/db");
const realDb =
  await vi.importActual<typeof import("@/server/lib/db")>("@/server/lib/db");
const { setClock, resetClock } = await import("@/server/lib/clock");

const AT = new Date("2026-11-27T15:00:00Z");

type Family = { parent: { userId: string; familyId: string } };

/** A child in a family whose consent is confirmed, as a child session would carry it. */
async function consentedChild(
  nickname = "Starfish",
): Promise<Family & { session: ChildSession; childId: string }> {
  const parent = await insertParent({ parentRole: "main" });
  await insertConsentRecord(parent, true);
  const childId = await insertChild(parent.familyId, { nickname });
  const session = {
    userId: new ObjectId().toHexString(),
    childId,
    sessionId: new ObjectId(),
  };
  return { parent, session, childId };
}

/** A confirmed book in the child's Finished category: one the child may rate. */
async function ratableBook(childId: string, title = "Moon Garden") {
  const bookId = await insertBook("active", title);
  await insertShelfEntry(childId, bookId, "finished");
  await insertFinishConfirmation(childId, bookId);
  return bookId;
}

const ratings = () => getDb().collection("ratings");
const entryOf = (childId: string, bookId: string) =>
  getDb().collection("shelfEntries").findOne({ childId, bookId });

/** Runs `concurrent` once, inside the rating's transaction, before it writes the entry. */
function raceWith(concurrent: () => Promise<unknown>) {
  vi.mocked(getFamilyIdForChild).mockImplementationOnce(async (...args) => {
    await concurrent();
    return realChildAccounts.getFamilyIdForChild(...args);
  });
}

beforeEach(async () => {
  await resetDatabase();
  vi.mocked(getFamilyIdForChild).mockClear();
  vi.mocked(withTransaction).mockClear();
  setClock(() => AT);
  vi.spyOn(console, "error").mockImplementation(() => {});
  return () => {
    resetClock();
  };
});

describe("main flow (steps 2 to 5, POST-1, POST-2)", () => {
  it.each(RATING_VALUES)(
    "saves %s with ratedAt from the clock",
    async (value) => {
      const { session, childId } = await consentedChild();
      const bookId = await ratableBook(childId);

      expect(await getRatableBook(session, bookId)).toEqual({
        bookId,
        title: "Moon Garden",
        rating: null,
      });
      expect(await recordRating(session, { bookId, rating: value })).toEqual({
        ok: true,
        data: { rating: value },
      });

      const rows = await ratings().find().toArray();
      expect(rows).toEqual([
        {
          _id: expect.any(ObjectId) as ObjectId,
          childId,
          bookId,
          value,
          ratedAt: AT,
        },
      ]);
      // A reload shows the saved choice.
      expect(await getRatableBook(session, bookId)).toMatchObject({
        rating: value,
      });
    },
  );

  it("the linked parent sees the rating on the shelf view", async () => {
    const { parent, session, childId } = await consentedChild();
    const bookId = await ratableBook(childId);
    await recordRating(session, { bookId, rating: "likedIt" });

    const view = await getShelfForParent(parent.familyId, childId);
    expect(
      view?.categories.find((group) => group.category === "finished")?.entries,
    ).toMatchObject([{ bookId, rating: "likedIt" }]);
  });

  it("another child can neither read nor change the rating", async () => {
    const { session, childId } = await consentedChild();
    const other = await consentedChild("Otter");
    const bookId = await ratableBook(childId);
    await recordRating(session, { bookId, rating: "lovedIt" });

    expect(await getRatableBook(other.session, bookId)).toBeNull();
    expect(
      await recordRating(other.session, { bookId, rating: "notForMe" }),
    ).toMatchObject({ ok: false, error: { code: "NOT_RATABLE" } });
    expect(await ratings().find().toArray()).toMatchObject([
      { childId, value: "lovedIt" },
    ]);
  });

  it("no metrics: the read and the result hold the book, the rating and nothing else", async () => {
    const { session, childId } = await consentedChild();
    const bookId = await ratableBook(childId);
    const read = await getRatableBook(session, bookId);
    expect(Object.keys(read ?? {}).sort()).toEqual([
      "bookId",
      "rating",
      "title",
    ]);
    const saved = await recordRating(session, { bookId, rating: "okay" });
    expect(saved).toEqual({ ok: true, data: { rating: "okay" } });
  });
});

describe("refusals (1a, 1b, draft or blocked)", () => {
  async function expectRefused(
    session: ChildSession,
    bookId: string,
    childId: string,
  ) {
    expect(await getRatableBook(session, bookId)).toBeNull();
    expect(await recordRating(session, { bookId, rating: "lovedIt" })).toEqual({
      ok: false,
      error: {
        code: "NOT_RATABLE",
        message: "This book can’t be rated right now.",
      },
    });
    expect(await ratings().countDocuments()).toBe(0);
    expect(await entryOf(childId, bookId)).not.toHaveProperty("writeVersion");
  }

  it.each(["readingNow", "wantToRead", "maybeLater"] as const)(
    "1a and OI-75: a confirmed book in %s",
    async (category) => {
      const { session, childId } = await consentedChild();
      const bookId = await insertBook("active");
      await insertShelfEntry(childId, bookId, category);
      await insertFinishConfirmation(childId, bookId);
      await expectRefused(session, bookId, childId);
    },
  );

  it("1b: a Finished book with no finish confirmation", async () => {
    const { session, childId } = await consentedChild();
    const bookId = await insertBook("active");
    await insertShelfEntry(childId, bookId, "finished");
    await expectRefused(session, bookId, childId);
  });

  it.each(["draft", "blocked"] as const)(
    "a confirmed Finished book that is %s, its entry left in place",
    async (status) => {
      const { session, childId } = await consentedChild();
      const bookId = await insertBook(status);
      await insertShelfEntry(childId, bookId, "finished");
      await insertFinishConfirmation(childId, bookId);
      // The entry's writeVersion is rolled back with the refusal.
      await expectRefused(session, bookId, childId);
    },
  );

  it.each([
    ["an unknown book", "no-such-book"],
    ["a malformed ID", "{$ne:null}"],
  ])("1a: %s", async (_label, bookId) => {
    const { session } = await consentedChild();
    expect(await getRatableBook(session, bookId)).toBeNull();
    expect(
      await recordRating(session, { bookId, rating: "lovedIt" }),
    ).toMatchObject({ ok: false, error: { code: "NOT_RATABLE" } });
    expect(await ratings().countDocuments()).toBe(0);
  });

  it("the confirmation of another child does not count", async () => {
    const { session, childId } = await consentedChild();
    const other = await consentedChild("Otter");
    const bookId = await insertBook("active");
    await insertShelfEntry(childId, bookId, "finished");
    await insertFinishConfirmation(other.childId, bookId);
    await expectRefused(session, bookId, childId);
  });
});

describe("1a, race: the entry changes while the rating is saved", () => {
  it.each([
    [
      "a move out of Finished",
      (childId: string, bookId: string) =>
        getDb()
          .collection("shelfEntries")
          .updateOne(
            { childId, bookId },
            { $set: { category: "readingNow", movedAt: AT } },
          ),
    ],
    [
      "a removal",
      (childId: string, bookId: string) =>
        getDb().collection("shelfEntries").deleteOne({ childId, bookId }),
    ],
    [
      "a block, which deletes the entries",
      async (_childId: string, bookId: string) => {
        await getDb()
          .collection("books")
          .updateOne({ _id: bookId as never }, { $set: { status: "blocked" } });
        await getDb().collection("shelfEntries").deleteMany({ bookId });
      },
    ],
  ])("%s conflicts, reruns and gives NOT_RATABLE", async (_label, change) => {
    const { session, childId } = await consentedChild();
    const bookId = await ratableBook(childId);
    raceWith(() => change(childId, bookId));

    expect(
      await recordRating(session, { bookId, rating: "lovedIt" }),
    ).toMatchObject({ ok: false, error: { code: "NOT_RATABLE" } });
    // The first run hit the conflict and the driver ran the callback again.
    expect(vi.mocked(getFamilyIdForChild)).toHaveBeenCalledTimes(2);
    expect(await ratings().countDocuments()).toBe(0);
  });
});

describe("3a: a new choice replaces the earlier one", () => {
  it("keeps one row with the new value and time, and not the earlier value", async () => {
    const { session, childId } = await consentedChild();
    const bookId = await ratableBook(childId);
    await recordRating(session, { bookId, rating: "lovedIt" });
    const later = new Date("2026-11-28T09:00:00Z");
    setClock(() => later);
    await recordRating(session, { bookId, rating: "notForMe" });

    expect(await ratings().find().toArray()).toMatchObject([
      { childId, bookId, value: "notForMe", ratedAt: later },
    ]);
    expect(await ratings().countDocuments({ value: "lovedIt" })).toBe(0);
  });

  it("replaces a rating stored before this build", async () => {
    const { session, childId } = await consentedChild();
    const bookId = await ratableBook(childId);
    await insertRating(childId, bookId, "okay");
    await recordRating(session, { bookId, rating: "likedIt" });
    expect(await ratings().find().toArray()).toMatchObject([
      { value: "likedIt", ratedAt: AT },
    ]);
  });

  it("concurrent submissions leave one complete row", async () => {
    const { session, childId } = await consentedChild();
    const bookId = await ratableBook(childId);
    const results = await Promise.all(
      RATING_VALUES.map((rating) => recordRating(session, { bookId, rating })),
    );
    expect(results.every((result) => result.ok)).toBe(true);
    const rows = await ratings().find().toArray();
    expect(rows).toHaveLength(1);
    expect(RATING_VALUES).toContain(rows[0]?.value);
    expect(rows[0]?.ratedAt).toEqual(AT);
  });
});

describe("5a: saving fails", () => {
  it("returns SAVE_FAILED with an error ID, writes nothing, and a retry succeeds", async () => {
    const { session, childId } = await consentedChild();
    const bookId = await ratableBook(childId);
    // The ratings collection refuses every document until the validator is restored.
    await getDb().command({
      collMod: "ratings",
      validator: { $jsonSchema: { required: ["neverSet"] } },
    });

    expect(await recordRating(session, { bookId, rating: "lovedIt" })).toEqual({
      ok: false,
      error: {
        code: "SAVE_FAILED",
        message: "That didn’t save. Tap your choice again.",
        errorId: expect.any(String) as string,
      },
    });
    expect(await ratings().countDocuments()).toBe(0);
    expect(await entryOf(childId, bookId)).not.toHaveProperty("writeVersion");

    await ensureShelfIndexes(getDb());
    expect(await recordRating(session, { bookId, rating: "lovedIt" })).toEqual({
      ok: true,
      data: { rating: "lovedIt" },
    });
    expect(await ratings().countDocuments()).toBe(1);
  });

  it("an unknown commit result is OUTCOME_UNKNOWN, and saving again leaves one row", async () => {
    const { session, childId } = await consentedChild();
    const bookId = await ratableBook(childId);
    // The commit applies, then the driver cannot learn that it did.
    vi.mocked(withTransaction).mockImplementationOnce(async (work) => {
      await realDb.withTransaction(work);
      const err = new MongoError("invented commit timeout");
      err.addErrorLabel("UnknownTransactionCommitResult");
      throw err;
    });

    expect(await recordRating(session, { bookId, rating: "likedIt" })).toEqual({
      ok: false,
      error: {
        code: "OUTCOME_UNKNOWN",
        message:
          "We couldn’t check that it saved. Look at the book on your shelf, or tap your choice again.",
        errorId: expect.any(String) as string,
      },
    });
    expect(
      await recordRating(session, { bookId, rating: "likedIt" }),
    ).toMatchObject({ ok: true });
    expect(await ratings().find().toArray()).toMatchObject([
      { value: "likedIt" },
    ]);
  });
});

describe("child lock and consent lock", () => {
  it("child deletion first: CHILD_NOT_FOUND and no rating", async () => {
    const { session, childId } = await consentedChild();
    const bookId = await ratableBook(childId);
    await getDb()
      .collection<{ _id: string }>("children")
      .deleteOne({ _id: childId });

    expect(await recordRating(session, { bookId, rating: "lovedIt" })).toEqual({
      ok: false,
      error: {
        code: "CHILD_NOT_FOUND",
        message: "Something went wrong. Please ask a grown-up.",
      },
    });
    expect(await ratings().countDocuments()).toBe(0);
  });

  it("a rating first: the child's deletion removes it", async () => {
    const { session, childId } = await consentedChild();
    const bookId = await ratableBook(childId);
    await recordRating(session, { bookId, rating: "lovedIt" });
    await realDb.withTransaction((tx) => deleteChildRecords(tx, childId));
    expect(await ratings().countDocuments()).toBe(0);
  });

  it.each([
    ["not confirmed", false],
    ["revoked", true],
  ])(
    "consent %s: CONSENT_NOT_CONFIRMED, nothing written, writeVersion unchanged",
    async (_label, revoke) => {
      const parent = await insertParent({ parentRole: "main" });
      await insertConsentRecord(parent, revoke);
      if (revoke) {
        await getDb()
          .collection("consentRecords")
          .updateOne({}, { $set: { revokedAt: AT } });
      }
      const childId = await insertChild(parent.familyId);
      const session = {
        userId: new ObjectId().toHexString(),
        childId,
        sessionId: new ObjectId(),
      };
      const bookId = await ratableBook(childId);

      expect(
        await recordRating(session, { bookId, rating: "lovedIt" }),
      ).toEqual({
        ok: false,
        error: {
          code: "CONSENT_NOT_CONFIRMED",
          message: "Something went wrong. Please ask a grown-up.",
        },
      });
      expect(await ratings().countDocuments()).toBe(0);
      expect(await entryOf(childId, bookId)).not.toHaveProperty("writeVersion");
    },
  );

  it("consent revoked after a save leaves the rating for deletion to remove", async () => {
    const { session, childId } = await consentedChild();
    const bookId = await ratableBook(childId);
    await recordRating(session, { bookId, rating: "lovedIt" });
    await getDb()
      .collection("consentRecords")
      .updateOne({}, { $set: { revokedAt: AT } });
    expect(await ratings().countDocuments()).toBe(1);
  });
});
