import type { BatchStatus } from "./batch-schema";

// The deadline rule of UC-REC-parent-review 2a, written once (design/rec.md; §8.2.2,
// KD-time-rules-on-read). A batch is pending only while it is stored `pending` and its
// stored `handoffDeadline` is still ahead; from that instant every read treats it as
// released, whether or not the timeout release has been recorded yet. Pure: no clock,
// no database, so it is unit-tested with fixed times. Only the type import above
// touches the schema module, and types are erased.

export type EffectiveBatchState = "pending" | "released" | "empty";

export type BatchForState = {
  status: BatchStatus;
  handoffDeadline: Date;
  bookIds: readonly string[];
};

/**
 * The batch's state at `now`. A stored `released` or `empty` is final. A stored
 * `pending` past its deadline is what the timeout release will record: `empty` when
 * `bookIds` is empty, `released` otherwise, the same rule as `confirmBatch`.
 */
export function batchState(
  batch: BatchForState,
  now: Date,
): EffectiveBatchState {
  if (batch.status !== "pending") return batch.status;
  if (now.getTime() < batch.handoffDeadline.getTime()) return "pending";
  return batch.bookIds.length === 0 ? "empty" : "released";
}

/** The time the batch reached the child: `releasedAt` once recorded, else its deadline. */
export function effectiveReleasedAt(batch: {
  releasedAt?: Date;
  handoffDeadline: Date;
}): Date {
  return batch.releasedAt ?? batch.handoffDeadline;
}

/** Matches the batches that are pending at `now`: the only ones a parent may change. */
export function pendingFilter(now: Date) {
  return { status: "pending", handoffDeadline: { $gt: now } } as const;
}

/**
 * Matches the batches stored `pending` whose deadline has passed at `now`: the timeout
 * release's match, the exact opposite of `pendingFilter` within stored `pending`.
 */
export function expiredPendingFilter(now: Date) {
  return { status: "pending", handoffDeadline: { $lte: now } } as const;
}

/** Matches the batches released at `now`, recorded or not (the child's read). */
export function releasedFilter(now: Date) {
  return {
    $or: [
      { status: { $in: ["released", "empty"] } },
      expiredPendingFilter(now),
    ],
  } as const;
}

/**
 * The update pipeline that releases a batch: `empty` when `bookIds` is empty and
 * `released` otherwise, decided inside the write so a removal cannot slip between a
 * read of the books and the status (Key decisions, "Two parents"). `releasedAt` is
 * `now()` for a confirmation, and the batch's own `handoffDeadline` for a timeout.
 */
export function releasePipeline(releasedAt: Date | "handoffDeadline") {
  return [
    {
      $set: {
        status: {
          $cond: [{ $eq: [{ $size: "$bookIds" }, 0] }, "empty", "released"],
        },
        releasedAt:
          releasedAt === "handoffDeadline" ? "$handoffDeadline" : releasedAt,
      },
    },
  ];
}
