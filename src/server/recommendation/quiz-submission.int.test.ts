import { randomUUID } from "node:crypto";
import { ClientSession, MongoNetworkError, ObjectId } from "mongodb";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { insertBatch } from "../../../tests/fixtures/batches";
import { insertBook } from "../../../tests/fixtures/catalog";
import { insertChild } from "../../../tests/fixtures/children";
import { insertConsentedMainParent } from "../../../tests/fixtures/family";
import { resetDatabase } from "../../../tests/integration/db";
import { insertChildIdentity } from "@/server/child-identity/child-identity";
import { setClock, resetClock } from "@/server/lib/clock";
import { getConfig } from "@/server/lib/config";
import { getDb, withTransaction } from "@/server/lib/db";
import {
  listPendingBatchesForFamily,
  listReleasedBatchesForChild,
} from "./batches";
import {
  readRulesQuiz,
  startRulesQuiz,
  submitRulesQuiz,
} from "./quiz-submission";

const clock = new Date("2026-11-26T13:00:00Z");
const answer = () =>
  ({ mood: "any", length: "any", requestId: randomUUID() }) as const;
const batches = () => getDb().collection("recommendationBatches");

beforeEach(async () => {
  await resetDatabase();
  setClock(() => clock);
});

afterEach(() => {
  resetClock();
  vi.restoreAllMocks();
});

async function seedChild() {
  const parent = await insertConsentedMainParent();
  const childId = await insertChild(parent.familyId);
  await withTransaction((tx) =>
    insertChildIdentity(tx, { childId, age: 8, grade: "3" }),
  );
  return { childId, familyId: parent.familyId };
}

it("keeps the normal quiz entry unavailable without the Catalog guard and saves nothing", async () => {
  const { childId } = await seedChild();
  await insertBook("active");
  const refusal = { ok: false, error: { code: "RULES_UNAVAILABLE" } };
  await expect(startRulesQuiz(childId)).resolves.toMatchObject(refusal);
  await expect(readRulesQuiz(childId)).resolves.toMatchObject(refusal);
  await expect(submitRulesQuiz(childId, answer())).resolves.toMatchObject(
    refusal,
  );
  await expect(batches().countDocuments()).resolves.toBe(0);
});

it("guards the ranked IDs and hands off one pending batch, even after competing submits and retries", async () => {
  const { childId, familyId } = await seedChild();
  const bookId = await insertBook("active");
  await insertBook("blocked");
  const other = await seedChild();
  const first = answer();
  const second = answer();
  const allowFixtureWrite = vi.fn(() => Promise.resolve(true));

  await expect(
    Promise.all([
      submitRulesQuiz(childId, first, allowFixtureWrite),
      submitRulesQuiz(childId, second, allowFixtureWrite),
    ]),
  ).resolves.toEqual([
    { ok: true, data: null },
    { ok: true, data: null },
  ]);

  const stored = await batches().find({ childId }).toArray();
  expect(stored).toHaveLength(1);
  expect(stored[0]).toMatchObject({
    status: "pending",
    source: "rules",
    bookIds: [bookId],
    createdAt: clock,
    handoffDeadline: new Date(
      clock.getTime() + getConfig().BATCH_REVIEW_WINDOW_HOURS * 3_600_000,
    ),
  });
  expect([first.requestId, second.requestId]).toContain(stored[0].requestId);
  expect(stored[0]).not.toHaveProperty("mood");
  expect(stored[0]).not.toHaveProperty("length");
  expect(allowFixtureWrite).toHaveBeenCalledWith(expect.anything() as unknown, [
    bookId,
  ]);

  await expect(readRulesQuiz(childId)).resolves.toEqual({
    ok: true,
    data: "received",
  });
  await expect(submitRulesQuiz(childId, first)).resolves.toEqual({
    ok: true,
    data: null,
  });
  await expect(listPendingBatchesForFamily(familyId)).resolves.toHaveLength(1);
  await expect(
    listPendingBatchesForFamily(other.familyId),
  ).resolves.toHaveLength(0);
  await expect(listReleasedBatchesForChild(childId)).resolves.toEqual([]);
});

it("releases a batch at its stored deadline and frees the slot in the same save", async () => {
  const { childId } = await seedChild();
  const bookId = await insertBook("active");
  await insertBatch({ childId, bookIds: [bookId], handoffDeadline: clock });
  const submission = answer();

  await expect(
    submitRulesQuiz(childId, submission, () => Promise.resolve(true)),
  ).resolves.toEqual({ ok: true, data: null });
  const stored = await batches().find({ childId }).toArray();
  expect(stored).toHaveLength(2);
  const pending = stored.find(({ status }) => status === "pending");
  expect(pending?.requestId).toBe(submission.requestId);
  expect(
    stored.find(({ status }) => status === "released")?.releasedAt,
  ).toEqual(clock);

  // A retry still receives its acknowledgment even after its review has ended.
  setClock(() => new Date(clock.getTime() + 10 * 86_400_000));
  await expect(submitRulesQuiz(childId, submission)).resolves.toEqual({
    ok: true,
    data: null,
  });
  await expect(batches().countDocuments({ childId })).resolves.toBe(2);
});

it("refuses missing consent, does not broaden an empty match, and writes nothing after a failed Catalog guard", async () => {
  const { childId, familyId } = await seedChild();
  await insertBook("active");
  const input = answer();
  const allowFixtureWrite = vi.fn(() => Promise.resolve(true));
  const guarded = { ok: false, error: { code: "SAVE_FAILED" } };

  await expect(
    submitRulesQuiz(childId, { ...input, mood: "exciting" }, allowFixtureWrite),
  ).resolves.toMatchObject({ ok: false, error: { code: "NO_MATCHES" } });
  expect(allowFixtureWrite).not.toHaveBeenCalled();
  await expect(
    submitRulesQuiz(childId, input, () => Promise.resolve(false)),
  ).resolves.toMatchObject(guarded);

  await getDb()
    .collection("consentRecords")
    .updateOne(
      { familyId: new ObjectId(familyId) },
      { $set: { revokedAt: clock } },
    );
  await expect(
    submitRulesQuiz(childId, input, allowFixtureWrite),
  ).resolves.toMatchObject({
    ok: false,
    error: { code: "CONSENT_NOT_CONFIRMED" },
  });
  expect(allowFixtureWrite).not.toHaveBeenCalled();
  await expect(batches().countDocuments()).resolves.toBe(0);
});

it("acknowledges the same request without a second insert when the first response is lost", async () => {
  const { childId } = await seedChild();
  await insertBook("active");
  const input = answer();
  const original = Reflect.get(ClientSession.prototype, "withTransaction");
  vi.spyOn(ClientSession.prototype, "withTransaction").mockImplementationOnce(
    async function (this: ClientSession, ...args: Parameters<typeof original>) {
      await Reflect.apply(original, this, args);
      throw new MongoNetworkError("invented response loss");
    },
  );
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  const allowFixtureWrite = vi.fn(() => Promise.resolve(true));

  await expect(
    submitRulesQuiz(childId, input, allowFixtureWrite),
  ).resolves.toMatchObject({
    ok: false,
    error: { code: "SAVE_FAILED" },
  });
  await expect(
    submitRulesQuiz(childId, input, allowFixtureWrite),
  ).resolves.toEqual({
    ok: true,
    data: null,
  });
  expect(allowFixtureWrite).toHaveBeenCalledTimes(1);
  await expect(
    batches().countDocuments({ childId, requestId: input.requestId }),
  ).resolves.toBe(1);
});
