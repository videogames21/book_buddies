import { beforeEach, describe, expect, it, vi } from "vitest";
import { insertBook } from "../../../../../tests/fixtures/catalog";
import { insertSignedInChild } from "../../../../../tests/fixtures/child-session";
import { insertShelfEntry } from "../../../../../tests/fixtures/shelf";
import {
  insertParent,
  insertUserWithRole,
} from "../../../../../tests/fixtures/users";
import { resetDatabase } from "../../../../../tests/integration/db";

// The child's shelf page and dismissChildNotice (design/shlf.md, Tests,
// "UC-SHLF-kid-view-shelf", dismiss and authorization). Invented children only.

vi.mock("@/server/identity-access/auth", () => ({ auth: vi.fn() }));
const jar = vi.hoisted(() => new Map<string, string>());
vi.mock("next/headers", () => ({
  cookies: () =>
    Promise.resolve({
      get: (name: string) =>
        jar.has(name) ? { name, value: jar.get(name) } : undefined,
    }),
}));
vi.mock("@/server/notification/child-notices", async (importOriginal) => {
  const real =
    await importOriginal<
      typeof import("@/server/notification/child-notices")
    >();
  return { ...real, markNoticeSeen: vi.fn(real.markNoticeSeen) };
});

vi.mock("@/server/catalog/books", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/server/catalog/books")>();
  return { ...real, getBooksForShelf: vi.fn(real.getBooksForShelf) };
});

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { default: ChildShelfPage } = await import("./page");
const { dismissChildNotice } = await import("./actions");
const { createRemovalNoticeInTx, markNoticeSeen } =
  await import("@/server/notification/child-notices");
const { getBooksForShelf } = await import("@/server/catalog/books");
const { revalidatePath } = await import("next/cache");
const { auth } = await import("@/server/identity-access/auth");
const { sessionCookie } =
  await import("@/server/identity-access/session-cookie");
const { getDb, withTransaction } = await import("@/server/lib/db");
const { setClock, resetClock, now } = await import("@/server/lib/clock");
const mockedAuth = vi.mocked(
  auth as unknown as () => Promise<{ user: { id: string } } | null>,
);

async function signedInChild(nickname?: string) {
  const child = await insertSignedInChild(nickname);
  jar.set(sessionCookie().name, child.session.sessionToken);
  mockedAuth.mockResolvedValue({ user: { id: child.userId } });
  return child;
}

/** A removal notice for the child; returns its ID. */
async function noticeFor(childId: string) {
  await withTransaction((tx) => createRemovalNoticeInTx(tx, childId, "book-1"));
  const notice = await getDb().collection("childNotices").findOne({ childId });
  return String(notice?._id);
}

/** A few minutes from now, to see that a request counts as the child's activity. */
function fiveMinutesOn() {
  const later = new Date(now().getTime() + 5 * 60 * 1000);
  setClock(() => later);
  return later;
}
const activeAt = (at: Date) =>
  getDb().collection("childSessionEnds").countDocuments({ lastActiveAt: at });

const unseen = () =>
  getDb()
    .collection("childNotices")
    .countDocuments({ seenAt: { $exists: false } });

/** The digest Next.js gives a redirect or a 404 thrown while rendering. */
async function digestOf(render: () => Promise<unknown>): Promise<string> {
  try {
    await render();
  } catch (err) {
    return (err as { digest?: string }).digest ?? String(err);
  }
  return "rendered";
}

beforeEach(async () => {
  await resetDatabase();
  jar.clear();
  mockedAuth.mockReset();
  vi.mocked(revalidatePath).mockReset();
  resetClock();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("/child/shelf", () => {
  it("shows the shelf of the session's child, whoever else has books", async () => {
    const other = await insertSignedInChild("Otter");
    await insertShelfEntry(
      other.childId,
      await insertBook("active", "Theirs"),
      "readingNow",
    );
    const { childId } = await signedInChild();
    await insertShelfEntry(
      childId,
      await insertBook("active", "Mine"),
      "readingNow",
    );
    const at = fiveMinutesOn();
    const page = await ChildShelfPage();
    expect(await activeAt(at)).toBe(1);
    const shown = JSON.stringify(page.props);
    expect(shown).toContain("Mine");
    expect(shown).not.toContain("Theirs");
    expect(shown).not.toContain(childId);
  });

  it("2b: a failed read reaches the retry screen, not an empty shelf", async () => {
    await signedInChild();
    vi.mocked(getBooksForShelf).mockRejectedValueOnce(
      new Error("invented failure"),
    );
    await expect(ChildShelfPage()).rejects.toThrow("invented failure");
  });

  it("sends a visitor with no session to the child sign-in", async () => {
    mockedAuth.mockResolvedValue(null);
    expect(await digestOf(() => ChildShelfPage())).toContain(
      ";/child/sign-in;",
    );
  });

  it("gives a parent and an admin a 404", async () => {
    const parent = await insertParent({ parentRole: "main" });
    const admin = await insertUserWithRole("admin");
    for (const userId of [parent.userId, admin.userId]) {
      mockedAuth.mockResolvedValue({ user: { id: userId } });
      expect(await digestOf(() => ChildShelfPage())).toContain("404");
    }
  });
});

describe("dismissChildNotice", () => {
  it("marks the child's own notice seen, and answers ok again without changing it", async () => {
    const { childId } = await signedInChild();
    const id = await noticeFor(childId);
    const at = fiveMinutesOn();
    expect(await dismissChildNotice(id)).toEqual({ ok: true, data: null });
    expect(await activeAt(at)).toBe(1);
    const first = await getDb().collection("childNotices").findOne();
    expect(first?.seenAt).toBeInstanceOf(Date);
    const later = new Date(now().getTime() + 60 * 1000);
    setClock(() => later);
    expect(await dismissChildNotice(id)).toEqual({ ok: true, data: null });
    expect(await getDb().collection("childNotices").findOne()).toEqual(first);
  });

  it("refreshes the shelf after saving", async () => {
    const { childId } = await signedInChild();
    await dismissChildNotice(await noticeFor(childId));
    expect(revalidatePath).toHaveBeenCalledWith("/child/shelf");
  });

  it("keeps a saved OK when the refresh fails", async () => {
    const { childId } = await signedInChild();
    const id = await noticeFor(childId);
    vi.mocked(revalidatePath).mockImplementationOnce(() => {
      throw new Error("invented refresh failure");
    });
    expect(await dismissChildNotice(id)).toEqual({ ok: true, data: null });
    expect(await unseen()).toBe(0);
  });

  it("answers another child's notice the same way, and leaves it unseen", async () => {
    const other = await insertSignedInChild("Otter");
    const id = await noticeFor(other.childId);
    await signedInChild();
    expect(await dismissChildNotice(id)).toEqual({ ok: true, data: null });
    expect(await unseen()).toBe(1);
  });

  it("refuses an ended session, and the notice stays", async () => {
    const { childId } = await signedInChild();
    const id = await noticeFor(childId);
    const idle = new Date(now().getTime() + 31 * 60 * 1000);
    setClock(() => idle);
    expect(await dismissChildNotice(id)).toMatchObject({
      error: { code: "NOT_SIGNED_IN" },
    });
    expect(await unseen()).toBe(1);
  });

  it("checks the session before the input, and refuses a parent", async () => {
    const parent = await insertParent({ parentRole: "main" });
    mockedAuth.mockResolvedValue({ user: { id: parent.userId } });
    expect(await dismissChildNotice("not-an-id")).toMatchObject({
      error: { code: "NOT_A_CHILD" },
    });
  });

  it.each([
    ["text", "not-an-id"],
    ["a query", { $ne: null }],
    ["nothing", undefined],
    ["an ID with a character too many", "a".repeat(25)],
  ])("refuses %s as a notice ID", async (_label, input) => {
    const { childId } = await signedInChild();
    await noticeFor(childId);
    expect(await dismissChildNotice(input)).toMatchObject({
      error: { code: "INVALID_NOTICE" },
    });
    expect(await unseen()).toBe(1);
  });

  it("answers an unexpected failure with a code and an error ID, and no detail", async () => {
    const { childId } = await signedInChild();
    const id = await noticeFor(childId);
    vi.mocked(markNoticeSeen).mockRejectedValueOnce(
      new Error("invented database detail"),
    );
    expect(await dismissChildNotice(id)).toEqual({
      ok: false,
      error: {
        code: "DISMISS_FAILED",
        message: "That didn’t work. Try again or ask a grown-up.",
        errorId: expect.any(String) as string,
      },
    });
  });
});
