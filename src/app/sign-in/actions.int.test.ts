import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { ObjectId } from "mongodb";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { insertConsentRecord } from "../../../tests/fixtures/family";
import { resetDatabase } from "../../../tests/integration/db";

// auth() needs a real Next.js request, so the Auth.js adapter reads the session here
// and tests/e2e/sign-in.spec.ts covers the real auth() end to end.
vi.mock("@/server/identity-access/auth", () => ({ auth: vi.fn() }));
const verifiedHashes = vi.hoisted(() => [] as string[]);
vi.mock("@/server/identity-access/passwords", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/server/identity-access/passwords")>();
  return {
    ...actual,
    verifyPassword: (password: string, stored: string) => {
      verifiedHashes.push(stored);
      return actual.verifyPassword(password, stored);
    },
  };
});
const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: () =>
    Promise.resolve({
      set: (name: string, value: string) => jar.set(name, value),
    }),
}));

const { signInParent } = await import("./actions");
const { auth } = await import("@/server/identity-access/auth");
const { requireParent } = await import("@/server/identity-access/sessions");
const { hashPassword } = await import("@/server/identity-access/passwords");
const { getDb, getMongoClient } = await import("@/server/lib/db");
const { setClock, resetClock } = await import("@/server/lib/clock");
const mockedAuth = vi.mocked(
  auth as unknown as () => Promise<{ user: { id: string } } | null>,
);

const EMAIL = "invented-parent@example.test";
const PASSWORD = "invented-correct-horse";
const START = new Date("2026-11-20T12:00:00Z");
let passwordHash: string;
let currentTime: Date;

const advance = (seconds: number) => {
  currentTime = new Date(currentTime.getTime() + seconds * 1000);
};
const attempt = (password: string, email = EMAIL) =>
  signInParent({ email, password });

// A valid address of an exact length: 64 + "@" + 63 + "." + 63 + "." + the rest.
const emailOfLength = (length: number) =>
  `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(length - 193)}`;
const waitText = async () => {
  const result = await attempt("invented-wrong");
  return result.ok ? "" : result.error.message;
};
const failFiveTimes = async () => {
  for (let i = 0; i < 5; i++) await attempt("invented-wrong");
};

async function insertAccount(fields: Record<string, unknown> = {}) {
  const _id = new ObjectId();
  const familyId = new ObjectId();
  await getDb()
    .collection("users")
    .insertOne({
      _id,
      role: "parent",
      parentRole: "main",
      familyId,
      name: "Invented Parent",
      email: EMAIL,
      passwordHash,
      ...fields,
    });
  return { userId: _id.toHexString(), familyId: familyId.toHexString() };
}

describe("signInParent", () => {
  beforeAll(async () => {
    passwordHash = await hashPassword(PASSWORD);
  });

  beforeEach(async () => {
    await resetDatabase();
    jar.clear();
    verifiedHashes.length = 0;
    currentTime = START;
    setClock(() => currentTime);
  });

  afterEach(() => {
    resetClock();
    vi.restoreAllMocks();
  });

  it("creates a session that the Auth.js adapter and requireParent() read back", async () => {
    const parent = await insertAccount();
    await insertConsentRecord(parent, true);
    expect(await attempt(PASSWORD)).toEqual({ ok: true, data: null });
    const adapter = MongoDBAdapter(() => getMongoClient(), {
      databaseName: getDb().databaseName,
    });
    const stored = await adapter.getSessionAndUser?.(
      jar.get("next-auth.session-token") ?? "",
    );
    expect(stored?.user.id).toBe(parent.userId);
    mockedAuth.mockResolvedValue({ user: { id: parent.userId } });
    expect(await requireParent()).toEqual({
      ok: true,
      data: { ...parent, parentRole: "main" },
    });
  });

  it("matches the email regardless of case and surrounding spaces", async () => {
    await insertAccount();
    expect((await attempt(PASSWORD, `  ${EMAIL.toUpperCase()} `)).ok).toBe(
      true,
    );
  });

  it("gives an unknown email and a wrong password the same answer", async () => {
    await insertAccount();
    const wrong = await attempt("invented-wrong-password");
    const unknown = await attempt(PASSWORD, "nobody@example.test");
    expect(wrong).toMatchObject({
      ok: false,
      error: { code: "INVALID_CREDENTIALS" },
    });
    expect(unknown).toEqual(wrong);
    expect(jar.size).toBe(0);
  });

  it.each([
    ["a child", { role: "child" }],
    ["a Sub Parent", { parentRole: "sub" }],
  ])("refuses %s with the correct password", async (_label, fields) => {
    await insertAccount(fields);
    expect(await attempt(PASSWORD)).toMatchObject({
      ok: false,
      error: { code: "INVALID_CREDENTIALS" },
    });
    expect(await getDb().collection("sessions").countDocuments()).toBe(0);
  });

  it("signs in an admin who has a password", async () => {
    await insertAccount({ role: "admin" });
    expect((await attempt(PASSWORD)).ok).toBe(true);
    expect(await getDb().collection("sessions").countDocuments()).toBe(1);
  });

  it("refuses malformed input without creating throttle state", async () => {
    for (const input of [
      null,
      { email: "not-an-email", password: PASSWORD },
      { email: EMAIL, password: "" },
      { email: EMAIL, password: "x".repeat(129) },
      { email: emailOfLength(255), password: PASSWORD },
    ]) {
      expect(await signInParent(input)).toMatchObject({
        ok: false,
        error: { code: "INVALID_CREDENTIALS" },
      });
    }
    expect(await getDb().collection("signInAttempts").countDocuments()).toBe(0);
  });

  it("accepts an email of exactly 254 characters", async () => {
    await attempt(PASSWORD, emailOfLength(254));
    expect(await getDb().collection("signInAttempts").countDocuments()).toBe(1);
  });

  it("states the wait in rounded-up seconds, then rounded-up minutes", async () => {
    await failFiveTimes();
    advance(0.5);
    expect(await waitText()).toBe(
      "Too many attempts. Try again in 30 seconds.",
    );
    advance(29); // 0.5 seconds left
    expect(await waitText()).toBe("Too many attempts. Try again in 1 second.");
    advance(0.5);
    await attempt("invented-wrong"); // The sixth failure: a 60-second wait.
    expect(await waitText()).toBe("Too many attempts. Try again in 1 minute.");
    advance(1);
    expect(await waitText()).toBe(
      "Too many attempts. Try again in 59 seconds.",
    );
    advance(59);
    await attempt("invented-wrong"); // The seventh failure: a 120-second wait.
    advance(59); // 61 seconds left
    expect(await waitText()).toBe("Too many attempts. Try again in 2 minutes.");
    advance(1);
    expect(await waitText()).toBe("Too many attempts. Try again in 1 minute.");
  });

  it("states the 15-minute cap", async () => {
    await failFiveTimes();
    for (const wait of [30, 60, 120, 240, 480, 900]) {
      advance(wait);
      await attempt("invented-wrong");
    }
    expect(await waitText()).toBe(
      "Too many attempts. Try again in 15 minutes.",
    );
  });

  it("still asks for a wait when the count vanishes during a refusal", async () => {
    await failFiveTimes();
    vi.spyOn(
      getDb().collection("x").constructor.prototype,
      "findOne",
    ).mockResolvedValueOnce(null);
    expect(await waitText()).toBe("Too many attempts. Try again in 1 second.");
  });

  it("restarts the count 24 hours after the last wait ends, not before", async () => {
    await failFiveTimes();
    advance(30 + 24 * 60 * 60 - 1);
    await attempt("invented-wrong"); // One second early: the sixth failure.
    expect(await waitText()).toBe("Too many attempts. Try again in 1 minute.");

    advance(60 + 24 * 60 * 60);
    await failFiveTimes(); // The count restarted, so five more get no wait.
    const row = await getDb().collection("signInAttempts").findOne({});
    expect(row?.failures).toBe(5);
    expect(await waitText()).toBe(
      "Too many attempts. Try again in 30 seconds.",
    );
  });

  it("purges only counts past their expiry", async () => {
    const { purgeExpiredSignInAttempts } =
      await import("@/server/identity-access/sign-in-throttle");
    await attempt("invented-wrong");
    advance(12 * 60 * 60);
    await attempt("invented-wrong", "second@example.test");
    advance(12 * 60 * 60 - 1);
    expect(await purgeExpiredSignInAttempts()).toBe(0);
    advance(1);
    expect(await purgeExpiredSignInAttempts()).toBe(1);
    const left = await getDb()
      .collection<{ accountKey: string }>("signInAttempts")
      .find()
      .toArray();
    expect(left.map((row) => row.accountKey)).toEqual(["second@example.test"]);
  });

  it("checks an unknown email against a decoy of the same cost as a real hash", async () => {
    await attempt(PASSWORD, "nobody@example.test");
    expect(verifiedHashes).toHaveLength(1);
    const [scheme, n, r, p, salt, key] = (verifiedHashes[0] ?? "").split("$");
    const real = passwordHash.split("$");
    expect([scheme, n, r, p]).toEqual(real.slice(0, 4));
    expect(Buffer.from(salt, "base64")).toHaveLength(
      Buffer.from(real[4] ?? "", "base64").length,
    );
    expect(Buffer.from(key, "base64")).toHaveLength(
      Buffer.from(real[5] ?? "", "base64").length,
    );
  });

  it("logs each refusal as a security event with no email or password", async () => {
    const logged = vi.spyOn(console, "warn").mockImplementation(() => {});
    await insertAccount();
    await signInParent({ email: "not-an-email", password: PASSWORD });
    await failFiveTimes();
    await attempt("invented-wrong");
    const events = logged.mock.calls.map(
      ([line]) => JSON.parse(String(line)) as Record<string, string>,
    );
    expect(events.map((event) => event.code)).toEqual([
      ...Array<string>(6).fill("INVALID_CREDENTIALS"),
      "TOO_MANY_ATTEMPTS",
    ]);
    for (const event of events) {
      expect(Object.keys(event).sort()).toEqual([
        "code",
        "event",
        "eventId",
        "level",
      ]);
      expect(event.event).toBe("sign-in-refused");
    }
    const output = logged.mock.calls.flat().join(" ");
    expect(output).not.toContain(EMAIL);
    expect(output).not.toContain("invented-wrong");
    expect(output).not.toContain(PASSWORD);
  });

  it("doubles the wait after 5 failures, caps it at 15 minutes and never locks out", async () => {
    await insertAccount();
    for (let i = 0; i < 5; i++) {
      expect(await attempt("invented-wrong")).toMatchObject({
        error: { code: "INVALID_CREDENTIALS" },
      });
    }
    // The correct password also waits, or the delay would not slow guessing.
    expect(await attempt(PASSWORD)).toEqual({
      ok: false,
      error: {
        code: "TOO_MANY_ATTEMPTS",
        message: "Too many attempts. Try again in 30 seconds.",
      },
    });

    for (const wait of [30, 60, 120, 240, 480, 900, 900]) {
      advance(wait - 1);
      expect(await attempt("invented-wrong")).toMatchObject({
        error: { code: "TOO_MANY_ATTEMPTS" },
      });
      advance(1);
      expect(await attempt("invented-wrong")).toMatchObject({
        error: { code: "INVALID_CREDENTIALS" },
      });
    }

    advance(900);
    expect((await attempt(PASSWORD)).ok).toBe(true);
    expect(await getDb().collection("signInAttempts").countDocuments()).toBe(0);
  });

  it("throttles unknown emails the same way", async () => {
    for (let i = 0; i < 5; i++) await attempt("invented-wrong");
    expect(await attempt("invented-wrong")).toMatchObject({
      error: { code: "TOO_MANY_ATTEMPTS" },
    });
  });

  it("does not let parallel guesses pass the limit", async () => {
    await insertAccount();
    const results = await Promise.all(
      Array.from({ length: 12 }, () => attempt("invented-wrong")),
    );
    const checked = results.filter(
      (result) => !result.ok && result.error.code === "INVALID_CREDENTIALS",
    );
    expect(checked).toHaveLength(5);
  });

  it("logs no email or password when sign-in fails unexpectedly", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(
      getDb().collection("x").constructor.prototype,
      "findOneAndUpdate",
    ).mockRejectedValueOnce(new Error(`failed for ${EMAIL} ${PASSWORD}`));
    expect(await attempt(PASSWORD)).toMatchObject({
      error: { code: "SIGN_IN_FAILED" },
    });
    const output = logged.mock.calls.flat().join(" ");
    expect(output).not.toContain(EMAIL);
    expect(output).not.toContain(PASSWORD);
  });
});
