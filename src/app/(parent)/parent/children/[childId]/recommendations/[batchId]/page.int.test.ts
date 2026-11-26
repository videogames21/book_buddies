import { ObjectId } from "mongodb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FIXTURE_DEADLINE,
  insertBatch,
} from "../../../../../../../../tests/fixtures/batches";
import { insertBook } from "../../../../../../../../tests/fixtures/catalog";
import { insertChild } from "../../../../../../../../tests/fixtures/children";
import { insertConsentRecord } from "../../../../../../../../tests/fixtures/family";
import {
  insertParent,
  insertUserWithRole,
} from "../../../../../../../../tests/fixtures/users";
import { resetDatabase } from "../../../../../../../../tests/integration/db";
import type { BatchReviewProps } from "./batch-review";

vi.mock("@/server/identity-access/auth", () => ({ auth: vi.fn() }));

const { default: BatchReviewPage } = await import("./page");
const { auth } = await import("@/server/identity-access/auth");
const { resetClock, setClock } = await import("@/server/lib/clock");
const mockedAuth = vi.mocked(
  auth as unknown as () => Promise<{ user: { id: string } } | null>,
);

const NOW = new Date("2026-11-24T18:00:00Z");
const signInAs = (userId: string | null) => {
  mockedAuth.mockResolvedValue(userId ? { user: { id: userId } } : null);
};

/** What the page did: rendered (with the BatchReview props), redirected or 404. */
async function outcome(childId: string, batchId: string) {
  try {
    const element = (await BatchReviewPage({
      params: Promise.resolve({ childId, batchId }),
    })) as { props: BatchReviewProps };
    return { rendered: element.props.view };
  } catch (err) {
    const digest = (err as { digest?: string }).digest ?? "";
    if (digest.startsWith("NEXT_REDIRECT")) {
      return { redirect: digest.split(";")[2] };
    }
    if (digest.endsWith(";404")) return { notFound: true };
    throw err;
  }
}

async function familyWithBatch() {
  const main = await insertParent({ parentRole: "main" });
  await insertConsentRecord(main, true);
  const childId = await insertChild(main.familyId, { nickname: "Starfish" });
  const bookIds = [
    await insertBook("active", "Alpha"),
    await insertBook("active", "Bravo"),
  ];
  const batchId = await insertBatch({
    childId,
    bookIds,
    removedBookIds: ["removed-book"],
  });
  return { main, childId, batchId, bookIds };
}

beforeEach(async () => {
  await resetDatabase();
  setClock(() => NOW);
});
afterEach(() => {
  resetClock();
  mockedAuth.mockReset();
});

describe("the batch page (UC-REC-parent-review steps 2-3)", () => {
  it("shows a Main or Sub Parent the pending batch's books, source and deadline, and never the removed books", async () => {
    const { main, childId, batchId, bookIds } = await familyWithBatch();
    const sub = await insertParent({
      parentRole: "sub",
      familyId: new ObjectId(main.familyId),
    });
    for (const userId of [main.userId, sub.userId]) {
      signInAs(userId);
      const { rendered } = await outcome(childId, batchId);
      expect(rendered).toMatchObject({
        batchId,
        childId,
        nickname: "Starfish",
        state: "pending",
        source: "rules",
        handoffDeadline: FIXTURE_DEADLINE.toISOString(),
      });
      expect(rendered?.books.map((book) => book.id)).toEqual(bookIds);
      expect(JSON.stringify(rendered)).not.toContain("removed-book");
    }
  });

  it("2a: past handoffDeadline the page shows the batch as released", async () => {
    const { main, childId, batchId } = await familyWithBatch();
    signInAs(main.userId);
    setClock(() => FIXTURE_DEADLINE);
    expect((await outcome(childId, batchId)).rendered?.state).toBe("released");
  });

  it("access: no session goes to sign-in; another family, unknown or malformed IDs, another child's batch, a child and an admin all get the same 404", async () => {
    const { main, childId, batchId } = await familyWithBatch();
    const sibling = await insertChild(main.familyId);
    const stranger = await insertParent({ parentRole: "main" });

    signInAs(null);
    expect(await outcome(childId, batchId)).toEqual({ redirect: "/sign-in" });

    signInAs(stranger.userId);
    expect(await outcome(childId, batchId)).toEqual({ notFound: true });

    signInAs(main.userId);
    for (const [child, batch] of [
      ["unknown-child", batchId],
      [childId, new ObjectId().toHexString()],
      [childId, "aaaaaaaaaaaa"],
      [childId, "not-a-batch"],
      [sibling, batchId],
    ]) {
      expect(await outcome(child, batch), `${child} ${batch}`).toEqual({
        notFound: true,
      });
    }

    for (const role of ["child", "admin"] as const) {
      signInAs((await insertUserWithRole(role)).userId);
      expect(await outcome(childId, batchId), role).toEqual({
        notFound: true,
      });
    }
  });
});
