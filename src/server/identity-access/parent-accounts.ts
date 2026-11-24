import "server-only";
import { ObjectId } from "mongodb";
import { getDb, type Tx } from "@/server/lib/db";
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
 * Deletes a parent's user document (name, email, hash), all their sessions and the
 * sign-in throttle row keyed by their email.
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
