import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { insertSignedInChild } from "../../../../tests/fixtures/child-session";
import {
  insertParent,
  insertUserWithRole,
} from "../../../../tests/fixtures/users";
import { resetDatabase } from "../../../../tests/integration/db";

// The child home (design/shlf.md, Tests, "`/child` home") and sign-out.

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

const { default: ChildHomePage } = await import("./page");
const { signOutChild } = await import("./sign-in/actions");
const { auth } = await import("@/server/identity-access/auth");
const { sessionCookie } =
  await import("@/server/identity-access/session-cookie");
const { getDb } = await import("@/server/lib/db");
const { getChildDisplay } =
  await import("@/server/accounts-family/child-accounts");
const mockedAuth = vi.mocked(
  auth as unknown as () => Promise<{ user: { id: string } } | null>,
);

async function signedInChild(nickname?: string) {
  const child = await insertSignedInChild(nickname);
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

const children = () => getDb().collection<{ _id: string }>("children");

const sessionTokens = async () =>
  (await getDb().collection("sessions").find().toArray()).map(
    (session) => session.sessionToken as string,
  );

beforeEach(async () => {
  await resetDatabase();
  jar.clear();
  mockedAuth.mockReset();
});

describe("/child home", () => {
  it("shows the child's nickname and avatar, My Shelf and Sign out, and nothing else", async () => {
    await insertSignedInChild("Otter");
    const { childId } = await signedInChild("Starfish");
    // Not the fixture's usual avatar, so the page has to read this child's.
    await children().updateOne({ _id: childId }, { $set: { avatar: "7" } });
    const html = renderToStaticMarkup(await ChildHomePage());
    const text = html.split(/<[^>]*>/).filter(Boolean);
    expect(text).toEqual(["Starfish", "My Shelf", "Sign out"]);
    expect(html).toContain('href="/child/shelf"');
    expect(html).toContain("7.png");
  });

  it("reads the nickname and avatar of the child and nothing else", async () => {
    const { childId } = await signedInChild("Starfish");
    expect(await getChildDisplay(childId)).toEqual({
      nickname: "Starfish",
      avatar: "1-1",
    });
  });

  it("gives a 404 when the child's record is gone", async () => {
    await signedInChild();
    await children().deleteMany({});
    expect(await digestOf(() => ChildHomePage())).toContain("404");
  });

  it("sends a visitor with no session to the child sign-in", async () => {
    mockedAuth.mockResolvedValue(null);
    expect(await digestOf(() => ChildHomePage())).toContain(";/child/sign-in;");
  });

  it("gives a parent and an admin a 404", async () => {
    const parent = await insertParent({ parentRole: "main" });
    const admin = await insertUserWithRole("admin");
    for (const userId of [parent.userId, admin.userId]) {
      mockedAuth.mockResolvedValue({ user: { id: userId } });
      expect(await digestOf(() => ChildHomePage())).toContain("404");
    }
  });
});

describe("signOutChild (design/shlf.md, Tests, Sign-out)", () => {
  it("deletes this session and its cookie, and leaves other sessions", async () => {
    const other = await insertSignedInChild("Otter");
    await signedInChild();
    expect(await signOutChild()).toEqual({ ok: true, data: null });
    expect(jar.size).toBe(0);
    expect(await sessionTokens()).toEqual([other.session.sessionToken]);
    expect(await getDb().collection("childSessionEnds").countDocuments()).toBe(
      1,
    );
  });

  it("refuses with no session, and refuses a parent, ending nothing", async () => {
    await insertSignedInChild();
    mockedAuth.mockResolvedValue(null);
    expect(await signOutChild()).toMatchObject({
      error: { code: "NOT_SIGNED_IN" },
    });
    const parent = await insertParent({ parentRole: "main" });
    mockedAuth.mockResolvedValue({ user: { id: parent.userId } });
    expect(await signOutChild()).toMatchObject({
      error: { code: "NOT_A_CHILD" },
    });
    expect(await sessionTokens()).toHaveLength(1);
  });

  it("answers an unexpected failure with a code and an error ID, and no detail", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockedAuth.mockRejectedValue(new Error("invented database detail"));
    expect(await signOutChild()).toEqual({
      ok: false,
      error: {
        code: "SIGN_OUT_FAILED",
        message: "That didn’t work. Try again or ask a grown-up.",
        errorId: expect.any(String) as string,
      },
    });
    vi.restoreAllMocks();
  });
});
