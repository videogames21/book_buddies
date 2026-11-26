import { randomUUID } from "node:crypto";
import { ObjectId } from "mongodb";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { insertBook } from "../../../../../../tests/fixtures/catalog";
import { insertChild } from "../../../../../../tests/fixtures/children";
import { insertConsentedMainParent } from "../../../../../../tests/fixtures/family";
import { resetDatabase } from "../../../../../../tests/integration/db";
import { getQuizCatalogGuard } from "@/server/catalog/rule-candidates";
import { insertChildIdentity } from "@/server/child-identity/child-identity";
import { requireChild } from "@/server/identity-access/sessions";
import { fail, ok } from "@/server/lib/action-result";
import { getDb, withTransaction } from "@/server/lib/db";
import { readRulesQuiz } from "@/server/recommendation/quiz-submission";
import { startRecommendationQuiz, submitRecommendationQuiz } from "./actions";

vi.mock("@/server/identity-access/sessions", () => ({ requireChild: vi.fn() }));
vi.mock("@/server/catalog/rule-candidates", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("@/server/catalog/rule-candidates")
  >()),
  getQuizCatalogGuard: vi.fn(),
}));

const mockedSession = vi.mocked(requireChild);
const fixtureGuard = vi.mocked(getQuizCatalogGuard);
const pending = () => getDb().collection("recommendationBatches");
const answers = () => ({ mood: "any", length: "any", requestId: randomUUID() });

beforeEach(async () => {
  await resetDatabase();
  fixtureGuard.mockReturnValue(() => Promise.resolve(true));
});
afterEach(() => {
  vi.restoreAllMocks();
  mockedSession.mockReset();
  fixtureGuard.mockReset();
});

async function signInFixture(withProfile: boolean) {
  const parent = await insertConsentedMainParent();
  const childId = await insertChild(parent.familyId);
  if (withProfile) {
    await withTransaction((tx) =>
      insertChildIdentity(tx, { childId, age: 8, grade: "3" }),
    );
  }
  mockedSession.mockResolvedValue(
    ok({
      childId,
      userId: new ObjectId().toHexString(),
      sessionId: new ObjectId(),
    }),
  );
  return childId;
}

it.each(["NOT_SIGNED_IN", "NOT_A_CHILD"] as const)(
  "returns %s before processing an action's choices",
  async (code) => {
    mockedSession.mockResolvedValue(fail(code, "Fixture session refusal"));
    await expect(startRecommendationQuiz()).resolves.toMatchObject({
      error: { code },
    });
    await expect(submitRecommendationQuiz({})).resolves.toMatchObject({
      error: { code },
    });
    await expect(pending().countDocuments()).resolves.toBe(0);
  },
);

it("refuses missing or invented choices and rejects a child ID sent by the caller", async () => {
  const childId = await signInFixture(true);
  const form = answers();
  for (const input of [
    { requestId: form.requestId },
    { ...form, mood: "invented" },
    { ...form, childId },
  ]) {
    await expect(submitRecommendationQuiz(input)).resolves.toMatchObject({
      ok: false,
      error: { code: "INVALID_QUIZ" },
    });
  }
  await expect(pending().countDocuments()).resolves.toBe(0);
});

it("logs a missing profile for Start and Submit and keeps the readiness read silent", async () => {
  const childId = await signInFixture(false);
  const children = getDb().collection<{ _id: string }>("children");
  const childBefore = await children.findOne({ _id: childId });
  const form = answers();
  const log = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  const refusal = {
    ok: false,
    error: {
      code: "PROFILE_INCOMPLETE",
      message: "Ask a parent to finish your profile.",
    },
  };
  await expect(readRulesQuiz(childId)).resolves.toMatchObject(refusal);
  expect(log).not.toHaveBeenCalled();
  await expect(startRecommendationQuiz()).resolves.toMatchObject(refusal);
  await expect(submitRecommendationQuiz(form)).resolves.toMatchObject(refusal);
  expect(log).toHaveBeenCalledTimes(2);
  for (const [json] of log.mock.calls) {
    expect(typeof json).toBe("string");
    expect(String(json)).toContain('"event":"recommendation-request-failed"');
    expect(String(json)).toContain('"code":"PROFILE_INCOMPLETE"');
    expect(String(json)).not.toContain(childId);
    expect(String(json)).not.toContain(form.requestId);
  }
  await expect(children.findOne({ _id: childId })).resolves.toEqual(
    childBefore,
  );
  await expect(pending().countDocuments()).resolves.toBe(0);
});

it("returns only acknowledgment and stores three eligible books in deterministic order", async () => {
  const childId = await signInFixture(true);
  const ids = [
    await insertBook("active", "Garden"),
    await insertBook("active", "Park"),
    await insertBook("active", "Bicycle"),
  ];
  await insertBook("draft", "Draft");
  await insertBook("blocked", "Blocked");
  const form = answers();

  await expect(startRecommendationQuiz()).resolves.toEqual({
    ok: true,
    data: "open",
  });
  await expect(pending().countDocuments()).resolves.toBe(0);
  await expect(submitRecommendationQuiz(form)).resolves.toEqual({
    ok: true,
    data: null,
  });
  const batch = await pending().findOne({ childId });
  expect(batch).toMatchObject({
    source: "rules",
    status: "pending",
    bookIds: ids.sort(),
  });
  expect(Object.keys(batch ?? {}).sort()).toEqual([
    "_id",
    "bookIds",
    "childId",
    "createdAt",
    "handoffDeadline",
    "requestId",
    "source",
    "status",
  ]);
  await expect(startRecommendationQuiz()).resolves.toEqual({
    ok: true,
    data: "received",
  });
});
