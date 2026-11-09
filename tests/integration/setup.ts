import { afterAll, inject } from "vitest";

// Each worker gets its own database, so test files running in parallel do not collide.
process.env.MONGODB_URI = inject("mongoUri");
process.env.MONGODB_DB = `bookbuddies_test_${process.env.VITEST_POOL_ID ?? "0"}`;

afterAll(async () => {
  const { getMongoClient } = await import("@/server/lib/db");
  await getMongoClient().close();
});
