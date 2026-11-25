import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { Collection, ObjectId, type Document } from "mongodb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { insertConsentedMainParent } from "../../../tests/fixtures/family";
import {
  insertFinishConfirmation,
  insertRating,
  insertShelfEntry,
} from "../../../tests/fixtures/shelf";
import { insertParent } from "../../../tests/fixtures/users";
import { resetDatabase } from "../../../tests/integration/db";
import type { ParentSession } from "@/server/identity-access/sessions";

// UC-PAR-delete-kid-account, the deletion itself (design/par.md, Tests). The child's
// records are created through the real write paths; only Shelf, which has no write path
// yet, is seeded from fixtures. Invented data only.

vi.mock("@/server/safety-flagging/screen-note", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/server/safety-flagging/screen-note")
    >();
  return { ...actual, screenNote: vi.fn(actual.screenNote) };
});
const { screenNote } = await import("@/server/safety-flagging/screen-note");
const { createChild } = await import("./child-accounts");
const { deleteChild } = await import("./child-deletion");
const { getOnboardingStep } = await import("./families");
const { saveOnboardingProfile } =
  await import("@/server/recommendation/reading-profiles");
const { createDatabaseSession } =
  await import("@/server/identity-access/sessions");
const { claimSignInAttempt } =
  await import("@/server/identity-access/sign-in-throttle");
const { getDb, getMongoClient } = await import("@/server/lib/db");
const { resetClock, setClock } = await import("@/server/lib/clock");

const DELETED_AT = new Date("2026-11-24T15:00:00Z");
const BOOK_ID = "6b0f2c6e-0f3c-4b5e-9d51-0c2d5e1a7b01";

type SeededChild = {
  childId: string;
  userId: string;
  username: string;
  sessionTokens: string[];
};

/** A Main Parent whose consent is confirmed, with a session of their own. */
async function mainParent() {
  const parent = await insertConsentedMainParent();
  const session: ParentSession = { ...parent, parentRole: "main" };
  const own = await createDatabaseSession(parent.userId);
  return { session, sessionToken: own.sessionToken };
}

/**
 * One child with a record in every collection that can hold one today: the child
 * account, identity, credential and a flagged note with its flag (createChild), a
 * reading profile (saveOnboardingProfile), a session (createDatabaseSession), a
 * throttle row under the child's key (claimSignInAttempt) and shelf records (fixtures).
 */
async function seedChild(
  session: ParentSession,
  nickname: string,
  username: string,
): Promise<SeededChild> {
  vi.mocked(screenNote).mockReturnValueOnce({
    state: "flagged",
    passages: [{ start: 0, end: 4, category: "violence" }],
    version: "test",
  });
  const created = await createChild(session, {
    nickname,
    age: 8,
    grade: "3",
    username,
    avatar: "1-1",
    note: "Note about this invented child.",
  });
  if (!created.ok) throw new Error(`seed failed: ${created.error.code}`);
  const { childId } = created.data;
  const saved = await saveOnboardingProfile(session, childId, {
    interests: ["fantasy"],
    favoriteBookIds: [],
  });
  if (!saved.ok) throw new Error(`seed failed: ${saved.error.code}`);

  const user = await getDb()
    .collection<{ _id: ObjectId }>("users")
    .findOne({ role: "child", childId });
  if (!user) throw new Error("seed failed: no credential");
  const userId = user._id.toHexString();
  const sessionTokens = [
    (await createDatabaseSession(userId)).sessionToken,
    (await createDatabaseSession(userId)).sessionToken,
  ];
  await claimSignInAttempt(`child:${username}:shared`);
  await claimSignInAttempt(`child:${username}:dev:invented-device-hash`);
  await insertShelfEntry(childId, BOOK_ID, "readingNow");
  await insertRating(childId, BOOK_ID, "lovedIt");
  await insertFinishConfirmation(childId, BOOK_ID);
  return { childId, userId, username, sessionTokens };
}

/** Every document of every collection, so a test can see that nothing changed. */
async function dumpDatabase(): Promise<Record<string, Document[]>> {
  const db = getDb();
  const names = (await db.listCollections({}, { nameOnly: true }).toArray())
    .map((c) => c.name)
    .sort();
  const dump: Record<string, Document[]> = {};
  for (const name of names) {
    dump[name] = await db.collection(name).find().sort({ _id: 1 }).toArray();
  }
  return dump;
}

/** The values that identify the child in stored documents, as JSON would print them. */
function needlesFor(child: SeededChild) {
  return {
    childId: child.childId,
    others: [child.userId, child.username, ...child.sessionTokens],
  };
}

describe("deleteChild (UC-PAR-delete-kid-account)", () => {
  beforeEach(async () => {
    await resetDatabase();
    setClock(() => DELETED_AT);
  });
  afterEach(() => {
    resetClock();
    vi.restoreAllMocks();
  });

  it("main: deletes the child's account and records, marks the Consent Record and appends one IDs-only audit entry; the sibling and the parent remain", async () => {
    const { session, sessionToken } = await mainParent();
    const child = await seedChild(session, "Starfish", "star_reader");
    const sibling = await seedChild(session, "Comet", "comet_reader");
    const before = await dumpDatabase();

    const result = await deleteChild(session, child.childId);

    expect(result).toEqual({ ok: true, data: null });
    const db = getDb();
    for (const name of [
      "children",
      "childIdentities",
      "parentNotes",
      "noteFlags",
      "readingProfiles",
      "shelfEntries",
      "ratings",
      "finishConfirmations",
    ]) {
      const key = name === "children" ? "_id" : "childId";
      expect(
        await db.collection(name).countDocuments({ [key]: child.childId }),
        name,
      ).toBe(0);
    }
    expect(
      await db.collection("users").countDocuments({ childId: child.childId }),
    ).toBe(0);
    expect(
      await db
        .collection("sessions")
        .countDocuments({ userId: new ObjectId(child.userId) }),
    ).toBe(0);

    const consent = await db
      .collection("consentRecords")
      .findOne({ familyId: new ObjectId(session.familyId) });
    expect(consent?.removedChildren).toEqual([
      { childId: child.childId, removedAt: DELETED_AT },
    ]);

    const audits = await db
      .collection("auditLog")
      .find({ event: "child-account-deleted" })
      .toArray();
    expect(audits).toHaveLength(1);
    expect(audits[0]).toEqual({
      _id: expect.any(ObjectId) as unknown,
      actorId: new ObjectId(session.userId),
      actorRole: "parent",
      event: "child-account-deleted",
      childId: child.childId,
      occurredAt: DELETED_AT,
    });

    // The sibling's records are exactly as they were.
    const after = await dumpDatabase();
    for (const name of Object.keys(before)) {
      const siblingRows = (rows: Document[] | undefined) =>
        (rows ?? []).filter((row) =>
          JSON.stringify(row).includes(sibling.childId),
        );
      expect(siblingRows(after[name]), name).toEqual(siblingRows(before[name]));
    }
    // The Main Parent's account and session remain.
    expect(
      await db
        .collection("users")
        .countDocuments({ _id: new ObjectId(session.userId) }),
    ).toBe(1);
    expect(
      await db.collection("sessions").countDocuments({ sessionToken }),
    ).toBe(1);
  });

  it("main, completeness: every collection held the child before, and afterwards only the audit log and the removed-child entry hold the child ID", async () => {
    const { session } = await mainParent();
    const child = await seedChild(session, "Starfish", "star_reader");
    const { childId, others } = needlesFor(child);

    // Collections that never hold a child record, with the reason. A new collection
    // that is not seeded above and not listed here fails this test.
    const exempt: Record<string, string> = {
      books: "the catalog holds books only",
      consentRecords:
        "per family; gains the child ID only on deletion (POST-4)",
      auditLog: "append-only, IDs only; it may keep the child ID (§8.2.9)",
      passwordResets: "parents' reset links only",
    };
    const before = await dumpDatabase();
    for (const [name, rows] of Object.entries(before)) {
      if (name in exempt) continue;
      const text = JSON.stringify(rows);
      expect(
        [childId, ...others].some((needle) => text.includes(needle)),
        `${name} holds no record of the child: seed it or list it as exempt`,
      ).toBe(true);
    }

    expect((await deleteChild(session, childId)).ok).toBe(true);

    const after = await dumpDatabase();
    for (const [name, rows] of Object.entries(after)) {
      for (const row of rows) {
        const { removedChildren, ...rest } = row;
        const text = JSON.stringify(name === "consentRecords" ? rest : row);
        for (const needle of others) {
          expect(text.includes(needle), `${name} still holds the child`).toBe(
            false,
          );
        }
        if (name !== "auditLog") {
          expect(
            text.includes(childId),
            `${name} still holds the child ID`,
          ).toBe(false);
        }
        if (name === "consentRecords") {
          expect(removedChildren).toEqual([{ childId, removedAt: DELETED_AT }]);
        }
      }
    }
  });

  it("main, sign-in: the child's old session no longer reads back, and the username no longer exists", async () => {
    const { session } = await mainParent();
    const child = await seedChild(session, "Starfish", "star_reader");
    // getServerSession(), behind auth(), looks the cookie's token up with this call.
    const adapter = MongoDBAdapter(() => getMongoClient(), {
      databaseName: process.env.MONGODB_DB,
    });
    const token = child.sessionTokens[0] ?? "";
    expect(await adapter.getSessionAndUser?.(token)).not.toBeNull();

    await deleteChild(session, child.childId);

    expect(await adapter.getSessionAndUser?.(token)).toBeNull();
    expect(
      await getDb()
        .collection("users")
        .countDocuments({ username: child.username }),
    ).toBe(0);
  });

  it("main, throttle rows: deletes every key under the child's username and leaves other keys", async () => {
    const { session } = await mainParent();
    const child = await seedChild(session, "Starfish", "star_reader");
    await claimSignInAttempt("child:star_reader_two:shared");
    await claimSignInAttempt("parent@example.test");

    await deleteChild(session, child.childId);

    const keys = (
      await getDb().collection("signInAttempts").find().toArray()
    ).map((row) => row.accountKey as string);
    expect(keys.sort()).toEqual([
      "child:star_reader_two:shared",
      "parent@example.test",
    ]);
  });

  it("5a: a flagged note and its open flag are deleted, and the earlier parent-note-flagged audit entry remains", async () => {
    const { session } = await mainParent();
    const child = await seedChild(session, "Starfish", "star_reader");
    const db = getDb();
    expect(
      await db
        .collection("noteFlags")
        .countDocuments({ childId: child.childId, status: "open" }),
    ).toBe(1);

    await deleteChild(session, child.childId);

    expect(
      await db
        .collection("parentNotes")
        .countDocuments({ childId: child.childId }),
    ).toBe(0);
    expect(
      await db
        .collection("noteFlags")
        .countDocuments({ childId: child.childId }),
    ).toBe(0);
    expect(
      await db.collection("auditLog").countDocuments({
        event: "parent-note-flagged",
        childId: child.childId,
      }),
    ).toBe(1);
  });

  // One failing write in each component, and in the Consent Record and audit steps.
  it.each([
    ["users", "findOneAndDelete"],
    ["sessions", "deleteMany"],
    ["signInAttempts", "deleteMany"],
    ["childIdentities", "deleteMany"],
    ["parentNotes", "deleteMany"],
    ["noteFlags", "deleteMany"],
    ["readingProfiles", "deleteMany"],
    ["shelfEntries", "deleteMany"],
    ["ratings", "deleteMany"],
    ["finishConfirmations", "deleteMany"],
    ["consentRecords", "updateOne"],
    ["auditLog", "insertOne"],
  ] as const)(
    "5b: when the %s step fails, nothing is deleted or written and the result is DELETE_FAILED with an error ID",
    async (failing, method) => {
      const { session } = await mainParent();
      const child = await seedChild(session, "Starfish", "star_reader");
      const before = await dumpDatabase();
      type Method = (this: Collection, ...args: unknown[]) => unknown;
      const prototype = Collection.prototype as unknown as Record<
        typeof method,
        Method
      >;
      const original = prototype[method];
      vi.spyOn(prototype, method).mockImplementation(function (
        this: Collection,
        ...args: unknown[]
      ) {
        if (this.collectionName === failing) {
          throw new Error(`database down: ${child.username} Starfish`);
        }
        return original.apply(this, args);
      });
      const logged = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await deleteChild(session, child.childId);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("DELETE_FAILED");
      expect(result.error.errorId).toEqual(expect.any(String));
      expect(result.error.message).not.toContain("database down");
      vi.restoreAllMocks();
      expect(await dumpDatabase()).toEqual(before);
      const output = JSON.stringify(logged.mock.calls);
      for (const secret of [child.username, "Starfish", "database down"]) {
        expect(output).not.toContain(secret);
      }
    },
  );

  it("6: a family with no Sub Parent gets no notice, and the deletion creates no other collection", async () => {
    const { session } = await mainParent();
    const child = await seedChild(session, "Starfish", "star_reader");
    const before = Object.keys(await dumpDatabase());

    await deleteChild(session, child.childId);

    expect(Object.keys(await dumpDatabase())).toEqual(before);
  });

  it("7a: after the last child, the Main Parent account and Consent Record remain and onboarding needs a first child", async () => {
    const { session } = await mainParent();
    const child = await seedChild(session, "Starfish", "star_reader");
    expect(await getOnboardingStep(session.familyId)).toBe("complete");

    await deleteChild(session, child.childId);

    const db = getDb();
    expect(
      await db
        .collection("users")
        .countDocuments({ _id: new ObjectId(session.userId) }),
    ).toBe(1);
    expect(
      await db
        .collection("consentRecords")
        .countDocuments({ familyId: new ObjectId(session.familyId) }),
    ).toBe(1);
    expect(await getOnboardingStep(session.familyId)).toBe("needs-first-child");
  });

  it("revoked consent: the child can still be deleted (UC-PAR-revoke-consent 2a)", async () => {
    const { session } = await mainParent();
    const child = await seedChild(session, "Starfish", "star_reader");
    await getDb()
      .collection("consentRecords")
      .updateOne(
        { familyId: new ObjectId(session.familyId) },
        { $set: { revokedAt: new Date("2026-11-23T12:00:00Z") } },
      );

    expect(await deleteChild(session, child.childId)).toEqual({
      ok: true,
      data: null,
    });
    expect(
      await getDb()
        .collection<{ _id: string }>("children")
        .countDocuments({ _id: child.childId }),
    ).toBe(0);
  });

  it("double submit: two simultaneous deletions give one ok, one CHILD_NOT_FOUND and one audit entry", async () => {
    const { session } = await mainParent();
    const child = await seedChild(session, "Starfish", "star_reader");

    const results = await Promise.all([
      deleteChild(session, child.childId),
      deleteChild(session, child.childId),
    ]);

    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.find((r) => !r.ok)).toMatchObject({
      error: { code: "CHILD_NOT_FOUND" },
    });
    expect(
      await getDb()
        .collection("auditLog")
        .countDocuments({ event: "child-account-deleted" }),
    ).toBe(1);
  });

  it("authorization: another family's child is CHILD_NOT_FOUND, and a Sub Parent is NOT_MAIN_PARENT; nothing is deleted", async () => {
    const mine = await mainParent();
    const theirs = await mainParent();
    const child = await seedChild(theirs.session, "Starfish", "star_reader");
    const subParent = await insertParent({
      parentRole: "sub",
      familyId: new ObjectId(theirs.session.familyId),
    });
    const before = await dumpDatabase();

    expect(await deleteChild(mine.session, child.childId)).toMatchObject({
      ok: false,
      error: { code: "CHILD_NOT_FOUND" },
    });
    expect(
      await deleteChild({ ...subParent, parentRole: "sub" }, child.childId),
    ).toMatchObject({ ok: false, error: { code: "NOT_MAIN_PARENT" } });
    expect(
      await deleteChild(mine.session, "6b0f2c6e-0f3c-4b5e-9d51-0c2d5e1a7a99"),
    ).toMatchObject({ ok: false, error: { code: "CHILD_NOT_FOUND" } });
    expect(await dumpDatabase()).toEqual(before);
  });

  it("racing child write: a reading-profile save and a deletion run at once leave no profile, and a save after the deletion is CHILD_NOT_FOUND", async () => {
    const { session } = await mainParent();
    for (const n of [1, 2, 3, 4, 5]) {
      const created = await createChild(session, {
        nickname: `Racer${String(n)}`,
        age: 8,
        grade: "3",
        username: `racer_${String(n)}`,
        avatar: "1-1",
      });
      if (!created.ok) throw new Error("seed failed");
      const { childId } = created.data;
      const save = () =>
        saveOnboardingProfile(session, childId, {
          interests: [],
          favoriteBookIds: [],
        });

      await Promise.all([save(), deleteChild(session, childId)]);

      expect(
        await getDb().collection("readingProfiles").countDocuments({ childId }),
      ).toBe(0);
      expect(await save()).toMatchObject({
        ok: false,
        error: { code: "CHILD_NOT_FOUND" },
      });
      expect(
        await getDb().collection("readingProfiles").countDocuments({ childId }),
      ).toBe(0);
    }
  });
});
