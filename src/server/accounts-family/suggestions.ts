import "server-only";
import { MongoServerError, ObjectId } from "mongodb";
import {
  findActiveBookIds,
  getBooksForShelf,
  lockActiveBookForWrite,
} from "@/server/catalog/books";
import type {
  ChildSession,
  ParentSession,
} from "@/server/identity-access/sessions";
import { fail, ok, type ActionResult } from "@/server/lib/action-result";
import { now } from "@/server/lib/clock";
import { areParentSuggestionsEnabled } from "@/server/lib/config";
import { getDb, withTransaction, type Tx } from "@/server/lib/db";
import { logUnexpectedError } from "@/server/lib/log";
import { isOnShelf } from "@/server/shelf/shelf-entries";
import { isExcluded, listExcludedBookIds } from "./book-reports";
import { getChildForFamily, lockChildForWrite } from "./child-accounts";
import { lockConsentForWrite } from "./families";
import { PARENT_SUGGESTIONS } from "./suggestion-schema";

// Accounts & Family's parent suggestions (UC-PAR-suggest-book; design/par.md). The only
// code that touches `parentSuggestions` (§8.2.4). The whole feature is behind the
// release gate in `areParentSuggestionsEnabled()` (README, "Review and release
// dependencies").

type SuggestionDocument = {
  _id: ObjectId;
  childId: string;
  bookId: string;
  /** Already trimmed; absent when the parent gave none. */
  note?: string;
  suggestedAt: Date;
};

export type CreateSuggestionInput = {
  childId: string;
  bookId: string;
  /** Already trimmed by the schema; absent when the parent gave none. */
  note?: string;
  suggestAnyway: boolean;
};

export type SuggestionConflict = "suggested" | "recommended" | "onShelf";

export type CreateSuggestionErrorCode =
  | "SUGGESTIONS_UNAVAILABLE"
  | "CHILD_NOT_FOUND"
  | "CONSENT_NOT_CONFIRMED"
  | "INVALID_BOOK"
  | "BOOK_EXCLUDED"
  | "ALREADY_SUGGESTED"
  | "ALREADY_RECOMMENDED"
  | "ALREADY_ON_SHELF"
  | "SAVE_FAILED";

type RefusalCode = Exclude<CreateSuggestionErrorCode, "SAVE_FAILED">;

const MESSAGES: Record<CreateSuggestionErrorCode, string> = {
  SUGGESTIONS_UNAVAILABLE: "Suggesting books isn't available yet.",
  CHILD_NOT_FOUND: "We couldn't find this child.",
  CONSENT_NOT_CONFIRMED:
    "Your family's consent must be confirmed before you can suggest a book.",
  INVALID_BOOK: "We couldn't find this book. Nothing was suggested.",
  BOOK_EXCLUDED:
    "This book was reported for this child, so it can't be suggested to them.",
  ALREADY_SUGGESTED: "You've already suggested this book to this child.",
  ALREADY_RECOMMENDED: "This book is already in this child's recommendations.",
  ALREADY_ON_SHELF: "This book is already on this child's shelf.",
  SAVE_FAILED:
    "We couldn't save the suggestion. Nothing was saved. Please try again.",
};

const CONFLICT_CODES: Record<SuggestionConflict, RefusalCode> = {
  suggested: "ALREADY_SUGGESTED",
  recommended: "ALREADY_RECOMMENDED",
  onShelf: "ALREADY_ON_SHELF",
};

/** Ends the transaction with a refusal; it is not transient, so the driver does not rerun it. */
class SuggestionRefused extends Error {
  constructor(readonly code: RefusalCode) {
    super(code);
  }
}

function suggestions() {
  return getDb().collection<SuggestionDocument>(PARENT_SUGGESTIONS);
}

/** A duplicate on the `{ childId, bookId }` unique index: another request inserted first. */
function isDuplicateSuggestion(err: unknown): boolean {
  if (!(err instanceof MongoServerError) || err.code !== 11000) return false;
  const keys = Object.keys((err.keyPattern ?? {}) as Record<string, unknown>);
  return (
    keys.length === 2 && keys.includes("childId") && keys.includes("bookId")
  );
}

/**
 * Steps 3 and 4. The book check before the transaction is PRE-3; inside one transaction
 * it checks the child against the session's family, locks the child, the consent and the
 * book (`OI-58`), checks 1b and 4a, then inserts the suggestion or, with `suggestAnyway`,
 * updates the pending one. Every read and `now()` is inside the callback, because the
 * driver may rerun it on a transient error. A duplicate key with `suggestAnyway` runs
 * the transaction once more, which then takes the update path.
 */
export async function createSuggestion(
  session: ParentSession,
  input: CreateSuggestionInput,
): Promise<ActionResult<null, CreateSuggestionErrorCode>> {
  if (!areParentSuggestionsEnabled()) {
    return fail("SUGGESTIONS_UNAVAILABLE", MESSAGES.SUGGESTIONS_UNAVAILABLE);
  }
  try {
    const active = await findActiveBookIds([input.bookId]);
    if (active.length === 0) {
      return fail("INVALID_BOOK", MESSAGES.INVALID_BOOK);
    }
    try {
      await withTransaction((tx) => saveSuggestionInTx(tx, session, input));
    } catch (err) {
      if (!isDuplicateSuggestion(err)) throw err;
      if (!input.suggestAnyway) {
        return fail("ALREADY_SUGGESTED", MESSAGES.ALREADY_SUGGESTED);
      }
      try {
        await withTransaction((tx) => saveSuggestionInTx(tx, session, input));
      } catch (retryErr) {
        // The second call's only expected ending is the update path; anything else,
        // a refusal included, is reported as a failed save.
        if (retryErr instanceof SuggestionRefused) {
          return fail(retryErr.code, MESSAGES[retryErr.code]);
        }
        return fail(
          "SAVE_FAILED",
          MESSAGES.SAVE_FAILED,
          logUnexpectedError("createSuggestion", retryErr),
        );
      }
    }
    return ok(null);
  } catch (err) {
    if (err instanceof SuggestionRefused) {
      return fail(err.code, MESSAGES[err.code]);
    }
    return fail(
      "SAVE_FAILED",
      MESSAGES.SAVE_FAILED,
      logUnexpectedError("createSuggestion", err),
    );
  }
}

async function saveSuggestionInTx(
  tx: Tx,
  session: ParentSession,
  input: CreateSuggestionInput,
): Promise<void> {
  const { childId, bookId } = input;
  const child = await getChildForFamily(session.familyId, childId, tx);
  if (!child) throw new SuggestionRefused("CHILD_NOT_FOUND");
  if (!(await lockChildForWrite(tx, childId))) {
    throw new SuggestionRefused("CHILD_NOT_FOUND");
  }
  if (!(await lockConsentForWrite(tx, session.familyId))) {
    throw new SuggestionRefused("CONSENT_NOT_CONFIRMED");
  }
  // OI-58: conflicts with a block or a return to draft of this book in another
  // transaction; matches nothing when one has already committed.
  if (!(await lockActiveBookForWrite(tx, bookId))) {
    throw new SuggestionRefused("INVALID_BOOK");
  }
  if (await isExcluded(childId, bookId, tx)) {
    throw new SuggestionRefused("BOOK_EXCLUDED");
  }

  const conflict = await getSuggestionConflict(
    session.familyId,
    childId,
    bookId,
    tx,
  );
  if (conflict && !input.suggestAnyway) {
    throw new SuggestionRefused(CONFLICT_CODES[conflict]);
  }

  const suggestedAt = now();
  if (conflict === "suggested") {
    // 4a with suggestAnyway: the one pending document takes the new note (or none).
    await suggestions().updateOne(
      { childId, bookId },
      input.note
        ? { $set: { note: input.note, suggestedAt } }
        : { $set: { suggestedAt }, $unset: { note: "" } },
      { session: tx },
    );
    return;
  }
  await suggestions().insertOne(
    {
      _id: new ObjectId(),
      childId,
      bookId,
      ...(input.note ? { note: input.note } : {}),
      suggestedAt,
    },
    { session: tx },
  );
}

/**
 * 4a: what the parent should hear about before suggesting, in order of precedence, or
 * null. A child outside the family gets null, so the answer says nothing about it.
 */
export async function getSuggestionConflict(
  familyId: string,
  childId: string,
  bookId: string,
  tx?: Tx,
): Promise<SuggestionConflict | null> {
  const child = await getChildForFamily(familyId, childId, tx);
  if (!child) return null;

  const pending = await suggestions().findOne(
    { childId, bookId },
    { projection: { _id: 1 }, session: tx },
  );
  if (pending) return "suggested";

  // SEAM (UC-REC-parent-review, not built): `recommended` when `bookId` is in the
  // `bookIds` of any batch `listReleasedBatchesForChild(childId, tx)` returns. Add the
  // call here when Recommendation builds it; the test row "4a, released batch" waits on it.

  if (await isOnShelf(childId, bookId, tx)) return "onShelf";
  return null;
}

/** One item of the child's list (step 5): book data, the note, and the generic label only. */
export type SuggestionForChild = {
  bookId: string;
  title: string;
  author: string;
  note?: string;
  fromGrownUp: true;
};

/**
 * Step 5, for `UC-REC-kid-review`'s page only. Reads only the session's child, newest
 * first, and drops books excluded for the child (`KD-book-exclusion`) and books no
 * longer active (blocked or back to draft). It returns no parent, date or count
 * (§8.2.11). With the release gate off the child sees nothing. Throws on a failed read.
 */
export async function listSuggestionsForChild(
  childSession: ChildSession,
): Promise<SuggestionForChild[]> {
  if (!areParentSuggestionsEnabled()) return [];
  const { childId } = childSession;
  const pending = await suggestions()
    .find(
      { childId },
      { projection: { _id: 0, bookId: 1, note: 1 }, sort: { suggestedAt: -1 } },
    )
    .toArray();
  if (pending.length === 0) return [];

  const excluded = new Set(await listExcludedBookIds(childId));
  const candidateIds = pending
    .map((suggestion) => suggestion.bookId)
    .filter((bookId) => !excluded.has(bookId));
  const active = new Set(await findActiveBookIds(candidateIds));
  const books = new Map(
    (await getBooksForShelf([...active])).map((book) => [book.id, book]),
  );

  return pending.flatMap((suggestion) => {
    const book = active.has(suggestion.bookId)
      ? books.get(suggestion.bookId)
      : undefined;
    if (!book) return [];
    return [
      {
        bookId: book.id,
        title: book.title,
        author: book.author,
        ...(suggestion.note ? { note: suggestion.note } : {}),
        fromGrownUp: true as const,
      },
    ];
  });
}
