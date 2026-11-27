import { randomUUID } from "node:crypto";
import { ObjectId } from "mongodb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { insertBook } from "../../../../../tests/fixtures/catalog";
import { insertChild } from "../../../../../tests/fixtures/children";
import { insertConsentRecord } from "../../../../../tests/fixtures/family";
import { insertShelfEntry } from "../../../../../tests/fixtures/shelf";
import { insertSuggestion } from "../../../../../tests/fixtures/suggestions";
import {
  insertParent,
  insertUserWithRole,
} from "../../../../../tests/fixtures/users";
import { resetDatabase } from "../../../../../tests/integration/db";
import type { BookListProps } from "./book-list";
import type { ChildPickerProps } from "./[bookId]/suggest/child-picker";
import type { SuggestScreenProps } from "../children/[childId]/suggest/[bookId]/suggest-screen";

// UC-PAR-suggest-book, the three pages (design/par.md, Tests): step 1, 1a, 1b, PRE-3,
// the 4a warning, authorization, the onboarding gate and the release gate. Each page
// returns one view component, so the tests read its props. Invented data only.

vi.mock("@/server/identity-access/auth", () => ({ auth: vi.fn() }));
const gate = vi.hoisted(() => ({ enabled: true }));
vi.mock("@/server/lib/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/lib/config")>();
  return { ...actual, areParentSuggestionsEnabled: () => gate.enabled };
});
const noChildren = vi.hoisted(() => ({ enabled: false }));
vi.mock("@/server/accounts-family/child-accounts", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/server/accounts-family/child-accounts")
    >();
  return {
    ...actual,
    listChildrenForFamily: async (familyId: string) =>
      noChildren.enabled ? [] : actual.listChildrenForFamily(familyId),
  };
});

const { auth } = await import("@/server/identity-access/auth");
const { default: BooksPage } = await import("./page");
const { default: PickerPage } = await import("./[bookId]/suggest/page");
const { default: SuggestPage } =
  await import("../children/[childId]/suggest/[bookId]/page");
const { insertChildIdentity } =
  await import("@/server/child-identity/child-identity");
const { getDb, withTransaction } = await import("@/server/lib/db");

const mockedAuth = vi.mocked(
  auth as unknown as () => Promise<{ user: { id: string } } | null>,
);
const signInAs = (userId: string | null) => {
  mockedAuth.mockResolvedValue(userId ? { user: { id: userId } } : null);
};

type Outcome<P> =
  { rendered: P } | { redirect: string | undefined } | { notFound: true };

/** What a page did: rendered (with its view's props), redirected or 404. */
async function outcome<P>(render: () => Promise<unknown>): Promise<Outcome<P>> {
  try {
    const element = (await render()) as { props: P };
    return { rendered: element.props };
  } catch (err) {
    const digest = (err as { digest?: string }).digest ?? "";
    if (digest.startsWith("NEXT_REDIRECT")) {
      return { redirect: digest.split(";")[2] };
    }
    if (digest.endsWith(";404")) return { notFound: true };
    throw err;
  }
}

const books = () => outcome<BookListProps>(() => BooksPage());
const picker = (bookId: string) =>
  outcome<ChildPickerProps>(() =>
    PickerPage({ params: Promise.resolve({ bookId }) }),
  );
const confirm = (childId: string, bookId: string) =>
  outcome<SuggestScreenProps>(() =>
    SuggestPage({ params: Promise.resolve({ childId, bookId }) }),
  );

async function addChild(familyId: string, nickname: string, createdAt?: Date) {
  const childId = await insertChild(familyId, {
    nickname,
    ...(createdAt ? { createdAt } : {}),
  });
  // 4a's released-batch read needs the age, as createChildAccount leaves it.
  await withTransaction((tx) =>
    insertChildIdentity(tx, { childId, age: 7, grade: "2" }),
  );
  return childId;
}

/** A consented family with one child: onboarding is `complete`. */
async function family() {
  const main = await insertParent({ parentRole: "main" });
  await insertConsentRecord(main, true);
  const sub = await insertParent({
    parentRole: "sub",
    familyId: new ObjectId(main.familyId),
  });
  const childId = await addChild(main.familyId, "Otterpop");
  const bookId = await insertBook("active", "Lantern Hill");
  return { main, sub, childId, bookId };
}

beforeEach(async () => {
  await resetDatabase();
  gate.enabled = true;
  noChildren.enabled = false;
});
afterEach(() => {
  mockedAuth.mockReset();
});

describe("step 1: /parent/books", () => {
  it("lists active books only, with title and author, to a Main or Sub Parent", async () => {
    const { main, sub, bookId } = await family();
    await insertBook("draft", "Draft Tale");
    await insertBook("blocked", "Blocked Tale");
    for (const userId of [main.userId, sub.userId]) {
      signInAs(userId);
      expect(await books()).toEqual({
        rendered: {
          books: [{ id: bookId, title: "Lantern Hill", author: "A. Writer" }],
        },
      });
    }
  });
});

describe("1a: /parent/books/[bookId]/suggest", () => {
  it("with one child, redirects to that child's confirmation page", async () => {
    const { main, childId, bookId } = await family();
    signInAs(main.userId);
    expect(await picker(bookId)).toEqual({
      redirect: `/parent/children/${childId}/suggest/${bookId}`,
    });
  });

  it("with several, lists them by nickname and avatar only", async () => {
    const { main, childId, bookId } = await family();
    const second = await addChild(
      main.familyId,
      "Puffin",
      new Date("2026-10-02T12:00:00Z"),
    );
    signInAs(main.userId);
    expect(await picker(bookId)).toEqual({
      rendered: {
        view: {
          kind: "children",
          bookId,
          children: [
            { id: childId, nickname: "Otterpop", avatar: "1-1" },
            { id: second, nickname: "Puffin", avatar: "1-1" },
          ],
        },
      },
    });
  });

  it("with none, a Main Parent goes to add one and a Sub Parent sees the message", async () => {
    // The onboarding gate needs a child, so an empty list is reached only when the last
    // child is deleted after that check; the fixture returns the empty list then.
    const { main, sub, bookId } = await family();
    noChildren.enabled = true;
    signInAs(main.userId);
    expect(await picker(bookId)).toEqual({ redirect: "/parent/children/new" });
    signInAs(sub.userId);
    expect(await picker(bookId)).toEqual({
      rendered: { view: { kind: "noChild" } },
    });
  });
});

describe("step 2: /parent/children/[childId]/suggest/[bookId]", () => {
  it("shows the child's nickname and the book's title and author, with no warning", async () => {
    const { main, childId, bookId } = await family();
    signInAs(main.userId);
    expect(await confirm(childId, bookId)).toEqual({
      rendered: {
        view: {
          kind: "form",
          childId,
          bookId,
          nickname: "Otterpop",
          avatar: "1-1",
          title: "Lantern Hill",
          author: "A. Writer",
          conflict: null,
        },
      },
    });
  });

  it("4a: shows the warning before the parent confirms", async () => {
    const { main, childId, bookId } = await family();
    const pending = await insertBook("active", "Otter Bay");
    await insertShelfEntry(childId, bookId, "wantToRead");
    await insertSuggestion(childId, pending);
    signInAs(main.userId);
    expect(await confirm(childId, bookId)).toMatchObject({
      rendered: { view: { conflict: "onShelf" } },
    });
    expect(await confirm(childId, pending)).toMatchObject({
      rendered: { view: { conflict: "suggested" } },
    });
  });

  it("1b: an excluded book shows the explanation and no form; a sibling still gets the form", async () => {
    const { main, childId, bookId } = await family();
    const sibling = await addChild(main.familyId, "Puffin");
    await getDb().collection("childBookExclusions").insertOne({
      _id: new ObjectId(),
      childId,
      bookId,
      reportId: new ObjectId(),
      createdAt: new Date(),
    });
    signInAs(main.userId);
    expect(await confirm(childId, bookId)).toEqual({
      rendered: { view: { kind: "excluded", nickname: "Otterpop" } },
    });
    expect(await confirm(sibling, bookId)).toMatchObject({
      rendered: { view: { kind: "form" } },
    });
  });
});

describe("PRE-3, authorization and the gates, on every page", () => {
  it("PRE-3: an unknown, draft or blocked book is 404 on both suggest pages, with no title", async () => {
    const { main, childId } = await family();
    signInAs(main.userId);
    for (const bookId of [
      randomUUID(),
      await insertBook("draft", "Draft Tale"),
      await insertBook("blocked", "Blocked Tale"),
    ]) {
      expect(await picker(bookId)).toEqual({ notFound: true });
      expect(await confirm(childId, bookId)).toEqual({ notFound: true });
    }
  });

  it("decodes the percent-encoded route segments Next.js passes, and a bad encoding is 404 (review of #147)", async () => {
    const { main, childId } = await family();
    // The fixture returns its own ID, so keep the one it is given.
    const bookId = `odd/path?#id ${randomUUID()}`;
    await insertBook("active", "Odd Path", { _id: bookId });
    signInAs(main.userId);
    expect(await picker(encodeURIComponent(bookId))).toEqual({
      redirect: `/parent/children/${childId}/suggest/${encodeURIComponent(bookId)}`,
    });
    expect(
      await confirm(encodeURIComponent(childId), encodeURIComponent(bookId)),
    ).toMatchObject({ rendered: { view: { kind: "form", bookId } } });
    expect(await picker("%E0%A4%A")).toEqual({ notFound: true });
    expect(await confirm(childId, "%E0%A4%A")).toEqual({ notFound: true });
  });

  it("a foreign, unknown or malformed child is the same 404", async () => {
    const { bookId } = await family();
    const { childId: foreignChild } = await family();
    const stranger = await insertParent({ parentRole: "main" });
    await insertConsentRecord(stranger, true);
    await addChild(stranger.familyId, "Wren");
    signInAs(stranger.userId);
    for (const childId of [foreignChild, randomUUID(), "not-a-child-id"]) {
      expect(await confirm(childId, bookId)).toEqual({ notFound: true });
    }
  });

  it("no session goes to sign-in; a child or admin session is 404", async () => {
    const { childId, bookId } = await family();
    const pages = [books, () => picker(bookId), () => confirm(childId, bookId)];
    for (const page of pages) {
      signInAs(null);
      expect(await page()).toEqual({ redirect: "/sign-in" });
      for (const role of ["child", "admin"] as const) {
        signInAs((await insertUserWithRole(role)).userId);
        expect(await page()).toEqual({ notFound: true });
      }
    }
  });

  it("onboarding gate: a family whose onboarding is not complete goes to /parent", async () => {
    // No child yet (`needs-first-child`), and consent not confirmed (`awaiting`).
    const noChild = await insertParent({ parentRole: "main" });
    await insertConsentRecord(noChild, true);
    const awaiting = await insertParent({ parentRole: "main" });
    await insertConsentRecord(awaiting, false);
    const childId = await addChild(awaiting.familyId, "Wren");
    const bookId = await insertBook("active", "Lantern Hill");
    for (const userId of [noChild.userId, awaiting.userId]) {
      signInAs(userId);
      for (const page of [
        books,
        () => picker(bookId),
        () => confirm(childId, bookId),
      ]) {
        expect(await page()).toEqual({ redirect: "/parent" });
      }
    }
  });

  it("release gate: with the gate off, every suggest page is 404", async () => {
    const { main, childId, bookId } = await family();
    gate.enabled = false;
    signInAs(main.userId);
    for (const page of [
      books,
      () => picker(bookId),
      () => confirm(childId, bookId),
    ]) {
      expect(await page()).toEqual({ notFound: true });
    }
  });
});
