import "server-only";
import { getDb, type Tx } from "@/server/lib/db";
import { BOOK_REPORTS, CHILD_BOOK_EXCLUSIONS } from "./book-report-schema";
import { getChildForFamily } from "./child-accounts";

export async function readReportsForParent(
  familyId: string,
  childId: string,
  tx: Tx,
) {
  if (!(await getChildForFamily(familyId, childId, tx))) return [];
  const reports = await getDb()
    .collection(BOOK_REPORTS)
    .find(
      { childId },
      {
        session: tx,
        projection: {
          _id: 0,
          bookId: 1,
          reason: 1,
          comment: 1,
          status: 1,
          reportedAt: 1,
        },
      },
    )
    .toArray();
  const exclusions = await getDb()
    .collection(CHILD_BOOK_EXCLUSIONS)
    .find(
      { childId },
      { session: tx, projection: { _id: 0, bookId: 1, createdAt: 1 } },
    )
    .toArray();
  return [
    ...reports.map((report) => ({ kind: "report", ...report })),
    ...exclusions.map((exclusion) => ({ kind: "exclusion", ...exclusion })),
  ];
}
