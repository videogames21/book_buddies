import { ClientSession, MongoNetworkTimeoutError, ObjectId } from "mongodb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { insertBatch } from "../../../../../tests/fixtures/batches";
import { insertBook } from "../../../../../tests/fixtures/catalog";
import { insertChild } from "../../../../../tests/fixtures/children";
import { insertConsentedMainParent } from "../../../../../tests/fixtures/family";
import { resetDatabase } from "../../../../../tests/integration/db";
import type { ChildSession } from "@/server/identity-access/sessions";

// UC-REC-kid-review, the action's rows (design/rec.md, Tests): authorization, input,
// the revalidation half of 7a response lost, logging and the child-facing result.
// recordReaction's own rows are in src/server/recommendation/reactions.int.test.ts.
// Invented data only.

vi.mock("@/server/identity-access/sessions", () => ({ requireChild: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { reactToRecommendation } = await import("./actions");
const { requireChild } = await import("@/server/identity-access/sessions");
const { revalidatePath } = await import("next/cache");
const { fail, ok } = await import("@/server/lib/action-result");
const { insertChildIdentity } =
  await import("@/server/child-identity/child-identity");
const { getDb, withTransaction } = await import("@/server/lib/db");

const mockedSession = vi.mocked(requireChild);
const revalidated = vi.mocked(revalidatePath);
const BOTH_PATHS = ["/child/recommendations", "/child/shelf"];
const RELEASED_AT = new Date("2026-11-25T12:00:00Z");

const col = (name: string) => getDb().collection(name);

async function snapshot() {
  return {
    reactions: await col("recommendationReactions").find().toArray(),
    shelf: await col("shelfEntries").find().toArray(),
  };
}

/** A signed-in child of a consented family, aged 7, with one released book. */
async function signedInChildWithBook(): Promise<{
  child: ChildSession;
  bookId: string;
}> {
  const parent = await insertConsentedMainParent();
  const childId = await insertChild(parent.familyId);
  await withTransaction((tx) =>
    insertChildIdentity(tx, { childId, age: 7, grade: "2" }),
  );
  const child: ChildSession = {
    userId: new ObjectId().toHexString(),
    childId,
    sessionId: new ObjectId(),
  };
  mockedSession.mockResolvedValue(ok(child));
  const bookId = await insertBook("active");
  await insertBatch({
    childId,
    bookIds: [bookId],
    status: "released",
    releasedAt: RELEASED_AT,
  });
  return { child, bookId };
}

/** Makes the next commit apply and then report an unknown result (7a, response lost). */
function loseNextCommitResponse() {
  // eslint-disable-next-line @typescript-eslint/unbound-method -- called with apply(this)
  const original = ClientSession.prototype.withTransaction;
  return vi
    .spyOn(ClientSession.prototype, "withTransaction")
    .mockImplementationOnce(async function (
      this: ClientSession,
      ...args: Parameters<ClientSession["withTransaction"]>
    ) {
      await original.apply(this, args);
      const err = new MongoNetworkTimeoutError("commit outcome unknown");
      err.addErrorLabel("UnknownTransactionCommitResult");
      throw err;
    });
}

beforeEach(async () => {
  await resetDatabase();
  revalidated.mockClear();
});
afterEach(() => {
  vi.restoreAllMocks();
  mockedSession.mockReset();
});

describe("reactToRecommendation, authorization", () => {
  it.each(["NOT_SIGNED_IN", "NOT_A_CHILD"] as const)(
    "a session refused as %s writes nothing and revalidates nothing",
    async (code) => {
      const { bookId } = await signedInChildWithBook();
      mockedSession.mockResolvedValue(fail(code, "Fixture session refusal"));
      const before = await snapshot();

      await expect(
        reactToRecommendation({ bookId, reaction: "yes" }),
      ).resolves.toMatchObject({ ok: false, error: { code } });
      expect(await snapshot()).toEqual(before);
      expect(revalidated).not.toHaveBeenCalled();
    },
  );

  it("takes no child ID: one sent by the caller is INVALID_INPUT, and the session's child is the one that reacts", async () => {
    const other = await signedInChildWithBook();
    const { child, bookId } = await signedInChildWithBook();
    const before = await snapshot();

    await expect(
      reactToRecommendation({
        bookId: other.bookId,
        reaction: "yes",
        childId: other.child.childId,
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: "INVALID_INPUT" } });
    expect(await snapshot()).toEqual(before);

    // Without the extra key, the other child's book is not in this child's list.
    await expect(
      reactToRecommendation({ bookId: other.bookId, reaction: "yes" }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "BOOK_NOT_IN_LIST" },
    });
    expect(await snapshot()).toEqual(before);

    await expect(
      reactToRecommendation({ bookId, reaction: "yes" }),
    ).resolves.toMatchObject({ ok: true });
    expect(
      await col("recommendationReactions")
        .find({}, { projection: { _id: 0, childId: 1 } })
        .toArray(),
    ).toEqual([{ childId: child.childId }]);
  });
});

describe("reactToRecommendation, input", () => {
  it.each([
    [{ reaction: "yes" }],
    [{ bookId: "book", reaction: "love" }],
    [{ bookId: "book", reaction: "notForMe", declineReason: "boring" }],
    [null],
  ])(
    "refuses %j as INVALID_INPUT, writes nothing and revalidates nothing",
    async (input) => {
      await signedInChildWithBook();
      const before = await snapshot();
      await expect(reactToRecommendation(input)).resolves.toMatchObject({
        ok: false,
        error: { code: "INVALID_INPUT" },
      });
      expect(await snapshot()).toEqual(before);
      expect(revalidated).not.toHaveBeenCalled();
    },
  );

  // Review of #152: refused by the schema, never dropped by recordReaction.
  it.each(["yes", "maybeLater"] as const)(
    "refuses a decline reason sent with %s as INVALID_INPUT and writes nothing",
    async (reaction) => {
      const { bookId } = await signedInChildWithBook();
      const before = await snapshot();
      await expect(
        reactToRecommendation({ bookId, reaction, declineReason: "tooEasy" }),
      ).resolves.toMatchObject({ ok: false, error: { code: "INVALID_INPUT" } });
      expect(await snapshot()).toEqual(before);
      expect(revalidated).not.toHaveBeenCalled();
    },
  );
});

describe("reactToRecommendation, results and revalidation", () => {
  it("child-facing: an ok result holds only the shelf outcome, and revalidates the list and the shelf", async () => {
    const { bookId } = await signedInChildWithBook();
    const result = await reactToRecommendation({ bookId, reaction: "yes" });
    expect(result).toEqual({ ok: true, data: { shelf: "added" } });
    expect(revalidated.mock.calls.map(([path]) => path)).toEqual(BOTH_PATHS);
  });

  it("7a, response lost: OUTCOME_UNKNOWN revalidates both paths; the retry is BOOK_NOT_IN_LIST, writes nothing and revalidates both again", async () => {
    const { bookId } = await signedInChildWithBook();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const spy = loseNextCommitResponse();

    const first = await reactToRecommendation({
      bookId,
      reaction: "maybeLater",
    });
    spy.mockRestore();

    expect(first).toMatchObject({
      ok: false,
      error: {
        code: "OUTCOME_UNKNOWN",
        errorId: expect.any(String) as unknown,
      },
    });
    expect(JSON.stringify(first)).not.toContain("commit outcome unknown");
    expect(revalidated.mock.calls.map(([path]) => path)).toEqual(BOTH_PATHS);
    expect(await col("recommendationReactions").countDocuments()).toBe(1);
    expect(await col("shelfEntries").countDocuments()).toBe(1);

    revalidated.mockClear();
    const before = await snapshot();
    await expect(
      reactToRecommendation({ bookId, reaction: "maybeLater" }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "BOOK_NOT_IN_LIST" },
    });
    expect(await snapshot()).toEqual(before);
    expect(revalidated.mock.calls.map(([path]) => path)).toEqual(BOTH_PATHS);
  });

  it("7a: SAVE_FAILED revalidates nothing", async () => {
    const { bookId } = await signedInChildWithBook();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(ClientSession.prototype, "withTransaction").mockRejectedValueOnce(
      new Error("invented failure"),
    );
    await expect(
      reactToRecommendation({ bookId, reaction: "yes" }),
    ).resolves.toMatchObject({ ok: false, error: { code: "SAVE_FAILED" } });
    expect(revalidated).not.toHaveBeenCalled();
  });

  it("a revalidation that throws is logged, and the ok result stands", async () => {
    const { bookId } = await signedInChildWithBook();
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    revalidated.mockImplementationOnce(() => {
      throw new Error("invented revalidation failure");
    });
    await expect(
      reactToRecommendation({ bookId, reaction: "notForMe" }),
    ).resolves.toEqual({ ok: true, data: { shelf: "none" } });
    expect(logged).toHaveBeenCalledTimes(1);
    expect(revalidated).toHaveBeenCalledTimes(2);
  });
});

describe("reactToRecommendation, logging (§8.2.7)", () => {
  it("after a reaction with a reason, a refused one and a failed save, the logs hold no decline reason and no child ID with a book ID", async () => {
    const { child, bookId } = await signedInChildWithBook();
    const second = await insertBook("active");
    await insertBatch({
      childId: child.childId,
      bookIds: [second],
      status: "released",
      releasedAt: RELEASED_AT,
    });
    const spies = (["log", "info", "warn", "error", "debug"] as const).map(
      (level) => vi.spyOn(console, level).mockImplementation(() => {}),
    );

    await reactToRecommendation({
      bookId,
      reaction: "notForMe",
      declineReason: "notMyStyle",
    });
    await reactToRecommendation({
      bookId,
      reaction: "notForMe",
      declineReason: "notMyStyle",
    });
    vi.spyOn(ClientSession.prototype, "withTransaction").mockRejectedValueOnce(
      new Error("invented failure"),
    );
    await reactToRecommendation({
      bookId: second,
      reaction: "notForMe",
      declineReason: "tooHard",
    });

    const lines = spies.flatMap((spy) =>
      spy.mock.calls.map((call) => call.map(String).join(" ")),
    );
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      for (const reason of ["notMyStyle", "tooHard", "Not my style"]) {
        expect(line).not.toContain(reason);
      }
      expect(line.includes(child.childId) && line.includes(bookId)).toBe(false);
      expect(line.includes(child.childId) && line.includes(second)).toBe(false);
    }
  });
});
