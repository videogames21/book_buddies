import { ObjectId } from "mongodb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  insertConsentedMainParent,
  insertConsentRecord,
} from "../../../../../../tests/fixtures/family";
import {
  insertParent,
  insertUserWithRole,
} from "../../../../../../tests/fixtures/users";
import { resetDatabase } from "../../../../../../tests/integration/db";

vi.mock("@/server/identity-access/auth", () => ({ auth: vi.fn() }));
vi.mock("@/server/identity-access/passwords", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/server/identity-access/passwords")>();
  return { ...actual, hashPassword: vi.fn(actual.hashPassword) };
});
vi.mock("@/server/child-identity/child-identity", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/server/child-identity/child-identity")
    >();
  return { ...actual, insertChildIdentity: vi.fn(actual.insertChildIdentity) };
});
vi.mock(
  "@/server/identity-access/child-credentials",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@/server/identity-access/child-credentials")
      >();
    return {
      ...actual,
      insertChildCredential: vi.fn(actual.insertChildCredential),
      generateChildPassword: vi.fn(actual.generateChildPassword),
    };
  },
);

vi.mock("@/server/safety-flagging/screen-note", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/server/safety-flagging/screen-note")
    >();
  return { ...actual, screenNote: vi.fn(actual.screenNote) };
});
vi.mock("@/server/safety-flagging/note-flags", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/server/safety-flagging/note-flags")
    >();
  return { ...actual, insertNoteFlag: vi.fn(actual.insertNoteFlag) };
});
vi.mock("@/server/audit/audit-log", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/server/audit/audit-log")>();
  return { ...actual, appendNoteFlagAudit: vi.fn(actual.appendNoteFlagAudit) };
});
const { screenNote } = await import("@/server/safety-flagging/screen-note");
const { insertNoteFlag } = await import("@/server/safety-flagging/note-flags");
const { appendNoteFlagAudit } = await import("@/server/audit/audit-log");
const { getChildForFamily } =
  await import("@/server/accounts-family/child-accounts");
const { auth } = await import("@/server/identity-access/auth");
const { insertChildIdentity } =
  await import("@/server/child-identity/child-identity");
const { insertChildCredential, generateChildPassword } =
  await import("@/server/identity-access/child-credentials");
const { hashPassword, verifyPassword } =
  await import("@/server/identity-access/passwords");
const { getDb } = await import("@/server/lib/db");
const { createChildAccount } = await import("./actions");

const mockedAuth = vi.mocked(
  auth as unknown as () => Promise<{ user: { id: string } } | null>,
);

function signInAs(userId: string | null) {
  mockedAuth.mockResolvedValue(userId ? { user: { id: userId } } : null);
}

// Invented test data only.
const child = {
  nickname: "Starfish",
  age: 8,
  grade: "3",
  username: "Star_Reader",
  readingLevel: { scale: "lexile", value: "650L" },
  avatar: "1-1",
  note: "  Likes moon stories.  ",
};

async function stored() {
  const db = getDb();
  return {
    children: await db.collection("children").find().toArray(),
    identities: await db.collection("childIdentities").find().toArray(),
    notes: await db.collection("parentNotes").find().toArray(),
    flags: await db.collection("noteFlags").find().toArray(),
    audits: await db.collection("auditLog").find().toArray(),
    credentials: await db.collection("users").find({ role: "child" }).toArray(),
  };
}

async function expectNothingStored() {
  const { children, identities, credentials, notes, flags, audits } =
    await stored();
  expect(notes).toHaveLength(0);
  expect(flags).toHaveLength(0);
  expect(audits).toHaveLength(0);
  expect(children).toHaveLength(0);
  expect(identities).toHaveLength(0);
  expect(credentials).toHaveLength(0);
}

describe("createChildAccount (UC-PAR-create-kid-account)", () => {
  beforeEach(async () => {
    await resetDatabase();
    vi.mocked(insertChildIdentity).mockReset();
    vi.mocked(screenNote).mockReset();
    vi.mocked(insertNoteFlag).mockReset();
    vi.mocked(appendNoteFlagAudit).mockReset();
    vi.mocked(insertChildCredential).mockReset();
    vi.mocked(generateChildPassword).mockReset();
    vi.mocked(hashPassword).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("main: creates the child account, identity and credential with one child ID in the session's family", async () => {
    const parent = await insertConsentedMainParent();
    signInAs(parent.userId);

    const result = await createChildAccount(child);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { children, identities, credentials } = await stored();
    expect(children).toHaveLength(1);
    expect(identities).toHaveLength(1);
    expect(credentials).toHaveLength(1);

    const childId = children[0]._id as unknown as string;
    expect(childId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(result.data.childId).toBe(childId);
    expect(children[0]).toMatchObject({
      familyId: new ObjectId(parent.familyId),
      nickname: "Starfish",
      avatar: "1-1",
    });
    expect(identities[0]).not.toHaveProperty("realName");
    expect(identities[0]).not.toHaveProperty("name");
    expect(identities[0]).toMatchObject({
      childId,
      age: 8,
      grade: "3",
      readingLevelScale: "lexile",
      readingLevelValue: "650L",
    });
    expect(credentials[0]).toMatchObject({ childId, username: "star_reader" });
    expect(result.data.username).toBe("star_reader");
    expect(
      await verifyPassword(
        result.data.password,
        credentials[0].passwordHash as string,
      ),
    ).toBe(true);
  });

  it("main, skipped reading level: the identity has no reading level and the save succeeds", async () => {
    signInAs((await insertConsentedMainParent()).userId);
    const withoutLevel = { ...child, readingLevel: undefined };

    expect((await createChildAccount(withoutLevel)).ok).toBe(true);
    const { identities } = await stored();
    expect(identities[0]).not.toHaveProperty("readingLevelScale");
    expect(identities[0]).not.toHaveProperty("readingLevelValue");
  });

  it("4b: an age outside 6–11 but inside the accepted range is saved", async () => {
    signInAs((await insertConsentedMainParent()).userId);
    expect((await createChildAccount({ ...child, age: 4 })).ok).toBe(true);
    expect((await stored()).identities[0]).toMatchObject({ age: 4 });
  });

  it("1b: a Sub Parent gets NOT_MAIN_PARENT and nothing is stored", async () => {
    const sub = await insertParent({ parentRole: "sub" });
    await insertConsentRecord(sub.familyId, true);
    signInAs(sub.userId);

    expect(await createChildAccount(child)).toMatchObject({
      ok: false,
      error: { code: "NOT_MAIN_PARENT" },
    });
    await expectNothingStored();
  });

  it("1c: a family without confirmed consent gets CONSENT_NOT_CONFIRMED and nothing is stored", async () => {
    const pending = await insertParent({ parentRole: "main" });
    await insertConsentRecord(pending.familyId, false);
    signInAs(pending.userId);
    expect(await createChildAccount(child)).toMatchObject({
      ok: false,
      error: { code: "CONSENT_NOT_CONFIRMED" },
    });

    const noRecord = await insertParent({ parentRole: "main" });
    signInAs(noRecord.userId);
    expect(await createChildAccount(child)).toMatchObject({
      ok: false,
      error: { code: "CONSENT_NOT_CONFIRMED" },
    });
    await expectNothingStored();
  });

  it("returns the field's error code when validation fails, and stores nothing", async () => {
    signInAs((await insertConsentedMainParent()).userId);
    expect(await createChildAccount({ ...child, nickname: " " })).toMatchObject(
      {
        ok: false,
        error: { code: "NICKNAME_REQUIRED" },
      },
    );
    await expectNothingStored();
  });

  it.each([
    [{ ...child, username: "ab" }, "INVALID_USERNAME"],
    [{ ...child, age: 2 }, "INVALID_AGE"],
  ])("returns a non-nickname field error for %j", async (input, code) => {
    signInAs((await insertConsentedMainParent()).userId);
    expect(await createChildAccount(input)).toMatchObject({
      ok: false,
      error: { code },
    });
    await expectNothingStored();
  });

  it.each([null, undefined, [], "not an object"].map((input) => ({ input })))(
    "refuses malformed payload %j with a generic validation error",
    async ({ input }) => {
      signInAs((await insertConsentedMainParent()).userId);
      expect(await createChildAccount(input)).toMatchObject({
        ok: false,
        error: { code: "INVALID_INPUT" },
      });
      await expectNothingStored();
    },
  );

  it("4g: a username used by another child or a Sub Parent, in any letter case, is USERNAME_TAKEN and nothing new is stored", async () => {
    signInAs((await insertConsentedMainParent()).userId);
    expect((await createChildAccount(child)).ok).toBe(true);

    const again = await createChildAccount({
      ...child,
      nickname: "Comet",
      username: "STAR_reader",
    });
    expect(again).toMatchObject({
      ok: false,
      error: { code: "USERNAME_TAKEN" },
    });

    await getDb().collection("users").insertOne({
      role: "parent",
      parentRole: "sub",
      username: "sub_parent_one",
    });
    const subName = await createChildAccount({
      ...child,
      nickname: "Comet",
      username: "Sub_Parent_One",
    });
    expect(subName).toMatchObject({
      ok: false,
      error: { code: "USERNAME_TAKEN" },
    });

    const { children, identities, credentials } = await stored();
    expect(children).toHaveLength(1);
    expect(identities).toHaveLength(1);
    expect(credentials).toHaveLength(1);
  });

  it("4g, concurrent: two simultaneous creations with one username leave exactly one child", async () => {
    signInAs((await insertConsentedMainParent()).userId);

    const results = await Promise.all([
      createChildAccount(child),
      createChildAccount({ ...child, nickname: "Comet" }),
    ]);

    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(
      results.filter((r) => !r.ok && r.error.code === "USERNAME_TAKEN"),
    ).toHaveLength(1);
    const { children, identities, credentials } = await stored();
    expect(children).toHaveLength(1);
    expect(identities).toHaveLength(1);
    expect(credentials).toHaveLength(1);
  });

  it("5a: when the identity insert fails, nothing remains and the result is SAVE_FAILED with an error ID", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    signInAs((await insertConsentedMainParent()).userId);
    vi.mocked(insertChildIdentity).mockRejectedValueOnce(
      new Error("database timeout"),
    );

    const result = await createChildAccount(child);

    expect(result).toMatchObject({ ok: false, error: { code: "SAVE_FAILED" } });
    expect(!result.ok && result.error.errorId).toMatch(/^[0-9a-f-]{36}$/);
    expect(!result.ok && result.error.message).not.toContain("timeout");
    await expectNothingStored();
  });

  it("6a: when the credential insert fails, no child account or identity remains, and the result is SAVE_FAILED", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    signInAs((await insertConsentedMainParent()).userId);
    vi.mocked(insertChildCredential).mockRejectedValueOnce(
      new Error("write failed"),
    );

    expect(await createChildAccount(child)).toMatchObject({
      ok: false,
      error: { code: "SAVE_FAILED" },
    });
    await expectNothingStored();
  });

  it("7a: the plaintext password is stored nowhere; only its hash is", async () => {
    signInAs((await insertConsentedMainParent()).userId);
    const result = await createChildAccount(child);
    if (!result.ok) throw new Error("expected success");

    const db = getDb();
    for (const { name } of await db.listCollections().toArray()) {
      const everything = JSON.stringify(
        await db.collection(name).find().toArray(),
      );
      expect(everything, name).not.toContain(result.data.password);
    }
    const credential = (await stored()).credentials[0];
    expect(Object.keys(credential).sort()).toEqual([
      "_id",
      "childId",
      "createdAt",
      "passwordHash",
      "role",
      "username",
    ]);
  });

  it("authorization: a family ID in the request is ignored; the child joins the session's family", async () => {
    const parent = await insertConsentedMainParent();
    const otherFamily = new ObjectId();
    signInAs(parent.userId);

    expect(
      (
        await createChildAccount({
          ...child,
          familyId: otherFamily.toHexString(),
        })
      ).ok,
    ).toBe(true);
    expect((await stored()).children[0].familyId).toEqual(
      new ObjectId(parent.familyId),
    );
  });

  it("authorization: no session, a child session and an admin session are refused, and nothing is stored", async () => {
    signInAs(null);
    const invalid = { ...child, nickname: " " };
    expect(await createChildAccount(invalid)).toMatchObject({
      ok: false,
      error: { code: "NOT_SIGNED_IN" },
    });
    for (const role of ["child", "admin"] as const) {
      signInAs((await insertUserWithRole(role)).userId);
      expect(await createChildAccount(invalid)).toMatchObject({
        ok: false,
        error: { code: "NOT_A_PARENT" },
      });
    }
    expect(await getDb().collection("children").countDocuments()).toBe(0);
    expect(await getDb().collection("childIdentities").countDocuments()).toBe(
      0,
    );
  });

  it("logging: after a successful and a failed creation, the logs hold no child detail, username or password", async () => {
    const lines: string[] = [];
    for (const level of ["log", "info", "warn", "error", "debug"] as const) {
      vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
        lines.push(args.map(String).join(" "));
      });
    }
    signInAs((await insertConsentedMainParent()).userId);

    vi.mocked(screenNote).mockReturnValueOnce({
      state: "flagged",
      passages: [{ start: 0, end: 10, category: "fixture" }],
      version: "test-1",
    });
    const success = await createChildAccount({
      ...child,
      note: "zzmarkerzz moon stories",
    });
    expect(success.ok).toBe(true);
    expect((await stored()).flags).toHaveLength(1);
    await createChildAccount({ ...child, nickname: "Comet" }); // USERNAME_TAKEN
    vi.mocked(insertChildCredential).mockRejectedValueOnce(
      Object.assign(new Error('write failed for username "other_reader"'), {
        code: 99,
      }),
    );
    await createChildAccount({ ...child, username: "other_reader" }); // SAVE_FAILED

    const logged = lines.join("\n").toLowerCase();
    expect(lines.length).toBeGreaterThan(0);
    expect(logged).not.toMatch(/"(?:age|grade)"\s*:/);
    const secrets = [
      "likes moon stories.",
      "zzmarkerzz",
      "starfish",
      "star_reader",
      "other_reader",
      "650l",
    ];
    if (success.ok) secrets.push(success.data.password);
    for (const secret of secrets) expect(logged).not.toContain(secret);
  });

  it("no real name to the child: the child account record holds only the ID, family, nickname and avatar", async () => {
    signInAs((await insertConsentedMainParent()).userId);
    await createChildAccount(child);
    expect(Object.keys((await stored()).children[0]).sort()).toEqual([
      "_id",
      "avatar",
      "createdAt",
      "familyId",
      "nickname",
    ]);
  });
  it("5b: unavailable screening saves the note as check_not_run without a flag", async () => {
    signInAs((await insertConsentedMainParent()).userId);
    expect((await createChildAccount(child)).ok).toBe(true);
    const records = await stored();
    expect(records.notes[0]).toMatchObject({
      text: "Likes moon stories.",
      flag: "check_not_run",
    });
    expect(records.flags).toHaveLength(0);
    expect(records.audits).toHaveLength(0);
  });

  it("5.1: a clean screened note is stored trimmed without a flag", async () => {
    signInAs((await insertConsentedMainParent()).userId);
    vi.mocked(screenNote).mockReturnValueOnce({
      state: "none",
      passages: [],
      version: "test-1",
    });
    expect((await createChildAccount(child)).ok).toBe(true);
    expect((await stored()).notes[0]).toMatchObject({
      text: "Likes moon stories.",
      flag: "none",
    });
    expect((await stored()).flags).toHaveLength(0);
  });

  it("blank notes write no note, flag or audit record", async () => {
    signInAs((await insertConsentedMainParent()).userId);
    expect((await createChildAccount({ ...child, note: "   " })).ok).toBe(true);
    expect((await stored()).notes).toHaveLength(0);
    expect(screenNote).not.toHaveBeenCalled();
  });

  it("5.1: a flagged note, flag and IDs-only audit are committed together", async () => {
    const parent = await insertConsentedMainParent();
    signInAs(parent.userId);
    vi.mocked(screenNote).mockReturnValueOnce({
      state: "flagged",
      passages: [{ start: 6, end: 10, category: "fixture" }],
      version: "test-1",
    });
    const result = await createChildAccount(child);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.keys(result.data).sort()).toEqual([
      "childId",
      "password",
      "username",
    ]);
    const records = await stored();
    expect(records.notes).toHaveLength(1);
    expect(records.notes[0]).toMatchObject({
      childId: result.data.childId,
      flag: "flagged",
    });
    expect(records.flags[0]).toMatchObject({
      childId: result.data.childId,
      noteId: records.notes[0]._id,
      detectorVersion: "test-1",
      categories: ["fixture"],
      passages: [{ start: 6, end: 10, category: "fixture" }],
      detectorMethod: "word-list",
    });
    expect(records.flags[0]).not.toHaveProperty("text");
    expect(records.audits[0]).toMatchObject({
      actorId: new ObjectId(parent.userId),
      childId: result.data.childId,
      recordId: records.flags[0]._id,
    });
    expect(Object.keys(records.audits[0]).sort()).toEqual([
      "_id",
      "actorId",
      "actorRole",
      "childId",
      "event",
      "occurredAt",
      "recordId",
    ]);
    const flagSession = vi.mocked(insertNoteFlag).mock.calls[0][0];
    expect(flagSession).toBeDefined();
    expect(vi.mocked(appendNoteFlagAudit).mock.calls[0][0]).toBe(flagSession);
  });

  it.each(["flag", "audit"])(
    "rolls back all records when the %s write fails",
    async (failure) => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      signInAs((await insertConsentedMainParent()).userId);
      vi.mocked(screenNote).mockReturnValueOnce({
        state: "flagged",
        passages: [{ start: 6, end: 10, category: "fixture" }],
        version: "test-1",
      });
      if (failure === "flag")
        vi.mocked(insertNoteFlag).mockRejectedValueOnce(
          new Error("write failure"),
        );
      else
        vi.mocked(appendNoteFlagAudit).mockRejectedValueOnce(
          new Error("write failure"),
        );
      expect(await createChildAccount(child)).toMatchObject({
        ok: false,
        error: { code: "SAVE_FAILED" },
      });
      await expectNothingStored();
    },
  );

  it("step 10: the completion summary is scoped to the parent's family and returns no private fields", async () => {
    const parent = await insertConsentedMainParent();
    signInAs(parent.userId);
    const result = await createChildAccount(child);
    if (!result.ok) throw new Error("expected success");
    const summary = await getChildForFamily(
      parent.familyId,
      result.data.childId,
    );
    expect(summary).toEqual({
      _id: result.data.childId,
      nickname: child.nickname,
      avatar: child.avatar,
    });
    expect(
      await getChildForFamily(
        new ObjectId().toHexString(),
        result.data.childId,
      ),
    ).toBeNull();
    expect(
      await getChildForFamily(parent.familyId, "unknown-child"),
    ).toBeNull();
  });

  it("validation returns the first error in form order and stores nothing", async () => {
    signInAs((await insertConsentedMainParent()).userId);
    expect(
      await createChildAccount({
        ...child,
        age: -1,
        grade: "bad",
        username: "",
      }),
    ).toMatchObject({ ok: false, error: { code: "INVALID_AGE" } });
    await expectNothingStored();
  });
  it("1c: a revoked consent record cannot authorize creation", async () => {
    const parent = await insertConsentedMainParent();
    signInAs(parent.userId);
    await getDb()
      .collection("consentRecords")
      .updateOne(
        { familyId: new ObjectId(parent.familyId) },
        { $set: { revokedAt: new Date() } },
      );
    expect(await createChildAccount(child)).toMatchObject({
      ok: false,
      error: { code: "CONSENT_NOT_CONFIRMED" },
    });
    await expectNothingStored();
  });
  it("refuses consent revoked after access checks but before the transaction", async () => {
    const parent = await insertConsentedMainParent();
    signInAs(parent.userId);
    const actual = await vi.importActual<
      typeof import("@/server/identity-access/passwords")
    >("@/server/identity-access/passwords");
    vi.mocked(hashPassword).mockImplementationOnce(async (password) => {
      const hashed = await actual.hashPassword(password);
      await getDb()
        .collection("consentRecords")
        .updateOne(
          { familyId: new ObjectId(parent.familyId) },
          { $set: { revokedAt: new Date() } },
        );
      return hashed;
    });
    expect(await createChildAccount(child)).toMatchObject({
      ok: false,
      error: { code: "CONSENT_NOT_CONFIRMED" },
    });
    await expectNothingStored();
  });
  it("6a: password-generation failure leaves no records", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    signInAs((await insertConsentedMainParent()).userId);
    vi.mocked(generateChildPassword).mockImplementationOnce(() => {
      throw new Error("entropy failure");
    });
    expect(await createChildAccount(child)).toMatchObject({
      ok: false,
      error: { code: "SAVE_FAILED" },
    });
    await expectNothingStored();
  });

  it("unexpected access-check failures return a generic result and error ID", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockedAuth.mockRejectedValueOnce(new Error("private session detail"));
    const result = await createChildAccount(child);
    expect(result).toMatchObject({
      ok: false,
      error: { code: "SAVE_FAILED" },
    });
    if (!result.ok) expect(result.error.errorId).toMatch(/^[0-9a-f-]{36}$/);
    expect(JSON.stringify(result)).not.toContain("private session detail");
    await expectNothingStored();
  });
});
