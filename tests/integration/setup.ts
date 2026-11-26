import { afterAll, inject } from "vitest";
import { randomBytes } from "node:crypto";

// Each worker gets its own database, so test files running in parallel do not collide.
process.env.MONGODB_URI = inject("mongoUri");
process.env.AUTH_SECRET = randomBytes(32).toString("hex");
// Child sign-in has no default for either (design/shlf.md, Data model).
process.env.CHILD_DEVICE_SECRET = randomBytes(32).toString("hex");
process.env.CHILD_SESSION_TIME_ZONE = "America/Chicago";
process.env.MONGODB_DB = `bookbuddies_test_${process.env.VITEST_POOL_ID ?? "0"}`;

afterAll(async () => {
  const { getMongoClient } = await import("@/server/lib/db");
  await getMongoClient().close();
});
