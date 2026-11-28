import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDatabase } from "../../../tests/integration/db";
import { getDb, getMongoClient, withTransaction } from "./db";

describe("withTransaction", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("keeps nothing written inside it when the work throws", async () => {
    const things = getDb().collection("things");
    await expect(
      withTransaction(async (tx) => {
        await things.insertOne({ name: "first" }, { session: tx });
        throw new Error("second write failed");
      }),
    ).rejects.toThrow("second write failed");
    expect(await things.countDocuments()).toBe(0);
  });

  it("commits every write and returns the work's result", async () => {
    const things = getDb().collection("things");
    const result = await withTransaction(async (tx) => {
      await things.insertOne({ name: "first" }, { session: tx });
      await things.insertOne({ name: "second" }, { session: tx });
      return "done";
    });
    expect(result).toBe("done");
    expect(await things.countDocuments()).toBe(2);
  });
});

describe("getMongoClient", () => {
  /** Closes the shared client and forgets it, so the next call makes a new one. */
  async function dropClient() {
    await getMongoClient().close();
    delete (globalThis as { bookBuddiesMongoClient?: unknown })
      .bookBuddiesMongoClient;
  }

  it("replaces a client whose first connection failed", async () => {
    await dropClient();
    // Nothing listens on port 1.
    vi.stubEnv(
      "MONGODB_URI",
      "mongodb://127.0.0.1:1/?serverSelectionTimeoutMS=100",
    );
    // The config is cached once read, so load the module again.
    vi.resetModules();
    const db = await import("./db");
    try {
      const failed = db.getMongoClient();

      await expect(db.getDb().command({ ping: 1 })).rejects.toMatchObject({
        name: "MongoServerSelectionError",
      });

      expect(db.getMongoClient()).not.toBe(failed);
    } finally {
      vi.unstubAllEnvs();
      await dropClient();
    }
  });
});

describe("username index", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("refuses a second account with the same username and allows many without one", async () => {
    const users = getDb().collection("users");
    await users.insertOne({ role: "parent", email: "a@example.test" });
    await users.insertOne({ role: "parent", email: "b@example.test" });
    await users.insertOne({ role: "child", username: "invented_kid" });
    await expect(
      users.insertOne({ role: "parent", username: "invented_kid" }),
    ).rejects.toMatchObject({ code: 11000 });
  });
});
