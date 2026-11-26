import "server-only";
import { randomInt } from "node:crypto";
import { MongoServerError } from "mongodb";
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

/**
 * What sign-in needs of a child's account and nothing else. `username` must already be
 * trimmed and lowercased, as it is stored, so the match is exact.
 */
export async function findChildCredential(
  username: string,
): Promise<{ userId: string; childId: string; passwordHash: string } | null> {
  const user = await getDb()
    .collection<{
      role: string;
      username: string;
      childId: string;
      passwordHash: string;
    }>("users")
    .findOne(
      { role: "child", username },
      { projection: { childId: 1, passwordHash: 1 } },
    );
  if (!user) return null;
  return {
    userId: user._id.toHexString(),
    childId: user.childId,
    passwordHash: user.passwordHash,
  };
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
