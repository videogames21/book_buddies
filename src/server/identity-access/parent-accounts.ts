import "server-only";
import { ObjectId } from "mongodb";
import { getDb, type Tx } from "@/server/lib/db";
import { deletePasswordResetOf } from "./password-resets";
import { deleteSessionsOfUser } from "./sessions";
import { clearSignInAttempts } from "./sign-in-throttle";

// Main Parent accounts in Identity & Access's `users` collection (UC-PAR-onboarding).
// The fields requireParent() reads (role, parentRole, familyId), plus the name, the
// lowercased email and the scrypt hash. Names and emails are never logged (§8.2.7).

const USERS = "users";

type ParentUser = {
  _id: ObjectId;
  role: "parent";
  parentRole: "main" | "sub";
  familyId: ObjectId;
  name: string;
  email: string;
  passwordHash: string;
};

/** Thrown when the unique email index refuses the insert (4a). */
export class EmailTakenError extends Error {}

export async function insertMainParent(
  tx: Tx,
  fields: {
    name: string;
    email: string;
    passwordHash: string;
    familyId: string;
  },
): Promise<string> {
  const _id = new ObjectId();
  try {
    await getDb()
      .collection<ParentUser>(USERS)
      .insertOne(
        {
          _id,
          role: "parent",
          parentRole: "main",
          familyId: new ObjectId(fields.familyId),
          name: fields.name,
          email: fields.email,
          passwordHash: fields.passwordHash,
        },
        { session: tx },
      );
  } catch (err) {
    if (isDuplicateEmail(err)) throw new EmailTakenError();
    throw err;
  }
  return _id.toHexString();
}

export type ParentCredential = {
  userId: string;
  familyId: string;
  parentRole: "main" | "sub";
  passwordHash: string;
};

/**
 * A parent's sign-in record by lowercased email: IDs, role and hash, nothing else.
 * Any other kind of user with that email (an admin) is not a parent and is not found.
 */
export async function findParentByEmail(
  email: string,
  tx?: Tx,
): Promise<ParentCredential | null> {
  const user = await getDb()
    .collection<ParentUser>(USERS)
    .findOne(
      { email, role: "parent" },
      {
        projection: { _id: 1, familyId: 1, parentRole: 1, passwordHash: 1 },
        ...(tx && { session: tx }),
      },
    );
  if (!user?.passwordHash) return null;
  return {
    userId: user._id.toHexString(),
    familyId: user.familyId.toHexString(),
    parentRole: user.parentRole,
    passwordHash: user.passwordHash,
  };
}

/**
 * Password reset (OI-44): replaces a Main Parent's hash inside the reset transaction.
 * Returns their email, the sign-in throttle's key, or null when no Main Parent matched.
 */
export async function replaceMainParentPassword(
  tx: Tx,
  userId: string,
  passwordHash: string,
): Promise<string | null> {
  const user = await getDb()
    .collection<ParentUser>(USERS)
    .findOneAndUpdate(
      { _id: new ObjectId(userId), role: "parent", parentRole: "main" },
      { $set: { passwordHash } },
      { projection: { email: 1 }, session: tx },
    );
  return user?.email ?? null;
}

/**
 * The signed-in Main Parent's own credential, read by the session's user ID, for a
 * password re-check (UC-PAR-delete-kid-account step 3): the lowercased email, which is
 * the sign-in throttle's account key, and the hash. Neither is ever logged (§8.2.7).
 * The read also requires the Main Parent role and the session's family, so an account
 * whose role or family changed after the session check gets null (review of #125).
 */
export async function getParentCredential(
  userId: string,
  familyId: string,
): Promise<{ email: string; passwordHash: string } | null> {
  const user = await getDb()
    .collection<ParentUser>(USERS)
    .findOne(
      {
        _id: new ObjectId(userId),
        role: "parent",
        parentRole: "main",
        familyId: new ObjectId(familyId),
      },
      { projection: { email: 1, passwordHash: 1 } },
    );
  if (!user?.email || !user.passwordHash) return null;
  return { email: user.email, passwordHash: user.passwordHash };
}

/** Used by notifications, which must never be sent to a removed or different role. */
export async function parentRecipientExists(
  tx: Tx,
  recipientId: ObjectId,
): Promise<boolean> {
  const user = await getDb()
    .collection(USERS)
    .findOne(
      { _id: recipientId, role: "parent" },
      { session: tx, projection: { _id: 1 } },
    );
  return user !== null;
}

/** A parent's own address, to email them; never logged (§8.2.7). */
export async function findParentEmail(userId: string): Promise<string | null> {
  const user = await getDb()
    .collection<ParentUser>(USERS)
    .findOne(
      { _id: new ObjectId(userId), role: "parent" },
      { projection: { email: 1 } },
    );
  return user?.email ?? null;
}

/**
 * An admin's sign-in record by lowercased email: ID and hash only. Admin accounts are
 * made by hand with a passwordHash; they share the parent sign-in page (developer
 * decision 2026-11-24).
 */
export async function findAdminByEmail(
  email: string,
): Promise<{ userId: string; passwordHash: string } | null> {
  const user = await getDb()
    .collection<{ passwordHash?: string }>(USERS)
    .findOne(
      { email, role: "admin" },
      { projection: { _id: 1, passwordHash: 1 } },
    );
  if (!user?.passwordHash) return null;
  return { userId: user._id.toHexString(), passwordHash: user.passwordHash };
}

/**
 * Deletes a parent's user document (name, email, hash), all their sessions, any
 * password reset record and the sign-in throttle row keyed by their email.
 */
export async function deleteParentAccount(
  tx: Tx,
  userId: string,
): Promise<void> {
  const user = await getDb()
    .collection<ParentUser>(USERS)
    .findOneAndDelete(
      { _id: new ObjectId(userId) },
      { projection: { email: 1 }, session: tx },
    );
  await deleteSessionsOfUser(userId, tx);
  await deletePasswordResetOf(userId, tx);
  if (user?.email) await clearSignInAttempts(user.email, tx);
}

function isDuplicateEmail(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: unknown }).code === 11000 &&
    "email" in ((err as { keyPattern?: object }).keyPattern ?? {})
  );
}
