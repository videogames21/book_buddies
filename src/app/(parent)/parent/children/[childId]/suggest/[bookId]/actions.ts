"use server";

import {
  createSuggestion,
  type CreateSuggestionErrorCode,
} from "@/server/accounts-family/suggestions";
import {
  requireParent,
  type SessionErrorCode,
} from "@/server/identity-access/sessions";
import { fail, type ActionResult } from "@/server/lib/action-result";
import { logUnexpectedError } from "@/server/lib/log";
import { toFormState, type SuggestFormState } from "./form-state";
import {
  firstErrorCode,
  SUGGEST_BOOK_SCHEMA_MESSAGES,
  suggestBookSchema,
  type SuggestBookSchemaCode,
} from "./schema";

export type SuggestBookCode =
  SessionErrorCode | SuggestBookSchemaCode | CreateSuggestionErrorCode;

/**
 * UC-PAR-suggest-book steps 3-4 (design/par.md, API contract). In order (§8.2.3): the
 * session, then the zod schema, then Accounts & Family, whose transaction checks the
 * child against the session's family first. Nothing reaches a query before the schema
 * has passed, and the family never comes from the request.
 */
export async function suggestBook(
  input: unknown,
): Promise<ActionResult<null, SuggestBookCode>> {
  try {
    const session = await requireParent();
    if (!session.ok) return session;

    const parsed = suggestBookSchema.safeParse(input);
    if (!parsed.success) {
      const code = firstErrorCode(parsed.error);
      return fail(code, SUGGEST_BOOK_SCHEMA_MESSAGES[code]);
    }

    const { childId, bookId, note, suggestAnyway } = parsed.data;
    return await createSuggestion(session.data, {
      childId,
      bookId,
      ...(note ? { note } : {}),
      suggestAnyway,
    });
  } catch (err) {
    return fail(
      "SAVE_FAILED",
      "We couldn't save the suggestion. Nothing was saved. Please try again.",
      logUnexpectedError("suggestBookAction", err),
    );
  }
}

/**
 * The confirmation form's action (review of #147). The page binds the child and book IDs
 * from the route, so they never come from a form field, and the form posts through
 * `useActionState`. It therefore works before hydration or without JavaScript: the note
 * goes in a POST body, never in a URL (§8.2.7). Every check is `suggestBook`'s.
 */
export async function submitSuggestion(
  childId: string,
  bookId: string,
  previous: SuggestFormState,
  formData: FormData,
): Promise<SuggestFormState> {
  const rawNote = formData.get("note");
  const note = typeof rawNote === "string" ? rawNote : "";
  const result = await suggestBook({
    childId,
    bookId,
    note,
    suggestAnyway: formData.get("suggestAnyway") === "1",
  });
  return toFormState(
    result,
    note,
    previous.status === "editing" ? previous.conflict : null,
  );
}
