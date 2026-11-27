import "server-only";
import { getChildForFamily } from "@/server/accounts-family/child-accounts";
import { getDb, type Tx } from "@/server/lib/db";
import { READING_PROFILES } from "./reading-profiles";

export async function readReadingProfileForParent(
  familyId: string,
  childId: string,
  tx: Tx,
) {
  if (!(await getChildForFamily(familyId, childId, tx))) return [];
  return getDb()
    .collection(READING_PROFILES)
    .find(
      { childId },
      { session: tx, projection: { _id: 0, interests: 1, favoriteBookIds: 1 } },
    )
    .toArray();
}
