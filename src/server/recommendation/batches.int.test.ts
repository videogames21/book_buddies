import { beforeEach, describe, expect, it } from "vitest";
import { insertBatch } from "../../../tests/fixtures/batches";
import { resetDatabase } from "../../../tests/integration/db";

const { deleteChildRecords } = await import("./batches");
const { getDb, withTransaction } = await import("@/server/lib/db");

const batches = () => getDb().collection("recommendationBatches");

describe("deleteChildRecords (UC-PAR-delete-kid-account)", () => {
  beforeEach(resetDatabase);

  it("deletes every batch of the child, of any status, and no other child's", async () => {
    await insertBatch({ childId: "c1", bookIds: ["b1"] });
    await insertBatch({ childId: "c1", bookIds: [], status: "empty" });
    await insertBatch({ childId: "c2", bookIds: ["b1"] });

    await withTransaction((tx) => deleteChildRecords(tx, "c1"));

    expect(await batches().countDocuments({ childId: "c1" })).toBe(0);
    expect(await batches().countDocuments({ childId: "c2" })).toBe(1);
  });
});
