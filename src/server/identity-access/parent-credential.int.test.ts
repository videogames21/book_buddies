import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it } from "vitest";
import { insertParent } from "../../../tests/fixtures/users";
import { resetDatabase } from "../../../tests/integration/db";

// getParentCredential, the password re-check's read (UC-PAR-delete-kid-account step 3,
// review of #125). Invented data only.

const { getParentCredential } = await import("./parent-accounts");
const { getDb } = await import("@/server/lib/db");

const HASH = "invented-hash";

async function withPassword(parent: { userId: string }) {
  await getDb()
    .collection("users")
    .updateOne(
      { _id: new ObjectId(parent.userId) },
      { $set: { passwordHash: HASH } },
    );
}

describe("getParentCredential", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("returns the Main Parent's email and hash for their own family", async () => {
    const parent = await insertParent({ parentRole: "main" });
    await withPassword(parent);

    expect(
      await getParentCredential(parent.userId, parent.familyId),
    ).toMatchObject({ passwordHash: HASH });
  });

  it("returns null for another family, a Sub Parent, or no password", async () => {
    const main = await insertParent({ parentRole: "main" });
    await withPassword(main);
    const sub = await insertParent({ parentRole: "sub" });
    await withPassword(sub);
    const noPassword = await insertParent({ parentRole: "main" });

    expect(
      await getParentCredential(main.userId, new ObjectId().toHexString()),
    ).toBeNull();
    expect(await getParentCredential(sub.userId, sub.familyId)).toBeNull();
    expect(
      await getParentCredential(noPassword.userId, noPassword.familyId),
    ).toBeNull();
  });
});
