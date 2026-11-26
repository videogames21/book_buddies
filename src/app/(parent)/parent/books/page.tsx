import { listPickerBooks } from "@/server/catalog/books";
import { requireSuggestingParent } from "./access";
import { BookList } from "./book-list";

// UC-PAR-suggest-book step 1: every active catalog book, each with "Suggest". No search
// and no detail page (design/par.md, Key decisions). Read on every load, so a block or a
// return to draft shows at once.
export const dynamic = "force-dynamic";
export const metadata = { title: "Suggest a book · BookBuddies" };

export default async function BooksPage() {
  await requireSuggestingParent();
  return <BookList books={await listPickerBooks()} />;
}
