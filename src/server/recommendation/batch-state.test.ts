import { describe, expect, it } from "vitest";
import {
  batchState,
  effectiveReleasedAt,
  expiredPendingFilter,
  pendingFilter,
  releasedFilter,
  releasePipeline,
} from "./batch-state";

// UC-REC-parent-review 2a, unit (design/rec.md, Tests): fixed times, no clock module.
const DEADLINE = new Date("2026-11-25T12:00:00.000Z");
const ms = (offset: number) => new Date(DEADLINE.getTime() + offset);
const pending = { status: "pending" as const, handoffDeadline: DEADLINE };

describe("batchState (2a)", () => {
  it("is pending one millisecond before handoffDeadline", () => {
    expect(batchState({ ...pending, bookIds: ["b1"] }, ms(-1))).toBe("pending");
  });

  it("is released at handoffDeadline and after", () => {
    expect(batchState({ ...pending, bookIds: ["b1"] }, ms(0))).toBe("released");
    expect(batchState({ ...pending, bookIds: ["b1"] }, ms(86_400_000))).toBe(
      "released",
    );
  });

  it("is empty at handoffDeadline when the parent removed every book and never confirmed (4a)", () => {
    expect(batchState({ ...pending, bookIds: [] }, ms(0))).toBe("empty");
    expect(batchState({ ...pending, bookIds: [] }, ms(-1))).toBe("pending");
  });

  it("leaves a stored released or empty batch as it is, whatever the clock", () => {
    for (const at of [ms(-86_400_000), ms(-1), ms(0), ms(1)]) {
      expect(
        batchState(
          { status: "released", handoffDeadline: DEADLINE, bookIds: [] },
          at,
        ),
      ).toBe("released");
      expect(
        batchState(
          { status: "empty", handoffDeadline: DEADLINE, bookIds: ["b1"] },
          at,
        ),
      ).toBe("empty");
    }
  });
});

describe("the query filters (2a)", () => {
  const now = ms(0);

  it("pendingFilter matches only a deadline still ahead; the timeout release's filter is its opposite", () => {
    expect(pendingFilter(now)).toEqual({
      status: "pending",
      handoffDeadline: { $gt: now },
    });
    expect(expiredPendingFilter(now)).toEqual({
      status: "pending",
      handoffDeadline: { $lte: now },
    });
  });

  it("releasedFilter is a stored release, or a stored pending past its deadline", () => {
    expect(releasedFilter(now)).toEqual({
      $or: [
        { status: { $in: ["released", "empty"] } },
        { status: "pending", handoffDeadline: { $lte: now } },
      ],
    });
  });

  it("releasePipeline decides empty or released in the write, with the given release time", () => {
    const status = {
      $cond: [{ $eq: [{ $size: "$bookIds" }, 0] }, "empty", "released"],
    };
    expect(releasePipeline(now)).toEqual([
      { $set: { status, releasedAt: now } },
    ]);
    expect(releasePipeline("handoffDeadline")).toEqual([
      { $set: { status, releasedAt: "$handoffDeadline" } },
    ]);
  });

  it("effectiveReleasedAt is the recorded release, else the deadline", () => {
    expect(effectiveReleasedAt({ handoffDeadline: DEADLINE })).toEqual(
      DEADLINE,
    );
    expect(
      effectiveReleasedAt({ handoffDeadline: DEADLINE, releasedAt: ms(-5) }),
    ).toEqual(ms(-5));
  });
});
