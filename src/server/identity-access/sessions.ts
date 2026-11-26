import "server-only";
import { randomBytes } from "node:crypto";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { fail, ok, type ActionResult } from "@/server/lib/action-result";
import { now } from "@/server/lib/clock";
import { getDb, type Tx } from "@/server/lib/db";
import { auth } from "./auth";
import {
  continueChildSession,
  deleteChildSessionEnd,
  insertChildSessionEnd,
} from "./child-sessions";
import { SESSION_MAX_AGE_SECONDS, sessionCookie } from "./session-cookie";

const SESSIONS = "sessions";

export type NewSession = { sessionToken: string; expires: Date };

/**
 * Writes a session document in the Auth.js MongoDB adapter's own shape, so auth()
 * reads it like any other (design/par.md, Key decisions). Pass `tx` to make it part
 * of a transaction; set the cookie only after that transaction commits.
 *
 * A child's session also takes `endsAt`, the next midnight, which is stored apart
 * (child-sessions.ts) and never as `expires`: the lifetime is the same for both roles
 * (design/shlf.md, Key decisions). Pass `tx` with it, so neither exists alone.
 */
export async function createDatabaseSession(
  userId: string,
  tx?: Tx,
  endsAt?: Date,
): Promise<NewSession> {
  const session = {
    sessionToken: randomBytes(32).toString("hex"),
    userId: new ObjectId(userId),
    expires: new Date(now().getTime() + SESSION_MAX_AGE_SECONDS * 1000),
  };
  const { insertedId } = await getDb()
    .collection(SESSIONS)
    .insertOne({ ...session }, tx ? { session: tx } : {});
  if (endsAt) await insertChildSessionEnd(insertedId, endsAt, tx);
  return { sessionToken: session.sessionToken, expires: session.expires };
}

/** Sets the session cookie: httpOnly, SameSite=Lax, Secure on https (§8.1). */
export async function setSessionCookie(session: NewSession): Promise<void> {
  const { name, secure } = sessionCookie();
  (await cookies()).set(name, session.sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    expires: session.expires,
  });
}

/**
 * Sign-out (OI-44): deletes this request's session document, so the session ends on the
 * server at once, then clears the cookie. The user's other sessions are untouched.
 */
export async function endCurrentSession(): Promise<void> {
  const { name } = sessionCookie();
  const jar = await cookies();
  const sessionToken = jar.get(name)?.value;
  if (sessionToken) {
    const ended = await getDb()
      .collection(SESSIONS)
      .findOneAndDelete({ sessionToken }, { projection: { _id: 1 } });
    // A child's session has an end record, which goes with it.
    if (ended) await deleteChildSessionEnd(ended._id);
  }
  jar.delete(name);
}

/** Ends every session of a user, as deleting an account or resetting a password needs. */
export async function deleteSessionsOfUser(userId: string, tx: Tx) {
  await getDb()
    .collection(SESSIONS)
    .deleteMany({ userId: new ObjectId(userId) }, { session: tx });
}

// The session check every parent page and action starts with (architecture §8.1).
// Middleware is never the check.

export type ParentRole = "main" | "sub";

export type ParentSession = {
  userId: string;
  familyId: string;
  parentRole: ParentRole;
};

export type SessionErrorCode = "NOT_SIGNED_IN" | "NOT_A_PARENT";

// The fields of a parent's document in the Auth.js `users` collection that this
// check reads. Sign-up writes them for a Main Parent (parent-accounts.ts; design/par.md,
// Data model).
type ParentUserFields = {
  role?: string;
  parentRole?: string;
  familyId?: ObjectId;
};

export async function requireParent(): Promise<
  ActionResult<ParentSession, SessionErrorCode>
> {
  const session = await auth();
  const userId = session?.user.id;
  if (!userId || !ObjectId.isValid(userId)) {
    return fail("NOT_SIGNED_IN", "Please sign in.");
  }

  const user = await getDb()
    .collection<ParentUserFields>("users")
    .findOne(
      { _id: new ObjectId(userId) },
      { projection: { role: 1, parentRole: 1, familyId: 1 } },
    );

  const parentRole = user?.parentRole;
  if (
    user?.role !== "parent" ||
    !user.familyId ||
    (parentRole !== "main" && parentRole !== "sub")
  ) {
    return fail("NOT_A_PARENT", "This page is for parents.");
  }

  return ok({ userId, familyId: user.familyId.toHexString(), parentRole });
}

export type AdminSession = { userId: string; role: "admin" };

export type AdminSessionErrorCode = "NOT_SIGNED_IN" | "NOT_AN_ADMIN";

/**
 * The session check every admin page and action starts with (architecture §8.1).
 * Admin accounts are created by hand with role "admin"; a parent, a sub parent and a
 * child are all refused.
 */
export async function requireAdmin(): Promise<
  ActionResult<AdminSession, AdminSessionErrorCode>
> {
  const session = await auth();
  const userId = session?.user.id;
  if (!userId || !ObjectId.isValid(userId)) {
    return fail("NOT_SIGNED_IN", "Please sign in.");
  }

  const user = await getDb()
    .collection<{ role?: string }>("users")
    .findOne({ _id: new ObjectId(userId) }, { projection: { role: 1 } });

  if (user?.role !== "admin") {
    return fail("NOT_AN_ADMIN", "Not authorized.");
  }
  return ok({ userId, role: "admin" });
}

export type ChildSession = {
  userId: string;
  childId: string;
  /** The session document's ID, for the keep-alive. Never sent to the browser. */
  sessionId: ObjectId;
};

export type ChildSessionErrorCode = "NOT_SIGNED_IN" | "NOT_A_CHILD";

/**
 * The session check every child page and action starts with (architecture §8.1). Beyond
 * the Auth.js session, a child's session must still be running: not idle, and not past
 * midnight with the visit over (child-sessions.ts). An ended one is deleted here. The
 * keep-alive passes `countsAsActivity: false`, since an open page sends it whether or
 * not the child is there.
 */
export async function requireChild({
  countsAsActivity = true,
}: { countsAsActivity?: boolean } = {}): Promise<
  ActionResult<ChildSession, ChildSessionErrorCode>
> {
  const session = await auth();
  const userId = session?.user.id;
  if (!userId || !ObjectId.isValid(userId)) {
    return fail("NOT_SIGNED_IN", "Please sign in.");
  }

  const user = await getDb()
    .collection<{ role?: string; childId?: string }>("users")
    .findOne(
      { _id: new ObjectId(userId) },
      { projection: { role: 1, childId: 1 } },
    );
  if (user?.role !== "child" || !user.childId) {
    return fail("NOT_A_CHILD", "This page is for children.");
  }

  const sessionId = await findCurrentSessionId(userId);
  if (
    !sessionId ||
    !(await continueChildSession(sessionId, countsAsActivity))
  ) {
    return fail("NOT_SIGNED_IN", "Please sign in.");
  }
  return ok({ userId, childId: user.childId, sessionId });
}

/** The session document this request's own cookie names, if it is that user's. */
async function findCurrentSessionId(userId: string): Promise<ObjectId | null> {
  const sessionToken = (await cookies()).get(sessionCookie().name)?.value;
  if (!sessionToken) return null;
  const found = await getDb()
    .collection(SESSIONS)
    .findOne(
      { sessionToken, userId: new ObjectId(userId) },
      { projection: { _id: 1 } },
    );
  return found?._id ?? null;
}
