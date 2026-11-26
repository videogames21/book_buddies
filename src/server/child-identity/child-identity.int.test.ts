import { beforeEach, describe, expect, it } from "vitest";
import { resetDatabase } from "../../../tests/integration/db";

const { getChildAgeForRecommendation, insertChildIdentity } =
  await import("./child-identity");
const { withTransaction } = await import("@/server/lib/db");

describe("getChildAgeForRecommendation (UC-REC-parent-review)", () => {
  beforeEach(resetDatabase);

  it("returns the recorded age, and null for a child with no record", async () => {
    await withTransaction((tx) =>
      insertChildIdentity(tx, {
        childId: "c1",
        age: 8,
        grade: "3",
        readingLevel: { scale: "lexile", value: "650L" },
      }),
    );
    expect(await getChildAgeForRecommendation("c1")).toBe(8);
    expect(await getChildAgeForRecommendation("c2")).toBeNull();
  });
});
