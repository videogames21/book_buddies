import { notFound, redirect } from "next/navigation";
import { getChildDisplay } from "@/server/accounts-family/child-accounts";
import { requireChild } from "@/server/identity-access/sessions";
import { getRatableBook } from "@/server/shelf/ratings";
import { CHILD_SIGN_IN_PATH } from "../../../paths";
import { RateForm } from "./rate-form";

export const metadata = { title: "Rate a book · BookBuddies" };

// UC-SHLF-kid-rate-book steps 1 and 2. Read on every load, so a book that was moved,
// removed or blocked is refused at once. Opening or leaving the page writes nothing (2a).
export const dynamic = "force-dynamic";

function decodeBookId(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    notFound();
  }
}

export default async function ChildRateBookPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const session = await requireChild();
  if (!session.ok) {
    if (session.error.code === "NOT_SIGNED_IN") redirect(CHILD_SIGN_IN_PATH);
    notFound();
  }
  // One 404 for a book that is not on the shelf, not in Finished, not confirmed, not
  // active, unknown or malformed, so the page shows no reason (1a, 1b).
  const book = await getRatableBook(
    session.data,
    decodeBookId((await params).bookId),
  );
  if (!book) notFound();
  const child = await getChildDisplay(session.data.childId);
  if (!child) notFound();

  return (
    <RateForm
      view={{
        bookId: book.bookId,
        title: book.title,
        rating: book.rating,
        nickname: child.nickname,
      }}
    />
  );
}
