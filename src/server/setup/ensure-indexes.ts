import "server-only";
import type { Db } from "mongodb";
import { ensureAccountsFamilyIndexes } from "@/server/accounts-family/child-accounts";
import { ensureChildIdentityIndexes } from "@/server/child-identity/child-identity";
import { ensureIdentityAccessIndexes } from "@/server/identity-access/indexes";

// Idempotent index setup (design/par.md, Data model): run before the first deploy
// and by the integration-test setup. Each component creates its own indexes.
export async function ensureIndexes(db: Db): Promise<void> {
  await ensureIdentityAccessIndexes(db);
  await ensureAccountsFamilyIndexes(db);
  await ensureChildIdentityIndexes(db);
}
