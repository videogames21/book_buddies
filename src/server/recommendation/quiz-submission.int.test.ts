import { randomUUID } from "node:crypto";
import { ClientSession, MongoNetworkError, ObjectId } from "mongodb";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { insertBatch } from "../../../tests/fixtures/batches";
import { insertBook } from "../../../tests/fixtures/catalog";
import { insertChild } from "../../../tests/fixtures/children";
import { insertConsentedMainParent } from "../../../tests/fixtures/family";
import { resetDatabase } from "../../../tests/integration/db";
import * as bookReports from "@/server/accounts-family/book-reports";
import { deleteChild } from "@/server/accounts-family/child-deletion";
import * as families from "@/server/accounts-family/families";
import * as parentNotes from "@/server/accounts-family/parent-notes";
import * as catalog from "@/server/catalog/rule-candidates";
import * as childIdentity from "@/server/child-identity/child-identity";
import { insertChildIdentity } from "@/server/child-identity/child-identity";
import { setClock, resetClock } from "@/server/lib/clock";
import { getConfig } from "@/server/lib/config";
import { getDb, withTransaction } from "@/server/lib/db";
import * as shelf from "@/server/shelf/recommendation-signals";
import * as batchWrites from "./batches";
import * as reactions from "./reactions";
import * as readingProfiles from "./reading-profiles";
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
  return { childId, familyId: parent.familyId, userId: parent.userId };
}

it("keeps the normal quiz entry unavailable without the Catalog guard and saves nothing", async () => {
  vi.spyOn(catalog, "getQuizCatalogGuard").mockReturnValue(undefined);
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

it("leaves child and consent records unchanged when a submission is refused", async () => {
  const { childId, familyId } = await seedChild();
  await insertBook("active");
  const input = answer();
  const allowFixtureWrite = vi.fn(() => Promise.resolve(true));
  const guarded = { ok: false, error: { code: "SAVE_FAILED" } };
  const children = getDb().collection<{ _id: string }>("children");
  const consentRecords = getDb().collection("consentRecords");
  const family = { familyId: new ObjectId(familyId) };
  const childBefore = await children.findOne({ _id: childId });
  const consentBefore = await consentRecords.findOne(family);

  await expect(
    submitRulesQuiz(childId, { ...input, mood: "exciting" }, allowFixtureWrite),
  ).resolves.toMatchObject({ ok: false, error: { code: "NO_MATCHES" } });
  expect(allowFixtureWrite).not.toHaveBeenCalled();
  await expect(
    submitRulesQuiz(childId, input, () => Promise.resolve(false)),
  ).resolves.toMatchObject(guarded);

  await expect(children.findOne({ _id: childId })).resolves.toEqual(
    childBefore,
  );
  await expect(consentRecords.findOne(family)).resolves.toEqual(consentBefore);

  await consentRecords.updateOne(family, { $set: { revokedAt: clock } });
  const revokedConsent = await consentRecords.findOne(family);
  await expect(
    submitRulesQuiz(childId, input, allowFixtureWrite),
  ).resolves.toMatchObject({
    ok: false,
    error: { code: "CONSENT_NOT_CONFIRMED" },
  });
  expect(allowFixtureWrite).not.toHaveBeenCalled();
  await expect(children.findOne({ _id: childId })).resolves.toEqual(
    childBefore,
  );
  await expect(consentRecords.findOne(family)).resolves.toEqual(revokedConsent);
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

it.each([
  {
    source: "child profile",
    refuse: () =>
      vi
        .spyOn(childIdentity, "getRuleQuizProfile")
        .mockRejectedValueOnce(new Error("fixture read failure")),
  },
  {
    source: "consent",
    refuse: () =>
      vi
        .spyOn(families, "lockConsentForWrite")
        .mockRejectedValueOnce(new Error("fixture read failure")),
  },
  {
    source: "exclusions",
    refuse: () =>
      vi
        .spyOn(bookReports, "listExcludedBookIds")
        .mockRejectedValueOnce(new Error("fixture read failure")),
  },
  {
    source: "Catalog candidates",
    refuse: () =>
      vi
        .spyOn(catalog, "listRuleCandidates")
        .mockRejectedValueOnce(new Error("fixture read failure")),
  },
  {
    source: "onboarding profile",
    refuse: () =>
      vi
        .spyOn(readingProfiles, "getQuizOnboardingWeights")
        .mockRejectedValueOnce(new Error("fixture read failure")),
  },
  {
    source: "parent note",
    refuse: () =>
      vi
        .spyOn(parentNotes, "listLatestNoteInterestKeys")
        .mockRejectedValueOnce(new Error("fixture read failure")),
  },
  {
    source: "shelf history",
    refuse: () =>
      vi
        .spyOn(shelf, "listRecentShelfSignalBookIds")
        .mockRejectedValueOnce(new Error("fixture read failure")),
  },
  {
    source: "ratings",
    refuse: () =>
      vi
        .spyOn(shelf, "listRecentRatingSignals")
        .mockRejectedValueOnce(new Error("fixture read failure")),
  },
  {
    source: "reactions",
    refuse: () =>
      vi
        .spyOn(reactions, "listReactionsForSignals")
        .mockRejectedValueOnce(new Error("fixture read failure")),
  },
  {
    source: "Catalog history",
    refuse: () =>
      vi
        .spyOn(catalog, "listRuleHistoryTags")
        .mockRejectedValueOnce(new Error("fixture read failure")),
  },
])(
  "refuses a failed $source read and lets the same request retry",
  async ({ refuse: refuseRead }) => {
    const { childId } = await seedChild();
    await insertBook("active");
    const form = answer();
    const guard = vi.fn(() => Promise.resolve(true));
    const logged = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    refuseRead();

    const result = await submitRulesQuiz(childId, form, guard);
    expect(result).toMatchObject({ ok: false, error: { code: "LOAD_FAILED" } });
    expect(guard).not.toHaveBeenCalled();
    expect(JSON.stringify(logged.mock.calls)).not.toContain(childId);
    expect(JSON.stringify(logged.mock.calls)).not.toContain(form.requestId);
    await expect(batches().countDocuments()).resolves.toBe(0);
    await expect(submitRulesQuiz(childId, form, guard)).resolves.toEqual({
      ok: true,
      data: null,
    });
    await expect(
      batches().countDocuments({ childId, requestId: form.requestId }),
    ).resolves.toBe(1);
  },
);

it("rolls the expired batch release back when the replacement insert fails", async () => {
  const { childId } = await seedChild();
  const bookId = await insertBook("active");
  const expired = await insertBatch({
    childId,
    bookIds: [bookId],
    handoffDeadline: clock,
  });
  const form = answer();
  vi.spyOn(batchWrites, "insertQuizBatch").mockRejectedValueOnce(
    new Error("fixture insert failure"),
  );
  vi.spyOn(console, "error").mockImplementation(() => undefined);

  const guard = () => Promise.resolve(true);
  await expect(submitRulesQuiz(childId, form, guard)).resolves.toMatchObject({
    ok: false,
    error: { code: "SAVE_FAILED" },
  });
  await expect(
    batches().findOne({ _id: new ObjectId(expired) }),
  ).resolves.toMatchObject({ status: "pending" });
  await expect(
    batches().countDocuments({ childId, requestId: form.requestId }),
  ).resolves.toBe(0);
  await expect(submitRulesQuiz(childId, form, guard)).resolves.toEqual({
    ok: true,
    data: null,
  });
  await expect(
    batches().findOne({ _id: new ObjectId(expired) }),
  ).resolves.toMatchObject({ status: "released" });
});

it("lets a report racing an in-flight quiz remove the book from the committed batch", async () => {
  const { childId, familyId, userId } = await seedChild();
  const reported = await insertBook("active", "Old pick");
  const retained = await insertBook("active", "Other pick");
  const reachedGuard = Promise.withResolvers<boolean>();
  const canSave = Promise.withResolvers<boolean>();
  const quiz = submitRulesQuiz(childId, answer(), async () => {
    reachedGuard.resolve(true);
    await canSave.promise;
    return true;
  });
  await Promise.race([reachedGuard.promise, quiz]);
  const report = bookReports.reportBook(
    { userId, familyId, parentRole: "main" },
    {
      childId,
      bookId: reported,
      reason: "other",
    },
  );
  canSave.resolve(true);
  await expect(quiz).resolves.toEqual({ ok: true, data: null });
  await expect(report).resolves.toMatchObject({ ok: true });
  await expect(
    batches().findOne({ childId, status: "pending" }),
  ).resolves.toMatchObject({ bookIds: [retained] });
});

it("leaves no batch when child deletion races a quiz submission", async () => {
  const { childId, userId, familyId } = await seedChild();
  await insertBook("active");
  const reachedGuard = Promise.withResolvers<boolean>();
  const canSave = Promise.withResolvers<boolean>();
  const quiz = submitRulesQuiz(childId, answer(), async () => {
    reachedGuard.resolve(true);
    await canSave.promise;
    return true;
  });

  await Promise.race([reachedGuard.promise, quiz]);
  const deletion = deleteChild(
    { userId, familyId, parentRole: "main" },
    childId,
  );
  canSave.resolve(true);

  await expect(quiz).resolves.toEqual({ ok: true, data: null });
  await expect(deletion).resolves.toEqual({ ok: true, data: null });
  await expect(batches().countDocuments({ childId })).resolves.toBe(0);
  await expect(
    submitRulesQuiz(childId, answer(), () => Promise.resolve(true)),
  ).resolves.toMatchObject({
    ok: false,
    error: { code: "CHILD_NOT_FOUND" },
  });
});

// OI-58 (team decision 2026-11-26): the production guard is the Catalog's same-book
// conditional write, so a block or a return to draft cannot commit unseen by the quiz.

const writeVersion = async (bookId: string) =>
  (
    await getDb()
      .collection<{ _id: string; writeVersion?: number }>("books")
      .findOne({ _id: bookId })
  )?.writeVersion;

/** A block or a return to draft, committed in its own transaction, as ADM will write it. */
const setStatus = (bookId: string, status: "blocked" | "draft") =>
  withTransaction(async (tx) => {
    await getDb()
      .collection<{ _id: string; status: string }>("books")
      .updateOne({ _id: bookId }, { $set: { status } }, { session: tx });
  });

it("opens the quiz with the production guard, which writes each ranked book as it saves", async () => {
  const { childId } = await seedChild();
  const first = await insertBook("active", "First pick");
  const second = await insertBook("active", "Second pick");
  await expect(startRulesQuiz(childId)).resolves.toEqual({
    ok: true,
    data: "open",
  });
  await expect(submitRulesQuiz(childId, answer())).resolves.toEqual({
    ok: true,
    data: null,
  });
  const saved = await batches().findOne({ childId, status: "pending" });
  expect([...(saved?.bookIds as string[])].sort()).toEqual(
    [first, second].sort(),
  );
  await expect(writeVersion(first)).resolves.toBe(1);
  await expect(writeVersion(second)).resolves.toBe(1);
});

it.each(["blocked", "draft"] as const)(
  "block race: a book %s after the quiz ranked it is not saved in the batch",
  async (status) => {
    const { childId } = await seedChild();
    const raced = await insertBook("active", "Raced pick");
    const kept = await insertBook("active", "Kept pick");
    let calls = 0;
    // Commits the status change after the ranking read its snapshot and before the
    // guard's write, the interleaving a status read alone would miss.
    const result = await submitRulesQuiz(
      childId,
      answer(),
      async (tx, bookIds) => {
        calls += 1;
        if (calls === 1) await setStatus(raced, status);
        return catalog.lockActiveBooksForQuiz(tx, bookIds);
      },
    );
    expect(result).toEqual({ ok: true, data: null });
    // The write conflict reran the transaction, whose ranking no longer saw the book.
    expect(calls).toBe(2);
    await expect(
      batches().findOne({ childId, status: "pending" }),
    ).resolves.toMatchObject({ bookIds: [kept] });
  },
);

it("block race: a block that commits first leaves the only ranked book out, and nothing is saved", async () => {
  const { childId } = await seedChild();
  const only = await insertBook("active", "Only pick");
  let calls = 0;
  const result = await submitRulesQuiz(childId, answer(), async (tx, ids) => {
    calls += 1;
    if (calls === 1) await setStatus(only, "blocked");
    return catalog.lockActiveBooksForQuiz(tx, ids);
  });
  expect(result).toMatchObject({ ok: false, error: { code: "NO_MATCHES" } });
  await expect(batches().countDocuments({ childId })).resolves.toBe(0);
});
