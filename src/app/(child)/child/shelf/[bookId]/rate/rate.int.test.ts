import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { insertBook } from "../../../../../../../tests/fixtures/catalog";
import { insertSignedInChild } from "../../../../../../../tests/fixtures/child-session";
import { insertConsentRecord } from "../../../../../../../tests/fixtures/family";
import {
  insertFinishConfirmation,
  insertRating,
  insertShelfEntry,
} from "../../../../../../../tests/fixtures/shelf";
import {
  insertParent,
  insertUserWithRole,
} from "../../../../../../../tests/fixtures/users";
import { resetDatabase } from "../../../../../../../tests/integration/db";

// The rating page and saveRating (design/shlf.md, Tests, UC-SHLF-kid-rate-book: who may
// call, 4a, 1a and 1b on the page, payload). Invented children and books only.

vi.mock("@/server/identity-access/auth", () => ({ auth: vi.fn() }));
const jar = vi.hoisted(() => new Map<string, string>());
vi.mock("next/headers", () => ({
  cookies: () =>
    Promise.resolve({
      get: (name: string) =>
        jar.has(name) ? { name, value: jar.get(name) } : undefined,
    }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { default: ChildRateBookPage } = await import("./page");
const { saveRating } = await import("./actions");
const { revalidatePath } = await import("next/cache");
const { auth } = await import("@/server/identity-access/auth");
const { sessionCookie } =
  await import("@/server/identity-access/session-cookie");
const { getDb } = await import("@/server/lib/db");
const mockedAuth = vi.mocked(
  auth as unknown as () => Promise<{ user: { id: string } } | null>,
);

/** A signed-in child whose family's consent is confirmed. */
async function signedInChild(nickname?: string) {
  const child = await insertSignedInChild(nickname);
  const doc = await getDb()
    .collection<{ _id: string; familyId: ObjectId }>("children")
    .findOne({ _id: child.childId });
  await insertConsentRecord(
    {
      userId: new ObjectId().toHexString(),
      familyId: String(doc?.familyId.toHexString()),
    },
    true,
  );
  jar.set(sessionCookie().name, child.session.sessionToken);
  mockedAuth.mockResolvedValue({ user: { id: child.userId } });
  return child;
}

async function ratableBook(childId: string, title = "Moon Garden") {
  const bookId = await insertBook("active", title);
  await insertShelfEntry(childId, bookId, "finished");
  await insertFinishConfirmation(childId, bookId);
  return bookId;
}

const open = (bookId: string) =>
  ChildRateBookPage({ params: Promise.resolve({ bookId }) });
const ratings = () => getDb().collection("ratings");

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
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("/child/shelf/{bookId}/rate", () => {
  it("payload: the title, the current rating and the nickname, and nothing else", async () => {
    const { childId, userId } = await signedInChild("Starfish");
    const bookId = await ratableBook(childId);
    await insertRating(childId, bookId, "likedIt");

    const page = await open(bookId);
    expect(page.props).toEqual({
      view: {
        bookId,
        title: "Moon Garden",
        rating: "likedIt",
        nickname: "Starfish",
      },
    });
    const shown = JSON.stringify(page.props);
    expect(shown).not.toContain(childId);
    expect(shown).not.toContain(userId);
    expect(shown).not.toContain("2026-");
  });

  it("an unrated book has no rating", async () => {
    const { childId } = await signedInChild();
    const page = await open(await ratableBook(childId));
    expect(page.props).toMatchObject({ view: { rating: null } });
  });

  it("1a, 1b, draft: every refusal is the same 404", async () => {
    const other = await insertSignedInChild("Otter");
    const theirs = await ratableBook(other.childId, "Theirs");
    const { childId } = await signedInChild();
    const reading = await insertBook("active", "Reading");
    await insertShelfEntry(childId, reading, "readingNow");
    await insertFinishConfirmation(childId, reading);
    const waiting = await insertBook("active", "Waiting");
    await insertShelfEntry(childId, waiting, "finished");
    const draft = await insertBook("draft", "Draft");
    await insertShelfEntry(childId, draft, "finished");
    await insertFinishConfirmation(childId, draft);

    for (const bookId of [
      reading,
      waiting,
      draft,
      theirs,
      "no-such-book",
      "%E0%A4%A",
    ]) {
      expect(await digestOf(() => open(bookId))).toContain("404");
    }
    expect(await ratings().countDocuments()).toBe(0);
  });

  it("sends a visitor with no session to the child sign-in", async () => {
    mockedAuth.mockResolvedValue(null);
    expect(await digestOf(() => open("any-book"))).toContain(
      ";/child/sign-in;",
    );
  });

  it("gives a parent and an admin a 404", async () => {
    const parent = await insertParent({ parentRole: "main" });
    const admin = await insertUserWithRole("admin");
    for (const userId of [parent.userId, admin.userId]) {
      mockedAuth.mockResolvedValue({ user: { id: userId } });
      expect(await digestOf(() => open("any-book"))).toContain("404");
    }
  });
});

describe("saveRating", () => {
  it("saves the session child's rating and refreshes the shelf", async () => {
    const { childId } = await signedInChild();
    const bookId = await ratableBook(childId);
    expect(await saveRating({ bookId, rating: "lovedIt" })).toEqual({
      ok: true,
      data: { rating: "lovedIt" },
    });
    expect(await ratings().find().toArray()).toMatchObject([
      { childId, bookId, value: "lovedIt" },
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/child/shelf");
  });

  it("keeps a saved rating when the refresh fails", async () => {
    const { childId } = await signedInChild();
    const bookId = await ratableBook(childId);
    vi.mocked(revalidatePath).mockImplementationOnce(() => {
      throw new Error("invented refresh failure");
    });
    expect(await saveRating({ bookId, rating: "okay" })).toMatchObject({
      ok: true,
    });
    expect(await ratings().countDocuments()).toBe(1);
  });

  it("ignores a childId in the request: the child is the session's", async () => {
    const other = await insertSignedInChild("Otter");
    await ratableBook(other.childId, "Theirs");
    const { childId } = await signedInChild();
    const bookId = await ratableBook(childId);
    await saveRating({ bookId, rating: "likedIt", childId: other.childId });
    expect(await ratings().find().toArray()).toMatchObject([{ childId }]);
  });

  it("another child's book is NOT_RATABLE, and their rating is untouched", async () => {
    const other = await insertSignedInChild("Otter");
    const theirs = await ratableBook(other.childId, "Theirs");
    await insertRating(other.childId, theirs, "lovedIt");
    await signedInChild();
    expect(
      await saveRating({ bookId: theirs, rating: "notForMe" }),
    ).toMatchObject({ ok: false, error: { code: "NOT_RATABLE" } });
    expect(await ratings().find().toArray()).toMatchObject([
      { childId: other.childId, value: "lovedIt" },
    ]);
  });

  it("a signed-out caller gets NOT_SIGNED_IN and nothing is written", async () => {
    mockedAuth.mockResolvedValue(null);
    expect(
      await saveRating({ bookId: "book-1", rating: "lovedIt" }),
    ).toMatchObject({ ok: false, error: { code: "NOT_SIGNED_IN" } });
    expect(await ratings().countDocuments()).toBe(0);
  });

  it("a parent and an admin get NOT_A_CHILD, before the input is checked", async () => {
    const parent = await insertParent({ parentRole: "main" });
    const admin = await insertUserWithRole("admin");
    for (const userId of [parent.userId, admin.userId]) {
      mockedAuth.mockResolvedValue({ user: { id: userId } });
      expect(await saveRating({ rating: "superb" })).toMatchObject({
        ok: false,
        error: { code: "NOT_A_CHILD" },
      });
    }
    expect(await ratings().countDocuments()).toBe(0);
  });

  it.each([
    ["a value off the scale", "superb"],
    ["no value", undefined],
    ["a number", 5],
    ["a query", { $ne: null }],
  ])(
    "4a: %s is INVALID_RATING and the earlier rating stays",
    async (_label, rating) => {
      const { childId } = await signedInChild();
      const bookId = await ratableBook(childId);
      await insertRating(childId, bookId, "likedIt");
      expect(await saveRating({ bookId, rating })).toEqual({
        ok: false,
        error: { code: "INVALID_RATING", message: "Choose one of the four." },
      });
      expect(await ratings().find().toArray()).toMatchObject([
        { value: "likedIt" },
      ]);
    },
  );

  it.each([
    ["no book ID", { rating: "lovedIt" }],
    ["an empty book ID", { bookId: "", rating: "lovedIt" }],
    ["an oversized book ID", { bookId: "b".repeat(101), rating: "lovedIt" }],
    ["a query as the book ID", { bookId: { $ne: null }, rating: "lovedIt" }],
    ["no object at all", "lovedIt"],
  ])("%s is NOT_RATABLE", async (_label, input) => {
    const { childId } = await signedInChild();
    await ratableBook(childId);
    expect(await saveRating(input)).toMatchObject({
      ok: false,
      error: { code: "NOT_RATABLE" },
    });
    expect(await ratings().countDocuments()).toBe(0);
  });
});
