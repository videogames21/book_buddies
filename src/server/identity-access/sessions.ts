import "server-only";
import { randomBytes } from "node:crypto";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { fail, ok, type ActionResult } from "@/server/lib/action-result";
import { now } from "@/server/lib/clock";
import { getDb, type Tx } from "@/server/lib/db";
import { auth } from "./auth";
import { SESSION_MAX_AGE_SECONDS, sessionCookie } from "./session-cookie";

const SESSIONS = "sessions";

export type NewSession = { sessionToken: string; expires: Date };

/**
 * Writes a session document in the Auth.js MongoDB adapter's own shape, so auth()
 * reads it like any other (design/par.md, Key decisions). Pass `tx` to make it part
 * of a transaction; set the cookie only after that transaction commits.
 */
export async function createDatabaseSession(
  userId: string,
  tx?: Tx,
): Promise<NewSession> {
  const session = {
    sessionToken: randomBytes(32).toString("hex"),
    userId: new ObjectId(userId),
    expires: new Date(now().getTime() + SESSION_MAX_AGE_SECONDS * 1000),
  };
  await getDb()
    .collection(SESSIONS)
    .insertOne(session, tx ? { session: tx } : {});
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
// check reads. UC-PAR-onboarding writes them; until it is designed, this is the
// assumed shape (design/par.md, Open questions).
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
