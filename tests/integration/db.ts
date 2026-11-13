import { getDb } from "@/server/lib/db";
import { ensureIndexes } from "@/server/setup/ensure-indexes";

/** Empties this worker's database and recreates the indexes the app relies on. */
export async function resetDatabase(): Promise<void> {
  const db = getDb();
  await db.dropDatabase();
  await ensureIndexes(db);
}
