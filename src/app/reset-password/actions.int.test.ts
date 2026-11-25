import { ObjectId } from "mongodb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { insertParent } from "../../../tests/fixtures/users";
import { resetDatabase } from "../../../tests/integration/db";

const { resetPassword } = await import("./actions");
const { issueResetToken } =
  await import("@/server/identity-access/password-resets");
const { hashPassword, verifyPassword } =
  await import("@/server/identity-access/passwords");
const { signInMainParent } = await import("@/server/identity-access/sign-in");
const { createDatabaseSession } =
  await import("@/server/identity-access/sessions");
const { getDb } = await import("@/server/lib/db");
const { resetClock, setClock } = await import("@/server/lib/clock");

const NOW = new Date("2026-11-20T12:00:00Z");
const OLD_PASSWORD = "invented old password";
const NEW_PASSWORD = "invented new password";

const users = () =>
  getDb().collection<{ _id: ObjectId; passwordHash?: string; email?: string }>(
    "users",
  );
const count = (name: string, filter = {}) =>
  getDb().collection(name).countDocuments(filter);

/** A Main Parent with a password, two sessions, a throttle row and a fresh reset token. */
async function seed() {
  const parent = await insertParent({ parentRole: "main" });
  const _id = new ObjectId(parent.userId);
  await users().updateOne(
    { _id },
    { $set: { passwordHash: await hashPassword(OLD_PASSWORD) } },
  );
  const email = `parent-${parent.userId}@example.test`;
  await createDatabaseSession(parent.userId);
  await createDatabaseSession(parent.userId);
  await getDb()
    .collection("signInAttempts")
    .insertOne({
      accountKey: email,
      failures: 6,
      allowedAt: new Date(NOW.getTime() + 60_000),
      expiresAt: new Date(NOW.getTime() + 86_400_000),
    });
  const issued = await issueResetToken(parent.userId);
  if (!issued) throw new Error("no token issued");
  return { ...parent, _id, email, token: issued.token };
}

async function hashOf(_id: ObjectId) {
  return (await users().findOne({ _id }))?.passwordHash ?? "";
}

beforeEach(async () => {
  await resetDatabase();
  setClock(() => NOW);
});
afterEach(() => {
  resetClock();
  vi.restoreAllMocks();
});

describe("resetPassword (OI-44)", () => {
  it("replaces the hash, ends every session, clears the throttle and appends one audit entry", async () => {
    const parent = await seed();
    expect(
      await resetPassword({ token: parent.token, password: NEW_PASSWORD }),
    ).toEqual({ ok: true, data: null });

    expect(await verifyPassword(NEW_PASSWORD, await hashOf(parent._id))).toBe(
      true,
    );
    expect(await count("sessions", { userId: parent._id })).toBe(0);
    expect(await count("signInAttempts")).toBe(0);
    expect(await count("passwordResets")).toBe(0);
    expect(
      await getDb()
        .collection("auditLog")
        .find({}, { projection: { _id: 0 } })
        .toArray(),
    ).toEqual([
      {
        actorId: parent._id,
        actorRole: "parent",
        event: "account.password-reset",
        userId: parent._id,
        occurredAt: NOW,
      },
    ]);

    expect(await signInMainParent(parent.email, OLD_PASSWORD)).toMatchObject({
      error: { code: "INVALID_CREDENTIALS" },
    });
    expect(await signInMainParent(parent.email, NEW_PASSWORD)).toMatchObject({
      ok: true,
    });
  });

  it("the token cannot be used twice", async () => {
    const parent = await seed();
    await resetPassword({ token: parent.token, password: NEW_PASSWORD });
    expect(
      await resetPassword({
        token: parent.token,
        password: "another password",
      }),
    ).toMatchObject({ error: { code: "RESET_LINK_INVALID" } });
    expect(await verifyPassword(NEW_PASSWORD, await hashOf(parent._id))).toBe(
      true,
    );
  });

  it("refuses an unknown, replaced or expired token and changes nothing", async () => {
    const parent = await seed();
    const before = await hashOf(parent._id);
    const refused = async (token: unknown) => {
      expect(
        await resetPassword({ token, password: NEW_PASSWORD }),
      ).toMatchObject({ error: { code: "RESET_LINK_INVALID" } });
      expect(await hashOf(parent._id)).toBe(before);
      expect(await count("sessions", { userId: parent._id })).toBe(2);
      expect(await count("auditLog")).toBe(0);
    };
    await refused("invented-unknown-token");
    await refused("");
    await refused(42);

    setClock(() => new Date(NOW.getTime() + 5 * 60 * 1000));
    const replacement = await issueResetToken(parent.userId);
    await refused(parent.token);

    setClock(() => new Date(NOW.getTime() + 5 * 60 * 1000 + 60 * 60 * 1000));
    await refused(replacement?.token);
  });

  it("refuses a password breaking the 4c rule and leaves the token usable", async () => {
    const parent = await seed();
    const before = await hashOf(parent._id);
    for (const password of [
      "short",
      "x".repeat(129),
      parent.email.toUpperCase(),
    ]) {
      expect(
        await resetPassword({ token: parent.token, password }),
      ).toMatchObject({ error: { code: "WEAK_PASSWORD" } });
    }
    expect(await hashOf(parent._id)).toBe(before);
    expect(
      await resetPassword({ token: parent.token, password: NEW_PASSWORD }),
    ).toMatchObject({ ok: true });
  });

  it("two resets with one token at once change the password once", async () => {
    const parent = await seed();
    const results = await Promise.all([
      resetPassword({ token: parent.token, password: NEW_PASSWORD }),
      resetPassword({ token: parent.token, password: "another password" }),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(await count("auditLog")).toBe(1);
  });

  it("logs no token, password or email when it fails unexpectedly", async () => {
    const lines: string[] = [];
    vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      lines.push(args.map(String).join(" "));
    });
    const parent = await seed();
    vi.spyOn(
      getDb().collection("auditLog").constructor.prototype,
      "insertOne",
    ).mockRejectedValueOnce(new Error(`failed for ${parent.email}`));
    const result = await resetPassword({
      token: parent.token,
      password: NEW_PASSWORD,
    });
    expect(result).toMatchObject({ error: { code: "SAVE_FAILED" } });
    // Nothing changed, so the same link still works.
    expect(await count("passwordResets")).toBe(1);
    expect(await count("sessions", { userId: parent._id })).toBe(2);
    const output = lines.join("\n") + JSON.stringify(result);
    for (const secret of [parent.token, NEW_PASSWORD, parent.email]) {
      expect(output).not.toContain(secret);
    }
  });
});
