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
