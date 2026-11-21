import "server-only";
import { ObjectId } from "mongodb";
import { fail, ok, type ActionResult } from "@/server/lib/action-result";
import { getDb } from "@/server/lib/db";
import { auth } from "./auth";

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
