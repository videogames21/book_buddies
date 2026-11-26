import { ObjectId } from "mongodb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { insertBatch } from "../../../../tests/fixtures/batches";
import { insertBook } from "../../../../tests/fixtures/catalog";
import { insertChild } from "../../../../tests/fixtures/children";
import { insertConsentRecord } from "../../../../tests/fixtures/family";
import { insertParent } from "../../../../tests/fixtures/users";
import { resetDatabase } from "../../../../tests/integration/db";

vi.mock("@/server/identity-access/auth", () => ({ auth: vi.fn() }));

const { default: ParentHomePage } = await import("./page");
const { PendingBatches } = await import("./pending-batches");
const { default: NewChildPage } = await import("./children/new/page");
const { createChildAccount } = await import("./children/new/actions");
const { auth } = await import("@/server/identity-access/auth");
const { getDb } = await import("@/server/lib/db");
const { resetClock, setClock } = await import("@/server/lib/clock");
const mockedAuth = vi.mocked(
  auth as unknown as () => Promise<{ user: { id: string } } | null>,
);

/** Where a page redirected to, or null when it rendered. */
async function redirectOf(render: () => Promise<unknown>) {
  try {
    await render();
    return null;
  } catch (err) {
    const digest = (err as { digest?: string }).digest ?? "";
    if (!digest.startsWith("NEXT_REDIRECT")) throw err;
    return digest.split(";")[2];
  }
}

async function signedInMain(confirmed: boolean) {
  const parent = await insertParent({ parentRole: "main" });
  await insertConsentRecord(parent, confirmed);
  mockedAuth.mockResolvedValue({ user: { id: parent.userId } });
  return parent;
}

beforeEach(async () => {
  await resetDatabase();
  mockedAuth.mockReset();
  // The fixture's unconfirmed record has confirmBy 2026-10-15T12:00:00Z.
  setClock(() => new Date("2026-10-10T12:00:00Z"));
});
afterEach(resetClock);

describe("the /parent gate (UC-PAR-onboarding 6, 6a, 8a)", () => {
  it("6: before confirmation, /parent and /parent/children/new go to check-email, and creating a child is refused", async () => {
    await signedInMain(false);
    expect(await redirectOf(() => ParentHomePage())).toBe(
      "/parent/onboarding/check-email",
    );
    expect(await redirectOf(() => NewChildPage())).toBe(
      "/parent/onboarding/check-email",
    );
    expect(await createChildAccount({})).toMatchObject({
      error: { code: "CONSENT_NOT_CONFIRMED" },
    });
    expect(await getDb().collection("children").countDocuments()).toBe(0);
  });

  it("6a: an expired parent who signs in again is sent to check-email", async () => {
    await signedInMain(false);
    setClock(() => new Date("2026-10-15T12:00:00Z"));
    expect(await redirectOf(() => ParentHomePage())).toBe(
      "/parent/onboarding/check-email",
    );
  });

  it("8a: a confirmed parent with no child goes to the child form; with a child, home", async () => {
    const parent = await signedInMain(true);
    expect(await redirectOf(() => ParentHomePage())).toBe(
      "/parent/children/new",
    );
    await getDb()
      .collection<{ _id: string; [field: string]: unknown }>("children")
      .insertOne({
        _id: "33333333-3333-4333-8333-333333333333",
        familyId: new ObjectId(parent.familyId),
        nickname: "Otter",
        avatar: "1",
        createdAt: new Date(),
      });
    expect(await redirectOf(() => ParentHomePage())).toBeNull();
  });

  it("no session goes to sign-in", async () => {
    mockedAuth.mockResolvedValue(null);
    expect(await redirectOf(() => ParentHomePage())).toBe("/sign-in");
  });
});

describe("Recommendations to review on /parent (UC-REC-parent-review step 1)", () => {
  type Node = { type?: unknown; props?: { children?: unknown } };

  /** The batches the page passed to its PendingBatches section. */
  function pendingOf(tree: unknown): unknown[] | null {
    const node = tree as Node | null;
    if (!node || typeof node !== "object") return null;
    if (node.type === PendingBatches) {
      return (node.props as { batches: unknown[] }).batches;
    }
    const children = node.props?.children;
    for (const child of Array.isArray(children) ? children : [children]) {
      const found = pendingOf(child);
      if (found) return found;
    }
    return null;
  }

  it("lists each pending batch with the child's nickname, the number of books and the deadline, and drops it once confirmed or past the deadline", async () => {
    setClock(() => new Date("2026-11-24T18:00:00Z"));
    const parent = await signedInMain(true);
    const childId = await insertChild(parent.familyId, { nickname: "Otter" });
    const book = await insertBook("active");
    const batchId = await insertBatch({ childId, bookIds: [book] });

    expect(pendingOf(await ParentHomePage())).toEqual([
      {
        batchId,
        childId,
        nickname: "Otter",
        bookCount: 1,
        handoffDeadline: new Date("2026-11-25T12:00:00Z"),
      },
    ]);

    setClock(() => new Date("2026-11-25T12:00:00Z"));
    expect(pendingOf(await ParentHomePage())).toEqual([]);
  });
});
