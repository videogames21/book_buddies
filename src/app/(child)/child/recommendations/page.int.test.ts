import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { insertBatch } from "../../../../../tests/fixtures/batches";
import { insertBook } from "../../../../../tests/fixtures/catalog";
import { insertSignedInChild } from "../../../../../tests/fixtures/child-session";
import { insertSuggestion } from "../../../../../tests/fixtures/suggestions";
import {
  insertParent,
  insertUserWithRole,
} from "../../../../../tests/fixtures/users";
import { resetDatabase } from "../../../../../tests/integration/db";

// UC-REC-kid-review, the page's rows (design/rec.md, Tests): authorization (the 404 and
// the sign-in redirect), the page half of child-facing, and a failed read reaching the
// retry screen. Invented data only.

vi.mock("@/server/identity-access/auth", () => ({ auth: vi.fn() }));
const jar = vi.hoisted(() => new Map<string, string>());
vi.mock("next/headers", () => ({
  cookies: () =>
    Promise.resolve({
      get: (name: string) =>
        jar.has(name) ? { name, value: jar.get(name) } : undefined,
      delete: (name: string) => jar.delete(name),
    }),
}));
// The list reads the router; a server render has none mounted.
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ refresh: vi.fn() }),
}));
// The suggestion release gate (README) is on, so a suggestion can be listed.
vi.mock("@/server/lib/config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/lib/config")>()),
  areParentSuggestionsEnabled: () => true,
}));

const { default: ChildRecommendationsPage } = await import("./page");
const { auth } = await import("@/server/identity-access/auth");
const { sessionCookie } =
  await import("@/server/identity-access/session-cookie");
const { insertChildIdentity } =
  await import("@/server/child-identity/child-identity");
const { getDb, withTransaction } = await import("@/server/lib/db");
const mockedAuth = vi.mocked(
  auth as unknown as () => Promise<{ user: { id: string } } | null>,
);

const NOTE = "You liked the one about otters";

/** A signed-in child aged 7, the age the released-batch read needs. */
async function signedInChild() {
  const child = await insertSignedInChild();
  await withTransaction((tx) =>
    insertChildIdentity(tx, { childId: child.childId, age: 7, grade: "2" }),
  );
  jar.set(sessionCookie().name, child.session.sessionToken);
  mockedAuth.mockResolvedValue({ user: { id: child.userId } });
  return child;
}

/** The digest Next.js gives a redirect or a 404 thrown while rendering. */
async function digestOf(render: () => Promise<unknown>): Promise<string> {
  try {
    await render();
  } catch (err) {
    return (err as { digest?: string }).digest ?? String(err);
  }
  return "rendered";
}

const textOf = (html: string) => html.split(/<[^>]*>/).filter(Boolean);

beforeEach(async () => {
  await resetDatabase();
  jar.clear();
  mockedAuth.mockReset();
});

describe("/child/recommendations (UC-REC-kid-review steps 1–2)", () => {
  it("shows the suggestion with its label and note, then the released book, each with its title, author and the three answers", async () => {
    const { childId } = await signedInChild();
    const suggested = await insertBook("active", "River Song");
    const released = await insertBook("active", "Moon Garden");
    await insertSuggestion(childId, suggested, { note: NOTE });
    await insertBatch({
      childId,
      bookIds: [released],
      status: "released",
      releasedAt: new Date("2026-11-25T12:00:00Z"),
    });

    const text = textOf(renderToStaticMarkup(await ChildRecommendationsPage()));

    expect(text).toEqual([
      "My recommendations",
      "River Song",
      "by A. Writer",
      "From your grown-up",
      NOTE,
      "Yes",
      "Maybe later",
      "Not for me",
      "Moon Garden",
      "by A. Writer",
      "Yes",
      "Maybe later",
      "Not for me",
      "Back home",
    ]);
  });

  it("child-facing: no count, date, batch ID or status in the page (§8.2.11, BR-kid-no-metrics)", async () => {
    const { childId } = await signedInChild();
    const bookIds = [
      await insertBook("active", "Moon Garden"),
      await insertBook("active", "River Song"),
    ];
    const batchId = await insertBatch({
      childId,
      bookIds,
      status: "released",
      releasedAt: new Date("2026-11-25T12:00:00Z"),
    });

    const html = renderToStaticMarkup(await ChildRecommendationsPage());

    expect(html).not.toContain(batchId);
    expect(html).not.toContain(childId);
    expect(html).not.toMatch(/released|pending|2026/i);
    // No digit anywhere a child reads: no count, position or date.
    expect(textOf(html).join(" ")).not.toMatch(/\d/);
  });

  it("2, empty: a batch the parent emptied shows the one empty message and a link to the quiz, and no count", async () => {
    const { childId } = await signedInChild();
    await insertBatch({
      childId,
      bookIds: [],
      status: "empty",
      releasedAt: new Date("2026-11-25T12:00:00Z"),
    });

    const html = renderToStaticMarkup(await ChildRecommendationsPage());

    expect(textOf(html)).toEqual([
      "My recommendations",
      "No new picks right now. You can ask again.",
      "Get recommendations",
      "Back home",
    ]);
    expect(html).toContain('href="/child/recommendations/quiz"');
  });

  it("a failed read throws to the retry screen, with no partial list", async () => {
    const { childId } = await signedInChild();
    await insertBatch({
      childId,
      bookIds: [await insertBook("active")],
      status: "released",
      releasedAt: new Date("2026-11-25T12:00:00Z"),
    });
    // With no age the released-batch read throws (design/rec.md, listReleasedBatchesForChild).
    await getDb().collection("childIdentities").deleteMany({});

    const digest = await digestOf(() => ChildRecommendationsPage());

    expect(digest).not.toBe("rendered");
    expect(digest).not.toContain("404");
    expect(digest).not.toContain("NEXT_REDIRECT");
  });

  it("sends a visitor with no session to the child sign-in", async () => {
    mockedAuth.mockResolvedValue(null);
    expect(await digestOf(() => ChildRecommendationsPage())).toContain(
      ";/child/sign-in;",
    );
  });

  it("authorization: gives a parent and an admin a 404", async () => {
    const parent = await insertParent({ parentRole: "main" });
    const admin = await insertUserWithRole("admin");
    for (const userId of [parent.userId, admin.userId]) {
      mockedAuth.mockResolvedValue({ user: { id: userId } });
      expect(await digestOf(() => ChildRecommendationsPage())).toContain("404");
    }
  });
});
