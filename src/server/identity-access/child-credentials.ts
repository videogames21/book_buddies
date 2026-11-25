import "server-only";
import { randomInt } from "node:crypto";
import { MongoServerError, type ObjectId } from "mongodb";
import { now } from "@/server/lib/clock";
import { getDb, type Tx } from "@/server/lib/db";
import { PASSWORD_WORDS } from "./password-words";

// A child's sign-in credential: a document in the Auth.js `users` collection with
// role `child` (design/par.md, Data model). The password is never stored, only its hash.

export class UsernameTakenError extends Error {
  constructor() {
    super("Username taken");
    this.name = "UsernameTakenError";
  }
}

/** Three words and two digits from a cryptographically random source, such as `otter-maple-sun-42`. */
export function generateChildPassword(): string {
  const words = Array.from(
    { length: 3 },
    () => PASSWORD_WORDS[randomInt(PASSWORD_WORDS.length)],
  );
  const digits = String(randomInt(100)).padStart(2, "0");
  return [...words, digits].join("-");
}

/** Inserts inside the caller's transaction; a username already in use throws UsernameTakenError (4g). */
export async function insertChildCredential(
  tx: Tx,
  credential: { childId: string; username: string; passwordHash: string },
): Promise<void> {
  try {
    await getDb().collection("users").insertOne(
      {
        role: "child",
        username: credential.username,
        passwordHash: credential.passwordHash,
        childId: credential.childId,
        createdAt: now(),
      },
      { session: tx },
    );
  } catch (err) {
    if (err instanceof MongoServerError && err.code === 11000)
      throw new UsernameTakenError();
    throw err;
  }
}

/**
 * UC-PAR-delete-kid-account POST-1: deletes the child's credential (its `users`
 * document), every session of that user and every sign-in throttle row under the
 * child's username (`child:<username>:...`, design/shlf.md), inside the caller's
 * transaction. Child sign-in adds its `childSignIns` and `childSessionEnds` deletes here
 * when it is built (design/par.md, Open questions). The username is never logged.
 */
export async function deleteChildSignIn(
  tx: Tx,
  childId: string,
): Promise<void> {
  const user = await getDb()
    .collection<{ _id: ObjectId; username?: string }>("users")
    .findOneAndDelete(
      { role: "child", childId },
      { projection: { _id: 1, username: 1 }, session: tx },
    );
  if (!user) return;
  // Ends every session at once (KD-auth-sessions); Auth.js finds no document for them.
  await getDb()
    .collection("sessions")
    .deleteMany({ userId: user._id }, { session: tx });
  if (user.username) {
    await getDb()
      .collection("signInAttempts")
      .deleteMany(
        {
          accountKey: { $regex: `^${escapeRegex(`child:${user.username}:`)}` },
        },
        { session: tx },
      );
  }
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
