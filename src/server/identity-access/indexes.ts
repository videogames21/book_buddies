import "server-only";
import type { Db } from "mongodb";

// Usernames are unique across every account that signs in with one (children and
// Sub Parents), and stored lowercased, so one index makes them case-insensitively
// unique. Main Parents sign in by email and have no username, hence the partial filter.
export async function ensureIdentityAccessIndexes(db: Db): Promise<void> {
  await db.collection("users").createIndex(
    { username: 1 },
    {
      name: "username_unique",
      unique: true,
      partialFilterExpression: { username: { $type: "string" } },
    },
  );
  // UC-PAR-onboarding 4a: one account per email, race-free. Emails are stored
  // lowercased, so the index is case-insensitive too; it covers every user that has
  // one (Main Parent, Sub Parent, admin), and children have none.
  await db.collection("users").createIndex(
    { email: 1 },
    {
      name: "email_unique",
      unique: true,
      partialFilterExpression: { email: { $type: "string" } },
    },
  );
}
