import "server-only";
import type { Db } from "mongodb";

// Usernames are unique across every account that signs in with one (children and
// Sub Parents), and stored lowercased, so one index makes them case-insensitively
// unique. Main Parents sign in by email and have no username, hence the partial filter.
export async function ensureIdentityAccessIndexes(db: Db): Promise<void> {
  await db.collection("users").createIndex(
    { username: 1 },
    { name: "username_unique", unique: true, partialFilterExpression: { username: { $type: "string" } } },
  );
}
