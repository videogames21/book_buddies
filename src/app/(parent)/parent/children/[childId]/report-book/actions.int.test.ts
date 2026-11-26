import { ObjectId } from "mongodb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { insertBook } from "../../../../../../../tests/fixtures/catalog";
import { insertChild } from "../../../../../../../tests/fixtures/children";
import { insertConsentRecord } from "../../../../../../../tests/fixtures/family";
import { insertShelfEntry } from "../../../../../../../tests/fixtures/shelf";
import {
  insertParent,
  insertUserWithRole,
} from "../../../../../../../tests/fixtures/users";
import { resetDatabase } from "../../../../../../../tests/integration/db";
import { REPORT_COMMENT_MAX_LENGTH } from "@/shared/accounts-family/book-report";

// The action's own rows of UC-PAR-report-book: authorization, and validation before any
// write. The transaction's rows are in book-reports.int.test.ts. Invented data only.

vi.mock("@/server/identity-access/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/server/identity-access/auth");
const { getDb } = await import("@/server/lib/db");
const { reportBook } = await import("./actions");

const mockedAuth = vi.mocked(
  auth as unknown as () => Promise<{ user: { id: string } } | null>,
);
const signInAs = (userId: string | null) =>
  mockedAuth.mockResolvedValue(userId ? { user: { id: userId } } : null);

async function familyWithBookOnShelf(parentRole: "main" | "sub" = "main") {
  const parent = await insertParent({ parentRole });
  await insertConsentRecord(parent, true);
  const childId = await insertChild(parent.familyId);
  const bookId = await insertBook("active");
  await insertShelfEntry(childId, bookId, "wantToRead");
  return { ...parent, childId, bookId };
}

const count = (name: string) => getDb().collection(name).countDocuments();
async function expectNothingWritten() {
  expect(await count("bookReports")).toBe(0);
  expect(await count("childBookExclusions")).toBe(0);
  expect(await count("childNotices")).toBe(0);
  expect(await count("auditLog")).toBe(0);
  expect(await count("shelfEntries")).toBe(1);
}

const valid = (f: { childId: string; bookId: string }) => ({
  childId: f.childId,
  bookId: f.bookId,
  reason: "inappropriate-content",
  comment: "  Too scary for bedtime  ",
  confirmed: true,
});

describe("reportBook action (UC-PAR-report-book)", () => {
  beforeEach(async () => {
    await resetDatabase();
    mockedAuth.mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("main: a Sub Parent's valid report is saved with the trimmed comment, and the result is removedFromShelf only", async () => {
    const family = await familyWithBookOnShelf("sub");
    signInAs(family.userId);

    const result = await reportBook(valid(family));

    expect(result).toEqual({ ok: true, data: { removedFromShelf: true } });
    const report = await getDb().collection("bookReports").findOne();
    expect(report).toMatchObject({
      reportedByUserId: new ObjectId(family.userId),
      comment: "Too scary for bedtime",
    });
  });

  it("a blank comment is stored as no comment", async () => {
    const family = await familyWithBookOnShelf();
    signInAs(family.userId);

    await reportBook({ ...valid(family), comment: "   " });

    const report = await getDb().collection("bookReports").findOne();
    expect(report).not.toHaveProperty("comment");
  });

  it("authorization: no session is NOT_SIGNED_IN and nothing is written", async () => {
    const family = await familyWithBookOnShelf();
    signInAs(null);

    const result = await reportBook(valid(family));

    expect(result).toMatchObject({
      ok: false,
      error: { code: "NOT_SIGNED_IN" },
    });
    await expectNothingWritten();
  });

  it("authorization: child and admin sessions are NOT_A_PARENT and nothing is written", async () => {
    const family = await familyWithBookOnShelf();
    for (const role of ["child", "admin"] as const) {
      const other = await insertUserWithRole(role);
      signInAs(other.userId);

      const result = await reportBook(valid(family));

      expect(result).toMatchObject({
        ok: false,
        error: { code: "NOT_A_PARENT" },
      });
    }
    await expectNothingWritten();
  });

  it("authorization: another family's child is CHILD_NOT_FOUND, and a family ID in the request is ignored", async () => {
    const family = await familyWithBookOnShelf();
    const stranger = await insertParent({ parentRole: "main" });
    await insertConsentRecord(stranger, true);
    signInAs(stranger.userId);

    const result = await reportBook({
      ...valid(family),
      familyId: family.familyId,
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "CHILD_NOT_FOUND" },
    });
    await expectNothingWritten();
  });

  it("validation runs before any write: 3a, the comment limit and 6 are refused with nothing written", async () => {
    const family = await familyWithBookOnShelf();
    signInAs(family.userId);

    const refusals = [
      [{ ...valid(family), reason: undefined }, "REASON_REQUIRED"],
      [{ ...valid(family), reason: "my-own-reason" }, "INVALID_REASON"],
      [
        {
          ...valid(family),
          comment: "a".repeat(REPORT_COMMENT_MAX_LENGTH + 1),
        },
        "COMMENT_TOO_LONG",
      ],
      [{ ...valid(family), confirmed: false }, "NOT_CONFIRMED"],
      [{ ...valid(family), childId: undefined }, "CHILD_NOT_FOUND"],
    ] as const;
    for (const [input, code] of refusals) {
      expect(await reportBook(input)).toMatchObject({
        ok: false,
        error: { code },
      });
    }
    await expectNothingWritten();
  });

  it("errors reach the caller as the shared shape, with no exception text", async () => {
    const family = await familyWithBookOnShelf();
    signInAs(family.userId);
    mockedAuth.mockRejectedValueOnce(new Error("secret internal detail"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await reportBook(valid(family));

    expect(result).toMatchObject({
      ok: false,
      error: { code: "SAVE_FAILED", errorId: expect.any(String) as unknown },
    });
    expect(JSON.stringify(result)).not.toContain("secret internal detail");
    await expectNothingWritten();
  });
});
