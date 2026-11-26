import "server-only";
import { ObjectId, type UpdateResult, type WithId } from "mongodb";
import { listExcludedBookIds } from "@/server/accounts-family/book-reports";
import {
  getChildForFamily,
  isConsentConfirmed,
  listChildrenForFamily,
} from "@/server/accounts-family/child-accounts";
import { getBooksForReview, type ReviewBook } from "@/server/catalog/books";
import { getChildAgeForRecommendation } from "@/server/child-identity/child-identity";
import type { ParentSession } from "@/server/identity-access/sessions";
import { fail, ok, type ActionResult } from "@/server/lib/action-result";
import { now } from "@/server/lib/clock";
import { getDb, type Tx } from "@/server/lib/db";
import { logUnexpectedError } from "@/server/lib/log";
import {
  RECOMMENDATION_BATCHES,
  type BatchSource,
  type BatchStatus,
} from "./batch-schema";
import {
  batchState,
  effectiveReleasedAt,
  expiredPendingFilter,
  pendingFilter,
  releasedFilter,
  releasePipeline,
  type EffectiveBatchState,
} from "./batch-state";

// Recommendation's batches (design/rec.md, UC-REC-parent-review). The only code that
// touches `recommendationBatches`, and the only code that changes a batch after the
// quiz stores it. The family always comes from the session; every read checks the
// child against it first (§8.1).

type BatchDocument = {
  _id: ObjectId;
  requestId: string;
  childId: string;
  source: BatchSource;
  status: BatchStatus;
  bookIds: string[];
  createdAt: Date;
  handoffDeadline: Date;
  removedBookIds?: string[];
  releasedAt?: Date;
};

const batches = () => getDb().collection<BatchDocument>(RECOMMENDATION_BATCHES);

export type QuizBatchLookup = { requestId: string; includePending: boolean };

/** An existing request or an unexpired pending batch gets the same acknowledgment. */
export async function hasQuizBatch(
  childId: string,
  tx?: Tx,
  lookup?: QuizBatchLookup,
): Promise<boolean> {
  const pending = pendingFilter(now());
  const filter = !lookup
    ? { childId, ...pending }
    : lookup.includePending
      ? { childId, $or: [{ requestId: lookup.requestId }, pending] }
      : { childId, requestId: lookup.requestId };
  const batch = await batches().findOne(filter, {
    projection: { _id: 1 },
    session: tx,
  });
  return batch !== null;
}

/** Called after the child, consent and Catalog write guards in the quiz transaction. */
export async function insertQuizBatch(
  tx: Tx,
  childId: string,
  requestId: string,
  bookIds: string[],
  reviewWindowHours: number,
): Promise<void> {
  const createdAt = now();
  await batches().insertOne(
    {
      _id: new ObjectId(),
      childId,
      requestId,
      bookIds,
      source: "rules",
      status: "pending",
      createdAt,
      handoffDeadline: new Date(
        createdAt.getTime() + reviewWindowHours * 3_600_000,
      ),
    },
    { session: tx },
  );
}

/**
 * The batches read at majority read concern, for reading back a write whose response
 * was lost (5a): a read after a failover cannot see a write a majority has not
 * acknowledged, nor miss one it has (review of #135).
 */
const majorityBatches = () =>
  getDb().collection<BatchDocument>(RECOMMENDATION_BATCHES, {
    readConcern: { level: "majority" },
  });

/**
 * A batch ID is the 24-hex form of an ObjectId. Anything else is answered like an
 * unknown ID, without a query (`ObjectId.isValid` accepts any 12-character string).
 */
function toBatchId(batchId: string): ObjectId | null {
  return /^[0-9a-f]{24}$/i.test(batchId) ? new ObjectId(batchId) : null;
}

/**
 * The remaining books, in `bookIds` order: minus the child's report exclusions and minus
 * any book the Catalog does not return (blocked, draft or, with `age`, out of band).
 * The 4a wording, the count on /parent and what the child sees all use this set. The
 * stored `empty` status does not: `confirmBatch` sets it from the raw `bookIds`, so a
 * batch whose only books left are blocked or excluded is stored `released` and is empty
 * to the child by this rule (design/rec.md, `confirmBatch`).
 */
async function remainingBooks(
  childId: string,
  bookIds: readonly string[],
  options: { age?: number; tx?: Tx } = {},
): Promise<ReviewBook[]> {
  const excluded = new Set(await listExcludedBookIds(childId, options.tx));
  const wanted = bookIds.filter((id) => !excluded.has(id));
  const found = new Map(
    (await getBooksForReview(wanted, options)).map((book) => [book.id, book]),
  );
  return wanted.flatMap((id) => {
    const book = found.get(id);
    return book ? [book] : [];
  });
}

export type PendingBatch = {
  batchId: string;
  childId: string;
  nickname: string;
  bookCount: number;
  handoffDeadline: Date;
};

/**
 * Step 1: the family's batches still pending at `now()` (before `handoffDeadline`),
 * oldest first, for the parent home. Callers authenticate first.
 */
export async function listPendingBatchesForFamily(
  familyId: string,
): Promise<PendingBatch[]> {
  const children = await listChildrenForFamily(familyId);
  if (children.length === 0) return [];
  const nicknames = new Map(children.map((c) => [c._id, c.nickname]));
  const pending = await batches()
    .find(
      { childId: { $in: [...nicknames.keys()] }, ...pendingFilter(now()) },
      { projection: { childId: 1, bookIds: 1, handoffDeadline: 1 } },
    )
    .sort({ createdAt: 1, _id: 1 })
    .toArray();
  return Promise.all(
    pending.map(async (batch) => ({
      batchId: batch._id.toHexString(),
      childId: batch.childId,
      nickname: nicknames.get(batch.childId) ?? "",
      bookCount: (await remainingBooks(batch.childId, batch.bookIds)).length,
      handoffDeadline: batch.handoffDeadline,
    })),
  );
}

export type BatchReviewView = {
  batchId: string;
  childId: string;
  nickname: string;
  state: EffectiveBatchState;
  source: BatchSource;
  handoffDeadline: Date;
  books: ReviewBook[];
};

/**
 * Steps 2-3. Null for another family's child, an unknown or malformed child or batch
 * ID, and a batch of another child: the page gives the same 404 for all of them. Never
 * returns `removedBookIds`.
 */
export async function getBatchForReview(
  familyId: string,
  childId: string,
  batchId: string,
): Promise<BatchReviewView | null> {
  const child = await getChildForFamily(familyId, childId);
  if (!child) return null;
  const _id = toBatchId(batchId);
  if (!_id) return null;
  const batch = await batches().findOne(
    { _id, childId },
    {
      projection: {
        status: 1,
        source: 1,
        bookIds: 1,
        handoffDeadline: 1,
      },
    },
  );
  if (!batch) return null;
  return {
    batchId: batch._id.toHexString(),
    childId,
    nickname: child.nickname,
    state: batchState(batch, now()),
    source: batch.source,
    handoffDeadline: batch.handoffDeadline,
    books: await remainingBooks(childId, batch.bookIds),
  };
}

export type BatchActionCode =
  | "CHILD_NOT_FOUND"
  | "CONSENT_NOT_CONFIRMED"
  | "BATCH_NOT_FOUND"
  | "BATCH_ALREADY_RELEASED"
  | "SAVE_FAILED"
  | "OUTCOME_UNKNOWN";

export type RemoveBookCode = BatchActionCode | "BOOK_NOT_IN_BATCH";

const MESSAGES: Record<RemoveBookCode, string> = {
  CHILD_NOT_FOUND: "We couldn't find that child.",
  CONSENT_NOT_CONFIRMED:
    "Your family's consent must be confirmed before you can review recommendations.",
  BATCH_NOT_FOUND: "We couldn't find these recommendations.",
  BATCH_ALREADY_RELEASED:
    "These recommendations have already gone to your child, so they can't be changed.",
  BOOK_NOT_IN_BATCH: "That book isn't in these recommendations.",
  SAVE_FAILED:
    "We couldn't save that. Nothing changed, and nothing was sent to your child. Please try again.",
  OUTCOME_UNKNOWN:
    "We couldn't confirm whether that was saved. Reload the page to check before trying again.",
};

const refuse = <Code extends RemoveBookCode>(code: Code) =>
  fail(code, MESSAGES[code]);

/** The child and consent checks both actions make, in this order (design/rec.md). */
async function checkChildAndConsent(
  session: ParentSession,
  childId: string,
): Promise<"CHILD_NOT_FOUND" | "CONSENT_NOT_CONFIRMED" | null> {
  if (!(await getChildForFamily(session.familyId, childId))) {
    return "CHILD_NOT_FOUND";
  }
  if (!(await isConsentConfirmed(session.familyId))) {
    return "CONSENT_NOT_CONFIRMED";
  }
  return null;
}

/** Why a conditional update on the batch matched nothing. */
async function whyNotPending(
  _id: ObjectId,
  childId: string,
): Promise<
  { code: "BATCH_NOT_FOUND" | "BATCH_ALREADY_RELEASED" } | BatchDocument
> {
  const batch = await batches().findOne({ _id, childId });
  if (!batch) return { code: "BATCH_NOT_FOUND" };
  if (batchState(batch, now()) !== "pending") {
    return { code: "BATCH_ALREADY_RELEASED" };
  }
  return batch;
}

/**
 * 5a, when the write itself failed: its response can be lost after MongoDB applied it,
 * so "nothing changed" may be false (review of #135). Reads the batch back at majority
 * read concern so the answer says what is stored. Null when even that read fails; the
 * caller then says the outcome is unknown rather than claim nothing changed.
 */
async function readBack(
  _id: ObjectId,
  childId: string,
): Promise<{ batch: BatchDocument | null } | null> {
  try {
    return { batch: await majorityBatches().findOne({ _id, childId }) };
  } catch (readErr) {
    logUnexpectedError("readBackBatch", readErr);
    return null;
  }
}

const unconfirmed = (errorId: string) =>
  fail("OUTCOME_UNKNOWN", MESSAGES.OUTCOME_UNKNOWN, errorId);

export type BatchInput = { childId: string; batchId: string };
export type RemoveBookInput = BatchInput & { bookId: string };

/**
 * Step 4: moves one book from `bookIds` to `removedBookIds`, saved at once. One
 * conditional update that matches only a batch still pending (Key decisions). A book
 * already removed is `ok` (a double tap). Consent is read, not locked, and the child
 * lock is not taken, on purpose (Key decisions, "The batch writes read consent").
 */
export async function removeBookFromBatch(
  session: ParentSession,
  input: RemoveBookInput,
): Promise<ActionResult<null, RemoveBookCode>> {
  const { childId, batchId, bookId } = input;
  try {
    const refused = await checkChildAndConsent(session, childId);
    if (refused) return refuse(refused);
    const _id = toBatchId(batchId);
    if (!_id) return refuse("BATCH_NOT_FOUND");

    let result: UpdateResult<BatchDocument>;
    try {
      result = await batches().updateOne(
        { _id, childId, ...pendingFilter(now()), bookIds: bookId },
        { $pull: { bookIds: bookId }, $addToSet: { removedBookIds: bookId } },
      );
    } catch (err) {
      const errorId = logUnexpectedError("removeBookFromBatch", err);
      return await removalAfterLostWrite(_id, childId, bookId, errorId);
    }
    if (result.matchedCount === 1) return ok(null);

    const why = await whyNotPending(_id, childId);
    if ("code" in why) return refuse(why.code);
    if (why.removedBookIds?.includes(bookId)) return ok(null);
    return refuse("BOOK_NOT_IN_BATCH");
  } catch (err) {
    return fail(
      "SAVE_FAILED",
      MESSAGES.SAVE_FAILED,
      logUnexpectedError("removeBookFromBatch", err),
    );
  }
}

/**
 * The removal's answer when its write failed (5a). The book removed is `ok`, whoever
 * removed it, as for a double tap. A batch no longer pending is `BATCH_ALREADY_RELEASED`.
 * The book still in the batch is `OUTCOME_UNKNOWN`: the read-back can run before a write
 * still in flight applies, so the old state does not prove nothing changed (second
 * review of #135).
 */
async function removalAfterLostWrite(
  _id: ObjectId,
  childId: string,
  bookId: string,
  errorId: string,
): Promise<ActionResult<null, RemoveBookCode>> {
  const read = await readBack(_id, childId);
  if (!read) return unconfirmed(errorId);
  const { batch } = read;
  if (!batch) return refuse("BATCH_NOT_FOUND");
  if (
    batch.removedBookIds?.includes(bookId) &&
    !batch.bookIds.includes(bookId)
  ) {
    return ok(null);
  }
  if (batchState(batch, now()) !== "pending") {
    return refuse("BATCH_ALREADY_RELEASED");
  }
  if (batch.bookIds.includes(bookId)) return unconfirmed(errorId);
  return refuse("BOOK_NOT_IN_BATCH");
}

/**
 * Steps 5-6 and 4a: one conditional update releases the batch, `empty` when no book is
 * left in `bookIds` and `released` otherwise, with `releasedAt` = `now()`. That write is
 * the release; there is no hand-off after it (6a). The first of two parents, or of a
 * parent and the deadline, wins; the other gets `BATCH_ALREADY_RELEASED`.
 * The returned `state` is the stored status, so it follows the raw `bookIds`, not the
 * remaining books; a page shows "no books left" from the remaining books
 * (`getBatchForReview`), never from this `state`.
 */
export async function confirmBatch(
  session: ParentSession,
  input: BatchInput,
): Promise<ActionResult<{ state: "released" | "empty" }, BatchActionCode>> {
  const { childId, batchId } = input;
  try {
    const refused = await checkChildAndConsent(session, childId);
    if (refused) return refuse(refused);
    const _id = toBatchId(batchId);
    if (!_id) return refuse("BATCH_NOT_FOUND");

    const at = now();
    let released: WithId<BatchDocument> | null;
    try {
      released = await batches().findOneAndUpdate(
        { _id, childId, ...pendingFilter(at) },
        releasePipeline(at),
        { returnDocument: "after", projection: { status: 1 } },
      );
    } catch (err) {
      const errorId = logUnexpectedError("confirmBatch", err);
      return await confirmationAfterLostWrite(_id, childId, at, errorId);
    }
    if (released) {
      return ok({ state: released.status === "empty" ? "empty" : "released" });
    }
    const why = await whyNotPending(_id, childId);
    // Pending a moment ago but not matched: the deadline passed in between.
    return refuse("code" in why ? why.code : "BATCH_ALREADY_RELEASED");
  } catch (err) {
    return fail(
      "SAVE_FAILED",
      MESSAGES.SAVE_FAILED,
      logUnexpectedError("confirmBatch", err),
    );
  }
}

/**
 * The confirmation's answer when its write failed (5a). A stored release carrying this
 * attempt's `releasedAt` is this confirmation, applied with its response lost: `ok`. Any
 * other release (the other parent, or the deadline, whose `releasedAt` is
 * `handoffDeadline`, never `at`) is `BATCH_ALREADY_RELEASED`. A batch still pending is
 * `OUTCOME_UNKNOWN`: the read-back can run before a write still in flight applies, so
 * the old state does not prove nothing was sent (second review of #135).
 */
async function confirmationAfterLostWrite(
  _id: ObjectId,
  childId: string,
  at: Date,
  errorId: string,
): Promise<ActionResult<{ state: "released" | "empty" }, BatchActionCode>> {
  const read = await readBack(_id, childId);
  if (!read) return unconfirmed(errorId);
  const { batch } = read;
  if (!batch) return refuse("BATCH_NOT_FOUND");
  if (batch.status !== "pending") {
    // Known limit: the other parent's confirmation in the same millisecond also has
    // `releasedAt` = `at` and is taken for this one. The answer is still true for this
    // parent (the batch is released, as they asked), so it is left as `ok`.
    if (batch.releasedAt?.getTime() === at.getTime()) {
      return ok({ state: batch.status === "empty" ? "empty" : "released" });
    }
    return refuse("BATCH_ALREADY_RELEASED");
  }
  if (batchState(batch, now()) !== "pending") {
    return refuse("BATCH_ALREADY_RELEASED");
  }
  return unconfirmed(errorId);
}

/**
 * UC-PAR-report-book 7d, on the report's transaction (the contract design/par.md names):
 * takes the book out of every batch of the child that is pending at `now()` and holds
 * it, as a parent's removal would, and leaves each batch pending. Returns whether any
 * batch changed; `reportBook` counts that toward PRE-3. A released batch is untouched:
 * its books are filtered by exclusion on the child's read.
 */
export async function removeFromPendingBatchInTx(
  tx: Tx,
  childId: string,
  bookId: string,
): Promise<boolean> {
  const result = await batches().updateMany(
    { childId, ...pendingFilter(now()), bookIds: bookId },
    { $pull: { bookIds: bookId }, $addToSet: { removedBookIds: bookId } },
    { session: tx },
  );
  return result.modifiedCount > 0;
}

/**
 * 2a in stored state, for one child, on the quiz save's transaction before its insert
 * (design/rec.md, "Retry the same request"): every batch of the child stored `pending`
 * past its `handoffDeadline` becomes `released` or `empty`, with `releasedAt` set to that
 * deadline, the moment reads already treated it as released. That frees the child's one
 * pending slot. Idempotent; returns the number of batches changed. UC-REC-recommend-
 * quiz-rules calls it when it is built.
 */
export async function releaseExpiredBatchInTx(
  tx: Tx,
  childId: string,
): Promise<number> {
  const result = await batches().updateMany(
    { childId, ...expiredPendingFilter(now()) },
    releasePipeline("handoffDeadline"),
    { session: tx },
  );
  return result.modifiedCount;
}

/**
 * The same release over every child, for the daily Scheduled Cleanup. It changes what no
 * read returns; it makes the stored status match it (KD-time-rules-on-read).
 */
export async function releaseExpiredBatches(): Promise<number> {
  const result = await batches().updateMany(
    expiredPendingFilter(now()),
    releasePipeline("handoffDeadline"),
  );
  return result.modifiedCount;
}

export type ReleasedBatch = {
  batchId: string;
  /** For ordering only: never sent to a child's screen (Associated Information). */
  releasedAt: Date;
  bookIds: string[];
  empty: boolean;
};

/**
 * Step 6 and POST-2: the hand-off to UC-REC-kid-review, which calls it once a child
 * session has been checked. Released batches by the one rule in `batch-state.ts`
 * (stored released or empty, or pending past `handoffDeadline`), newest first. Each
 * holds the remaining books, read with the child's current age, so a book whose age
 * band no longer holds it is left out; `empty` is true when none remain, whatever the
 * stored status (4a). `releasedAt` is the recorded release, or `handoffDeadline` before
 * the timeout release is recorded: the same value either way. Never returns
 * `removedBookIds` or a pending batch. A missing age or a failed read throws, so the
 * caller shows no books rather than unchecked ones.
 */
export async function listReleasedBatchesForChild(
  childId: string,
  tx?: Tx,
): Promise<ReleasedBatch[]> {
  const age = await getChildAgeForRecommendation(childId, tx);
  if (age === null) throw new Error("no recorded age for the child");
  const released = await batches()
    .find(
      { childId, ...releasedFilter(now()) },
      {
        projection: { bookIds: 1, handoffDeadline: 1, releasedAt: 1 },
        session: tx,
      },
    )
    .toArray();
  const ordered = released
    .map((batch) => ({ batch, releasedAt: effectiveReleasedAt(batch) }))
    .sort(
      (a, b) =>
        b.releasedAt.getTime() - a.releasedAt.getTime() ||
        b.batch._id.toHexString().localeCompare(a.batch._id.toHexString()),
    );
  // One batch at a time: a transaction's session takes one operation at a time.
  const result: ReleasedBatch[] = [];
  for (const { batch, releasedAt } of ordered) {
    const books = await remainingBooks(childId, batch.bookIds, { age, tx });
    result.push({
      batchId: batch._id.toHexString(),
      releasedAt,
      bookIds: books.map((book) => book.id),
      empty: books.length === 0,
    });
  }
  return result;
}

/**
 * PRE-3 of the batch entry page of UC-PAR-report-book: the book is in this batch of the
 * child and the batch is still pending. Callers check the child's family first.
 */
export async function isInPendingBatch(
  childId: string,
  batchId: string,
  bookId: string,
): Promise<boolean> {
  const _id = toBatchId(batchId);
  if (!_id) return false;
  const batch = await batches().findOne(
    { _id, childId, ...pendingFilter(now()), bookIds: bookId },
    { projection: { _id: 1 } },
  );
  return batch !== null;
}

/**
 * UC-PAR-delete-kid-account: every batch of the child, whatever its status. Joins
 * DELETE_CHILD_RECORDS in child-deletion.ts once #125 merges.
 */
export async function deleteChildRecords(
  tx: Tx,
  childId: string,
): Promise<void> {
  await batches().deleteMany({ childId }, { session: tx });
}
