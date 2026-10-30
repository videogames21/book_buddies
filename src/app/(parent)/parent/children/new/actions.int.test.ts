import { ObjectId } from "mongodb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { insertConsentedMainParent, insertConsentRecord } from "../../../../../../tests/fixtures/family";
import { insertParent, insertUserWithRole } from "../../../../../../tests/fixtures/users";
import { resetDatabase } from "../../../../../../tests/integration/db";

vi.mock("@/server/identity-access/auth", () => ({ auth: vi.fn() }));
vi.mock("@/server/child-identity/child-identity", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/child-identity/child-identity")>();
  return { ...actual, insertChildIdentity: vi.fn(actual.insertChildIdentity) };
});
vi.mock("@/server/identity-access/child-credentials", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/identity-access/child-credentials")>();
  return { ...actual, insertChildCredential: vi.fn(actual.insertChildCredential) };
});

const { auth } = await import("@/server/identity-access/auth");
const { insertChildIdentity } = await import("@/server/child-identity/child-identity");
const { insertChildCredential } = await import("@/server/identity-access/child-credentials");
const { verifyPassword } = await import("@/server/identity-access/passwords");
const { getDb } = await import("@/server/lib/db");
const { createChildAccount } = await import("./actions");

const mockedAuth = vi.mocked(auth as unknown as () => Promise<{ user: { id: string } } | null>);

function signInAs(userId: string | null) {
  mockedAuth.mockResolvedValue(userId ? { user: { id: userId } } : null);
}

// Invented test data only.
const child = {
  name: "Invented Child",
  nickname: "Starfish",
  age: 8,
  grade: "3",
  username: "Star_Reader",
  readingLevel: { scale: "lexile", value: "650L" },
  avatar: "1-1",
};

async function stored() {
  const db = getDb();
  return {
    children: await db.collection("children").find().toArray(),
    identities: await db.collection("childIdentities").find().toArray(),
    credentials: await db.collection("users").find({ role: "child" }).toArray(),
  };
}

async function expectNothingStored() {
  const { children, identities, credentials } = await stored();
  expect(children).toHaveLength(0);
  expect(identities).toHaveLength(0);
  expect(credentials).toHaveLength(0);
}

describe("createChildAccount (UC-PAR-create-kid-account)", () => {
  beforeEach(async () => {
    await resetDatabase();
    vi.mocked(insertChildIdentity).mockClear();
    vi.mocked(insertChildCredential).mockClear();
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

    const childId = children[0]!._id as ObjectId;
    expect(result.data.childId).toBe(childId.toHexString());
    expect(children[0]).toMatchObject({ familyId: new ObjectId(parent.familyId), nickname: "Starfish", avatar: "1-1" });
    expect(identities[0]).toMatchObject({
      childId,
      realName: "Invented Child",
      age: 8,
      grade: "3",
      readingLevelScale: "lexile",
      readingLevelValue: "650L",
    });
    expect(credentials[0]).toMatchObject({ childId, username: "star_reader" });
    expect(result.data.username).toBe("star_reader");
    expect(await verifyPassword(result.data.password, credentials[0]!.passwordHash as string)).toBe(true);
  });

  it("main, skipped reading level: the identity has no reading level and the save succeeds", async () => {
    signInAs((await insertConsentedMainParent()).userId);
    const { readingLevel: _skipped, ...withoutLevel } = child;

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

    expect(await createChildAccount(child)).toMatchObject({ ok: false, error: { code: "NOT_MAIN_PARENT" } });
    await expectNothingStored();
  });

  it("1c: a family without confirmed consent gets CONSENT_NOT_CONFIRMED and nothing is stored", async () => {
    const pending = await insertParent({ parentRole: "main" });
    await insertConsentRecord(pending.familyId, false);
    signInAs(pending.userId);
    expect(await createChildAccount(child)).toMatchObject({ ok: false, error: { code: "CONSENT_NOT_CONFIRMED" } });

    const noRecord = await insertParent({ parentRole: "main" });
    signInAs(noRecord.userId);
    expect(await createChildAccount(child)).toMatchObject({ ok: false, error: { code: "CONSENT_NOT_CONFIRMED" } });
    await expectNothingStored();
  });

  it("returns the field's error code when validation fails, and stores nothing", async () => {
    signInAs((await insertConsentedMainParent()).userId);
    expect(await createChildAccount({ ...child, name: " " })).toMatchObject({
      ok: false,
      error: { code: "NAME_REQUIRED" },
    });
    await expectNothingStored();
  });

  it("4g: a username used by another child or a Sub Parent, in any letter case, is USERNAME_TAKEN and nothing new is stored", async () => {
    signInAs((await insertConsentedMainParent()).userId);
    expect((await createChildAccount(child)).ok).toBe(true);

    const again = await createChildAccount({ ...child, nickname: "Comet", username: "STAR_reader" });
    expect(again).toMatchObject({ ok: false, error: { code: "USERNAME_TAKEN" } });

    await getDb().collection("users").insertOne({ role: "parent", parentRole: "sub", username: "sub_parent_one" });
    const subName = await createChildAccount({ ...child, nickname: "Comet", username: "Sub_Parent_One" });
    expect(subName).toMatchObject({ ok: false, error: { code: "USERNAME_TAKEN" } });

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
    expect(results.filter((r) => !r.ok && r.error.code === "USERNAME_TAKEN")).toHaveLength(1);
    const { children, identities, credentials } = await stored();
    expect(children).toHaveLength(1);
    expect(identities).toHaveLength(1);
    expect(credentials).toHaveLength(1);
  });

  it("5a: when the identity insert fails, nothing remains and the result is SAVE_FAILED with an error ID", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    signInAs((await insertConsentedMainParent()).userId);
    vi.mocked(insertChildIdentity).mockRejectedValueOnce(new Error("database timeout"));

    const result = await createChildAccount(child);

    expect(result).toMatchObject({ ok: false, error: { code: "SAVE_FAILED" } });
    expect(!result.ok && result.error.errorId).toMatch(/^[0-9a-f-]{36}$/);
    expect(!result.ok && result.error.message).not.toContain("timeout");
    await expectNothingStored();
  });

  it("6a: when the credential insert fails, no child account or identity remains, and the result is SAVE_FAILED", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    signInAs((await insertConsentedMainParent()).userId);
    vi.mocked(insertChildCredential).mockRejectedValueOnce(new Error("write failed"));

    expect(await createChildAccount(child)).toMatchObject({ ok: false, error: { code: "SAVE_FAILED" } });
    await expectNothingStored();
  });

  it("7a: the plaintext password is stored nowhere; only its hash is", async () => {
    signInAs((await insertConsentedMainParent()).userId);
    const result = await createChildAccount(child);
    if (!result.ok) throw new Error("expected success");

    const db = getDb();
    for (const { name } of await db.listCollections().toArray()) {
      const everything = JSON.stringify(await db.collection(name).find().toArray());
      expect(everything, name).not.toContain(result.data.password);
    }
    const credential = (await stored()).credentials[0]!;
    expect(Object.keys(credential).sort()).toEqual(["_id", "childId", "createdAt", "passwordHash", "role", "username"]);
  });

  it("authorization: a family ID in the request is ignored; the child joins the session's family", async () => {
    const parent = await insertConsentedMainParent();
    const otherFamily = new ObjectId();
    signInAs(parent.userId);

    expect((await createChildAccount({ ...child, familyId: otherFamily.toHexString() })).ok).toBe(true);
    expect((await stored()).children[0]!.familyId).toEqual(new ObjectId(parent.familyId));
  });

  it("authorization: no session, a child session and an admin session are refused, and nothing is stored", async () => {
    signInAs(null);
    expect(await createChildAccount(child)).toMatchObject({ ok: false, error: { code: "NOT_SIGNED_IN" } });
    for (const role of ["child", "admin"] as const) {
      signInAs((await insertUserWithRole(role)).userId);
      expect(await createChildAccount(child)).toMatchObject({ ok: false, error: { code: "NOT_A_PARENT" } });
    }
    expect(await getDb().collection("children").countDocuments()).toBe(0);
    expect(await getDb().collection("childIdentities").countDocuments()).toBe(0);
  });

  it("logging: after a successful and a failed creation, the logs hold no child detail, username or password", async () => {
    const lines: string[] = [];
    for (const level of ["log", "info", "warn", "error", "debug"] as const) {
      vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
        lines.push(args.map(String).join(" "));
      });
    }
    signInAs((await insertConsentedMainParent()).userId);

    const success = await createChildAccount(child);
    await createChildAccount({ ...child, nickname: "Comet" }); // USERNAME_TAKEN
    vi.mocked(insertChildCredential).mockRejectedValueOnce(
      Object.assign(new Error('write failed for username "other_reader"'), { code: 99 }),
    );
    await createChildAccount({ ...child, username: "other_reader" }); // SAVE_FAILED

    const logged = lines.join("\n").toLowerCase();
    const secrets = ["invented child", "starfish", "star_reader", "other_reader", "650l"];
    if (success.ok) secrets.push(success.data.password);
    for (const secret of secrets) expect(logged).not.toContain(secret);
  });

  it("no real name to the child: the child account record holds only the ID, family, nickname and avatar", async () => {
    signInAs((await insertConsentedMainParent()).userId);
    await createChildAccount(child);
    expect(Object.keys((await stored()).children[0]!).sort()).toEqual(["_id", "avatar", "createdAt", "familyId", "nickname"]);
  });
});
