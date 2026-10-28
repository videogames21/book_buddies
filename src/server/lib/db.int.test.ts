import { beforeEach, describe, expect, it } from "vitest";
import { resetDatabase } from "../../../tests/integration/db";
import { getDb, withTransaction } from "./db";

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

describe("username index", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("refuses a second account with the same username and allows many without one", async () => {
    const users = getDb().collection("users");
    await users.insertOne({ role: "parent", email: "a@example.test" });
    await users.insertOne({ role: "parent", email: "b@example.test" });
    await users.insertOne({ role: "child", username: "invented_kid" });
    await expect(users.insertOne({ role: "parent", username: "invented_kid" })).rejects.toMatchObject({ code: 11000 });
  });
});
