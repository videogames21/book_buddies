import "server-only";
import { isExcluded } from "@/server/accounts-family/book-reports";
import { getChildForFamily } from "@/server/accounts-family/child-accounts";
import { getBooksForShelf } from "@/server/catalog/books";
import { requireParent } from "@/server/identity-access/sessions";
import { isOnShelf } from "@/server/shelf/shelf-entries";

export type ReportPageView =
  | { redirect: string }
  | { notFound: true }
  | { state: "alreadyReported"; nickname: string; shelfPath: string }
  | {
      state: "form";
      childId: string;
      bookId: string;
      title: string;
      nickname: string;
      shelfPath: string;
    };

/**
 * What the report page shows (UC-PAR-report-book steps 1 and 2, PRE-2 to PRE-4), decided
 * on the server for every request (§8.1). Another family's child, an unknown or malformed
 * ID, a book not on this child's shelf, a book the Catalog does not return, and a child or
 * admin session all get the shelf page's 404. The exclusion is read before the shelf: a
 * committed report has already deleted the entry, and that parent must see 7c, not a 404.
 */
export async function reportPageView(
  childId: string,
  bookId: string,
): Promise<ReportPageView> {
  const session = await requireParent();
  if (!session.ok) {
    return session.error.code === "NOT_SIGNED_IN"
      ? { redirect: "/sign-in" }
      : { notFound: true };
  }

  // The family check comes first: isExcluded and isOnShelf take only the child ID.
  const child = await getChildForFamily(session.data.familyId, childId);
  if (!child) return { notFound: true };
  const shelfPath = `/parent/children/${childId}/shelf`;

  if (await isExcluded(childId, bookId)) {
    return { state: "alreadyReported", nickname: child.nickname, shelfPath };
  }
  if (!(await isOnShelf(childId, bookId))) return { notFound: true };
  const book = (await getBooksForShelf([bookId])).at(0);
  if (!book) return { notFound: true };

  return {
    state: "form",
    childId,
    bookId,
    title: book.title,
    nickname: child.nickname,
    shelfPath,
  };
}
