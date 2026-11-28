import "server-only";
import { getChildForFamily } from "@/server/accounts-family/child-accounts";
import { getBooksForShelf } from "@/server/catalog/books";
import { requireParent } from "@/server/identity-access/sessions";
import { isOnShelf } from "@/server/shelf/shelf-entries";

export type RemovePageView =
  | { redirect: string }
  | { notFound: true }
  | { state: "offShelf"; nickname: string; shelfPath: string }
  | {
      state: "confirm";
      childId: string;
      bookId: string;
      title: string;
      nickname: string;
      shelfPath: string;
    };

/** The title when the Catalog does not return a book that is still on the shelf. */
export const UNTITLED_BOOK = "this book";

/**
 * What the remove page shows (UC-SHLF-parent-remove-book steps 1 to 3, 3b), decided on
 * the server for every request (§8.1). The family check comes first, so the 3b message
 * says nothing about another family's children. `isOnShelf` alone decides 3b: a book the
 * Catalog does not return (a draft, or a blocked book whose entry survived) is still
 * offered for removal, as "this book".
 */
export async function removeBookView(
  childId: string,
  bookId: string,
): Promise<RemovePageView> {
  const session = await requireParent();
  if (!session.ok) {
    return session.error.code === "NOT_SIGNED_IN"
      ? { redirect: "/sign-in" }
      : { notFound: true };
  }

  const child = await getChildForFamily(session.data.familyId, childId);
  if (!child) return { notFound: true };
  const shelfPath = `/parent/children/${childId}/shelf`;

  if (!(await isOnShelf(childId, bookId))) {
    return { state: "offShelf", nickname: child.nickname, shelfPath };
  }
  const book = (await getBooksForShelf([bookId])).at(0);

  return {
    state: "confirm",
    childId,
    bookId,
    title: book?.title ?? UNTITLED_BOOK,
    nickname: child.nickname,
    shelfPath,
  };
}
