import "server-only";
import { isExcluded } from "@/server/accounts-family/book-reports";
import { getChildForFamily } from "@/server/accounts-family/child-accounts";
import { getBooksForReview } from "@/server/catalog/books";
import { requireParent } from "@/server/identity-access/sessions";
import { isInPendingBatch } from "@/server/recommendation/batches";

export type BatchReportPageView =
  | { redirect: string }
  | { notFound: true }
  | { state: "alreadyReported"; nickname: string; batchPath: string }
  | {
      state: "form";
      childId: string;
      bookId: string;
      title: string;
      nickname: string;
      batchPath: string;
    };

/**
 * What the batch entry page of UC-PAR-report-book shows (steps 1 and 2 from
 * UC-REC-parent-review step 4, PRE-2 to PRE-4), decided on the server for every request
 * (§8.1), in the order of the shelf entry point (design/rec.md). Another family's child,
 * an unknown or malformed ID, a book not in this pending batch, a batch released or past
 * `handoffDeadline`, a book the Catalog does not return, and a child or admin session all
 * get the same 404. The exclusion is read before the batch: a committed report has
 * already taken the book out of the batch, and that parent must see 7c, not a 404.
 */
export async function batchReportPageView(
  childId: string,
  batchId: string,
  bookId: string,
): Promise<BatchReportPageView> {
  const session = await requireParent();
  if (!session.ok) {
    return session.error.code === "NOT_SIGNED_IN"
      ? { redirect: "/sign-in" }
      : { notFound: true };
  }

  // The family check comes first: isExcluded and isInPendingBatch take only the child ID.
  const child = await getChildForFamily(session.data.familyId, childId);
  if (!child) return { notFound: true };
  const batchPath = `/parent/children/${childId}/recommendations/${batchId}`;

  if (await isExcluded(childId, bookId)) {
    return { state: "alreadyReported", nickname: child.nickname, batchPath };
  }
  if (!(await isInPendingBatch(childId, batchId, bookId))) {
    return { notFound: true };
  }
  const book = (await getBooksForReview([bookId])).at(0);
  if (!book) return { notFound: true };

  return {
    state: "form",
    childId,
    bookId,
    title: book.title,
    nickname: child.nickname,
    batchPath,
  };
}
