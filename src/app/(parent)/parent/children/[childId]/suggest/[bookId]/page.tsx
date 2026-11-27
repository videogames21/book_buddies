import { notFound } from "next/navigation";
import { isExcluded } from "@/server/accounts-family/book-reports";
import {
  getChildForFamily,
  isConsentConfirmed,
} from "@/server/accounts-family/child-accounts";
import { getSuggestionConflict } from "@/server/accounts-family/suggestions";
import { findActiveBookIds, getBooksForShelf } from "@/server/catalog/books";
import {
  decodeRouteParam,
  requireSuggestingParent,
} from "../../../../books/access";
import { SuggestScreen } from "./suggest-screen";

// UC-PAR-suggest-book step 2, with 1b and the 4a warning before the parent confirms
// (design/par.md, Components & classes). These checks are for display only; the action
// repeats every one inside its transaction.
export const dynamic = "force-dynamic";
export const metadata = { title: "Suggest a book · BookBuddies" };

export default async function SuggestPage({
  params,
}: {
  params: Promise<{ childId: string; bookId: string }>;
}) {
  const session = await requireSuggestingParent();
  const segments = await params;
  const childId = decodeRouteParam(segments.childId);
  const bookId = decodeRouteParam(segments.bookId);

  // Another family's child and an unknown one give the same 404.
  const child = await getChildForFamily(session.familyId, childId);
  if (!child) notFound();
  if (!(await isConsentConfirmed(session.familyId))) {
    return (
      <SuggestScreen view={{ kind: "noConsent", nickname: child.nickname }} />
    );
  }
  // Unknown, draft and blocked books give the same 404, and no title (PRE-3).
  const book =
    (await findActiveBookIds([bookId])).length === 1
      ? (await getBooksForShelf([bookId])).at(0)
      : undefined;
  if (!book) notFound();
  if (await isExcluded(childId, bookId)) {
    return (
      <SuggestScreen view={{ kind: "excluded", nickname: child.nickname }} />
    );
  }

  const conflict = await getSuggestionConflict(
    session.familyId,
    childId,
    bookId,
  );
  return (
    <SuggestScreen
      view={{
        kind: "form",
        childId,
        bookId,
        nickname: child.nickname,
        avatar: child.avatar,
        title: book.title,
        author: book.author,
        conflict,
      }}
    />
  );
}
