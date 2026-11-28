"use server";

import {
  requireParent,
  type SessionErrorCode,
} from "@/server/identity-access/sessions";
import { fail, type ActionResult } from "@/server/lib/action-result";
import { logUnexpectedError } from "@/server/lib/log";
import {
  removeBookForParent,
  type RemoveBookErrorCode,
} from "@/server/shelf/parent-removal";
import {
  firstErrorCode,
  REMOVE_BOOK_INPUT_MESSAGES,
  removeBookSchema,
  type RemoveBookInputErrorCode,
} from "./schema";

export type RemoveBookCode =
  SessionErrorCode | RemoveBookInputErrorCode | RemoveBookErrorCode;

/**
 * UC-SHLF-parent-remove-book steps 4 to 6. Session first, then validation, then Shelf
 * (§8.2.3). The family comes from the session, never the request.
 */
export async function removeBookFromShelf(
  input: unknown,
): Promise<ActionResult<null, RemoveBookCode>> {
  try {
    const session = await requireParent();
    if (!session.ok) return session;

    const parsed = removeBookSchema.safeParse(input);
    if (!parsed.success) {
      const code = firstErrorCode(parsed.error);
      return fail(code, REMOVE_BOOK_INPUT_MESSAGES[code]);
    }

    const { childId, bookId } = parsed.data;
    return await removeBookForParent(session.data, { childId, bookId });
  } catch (err) {
    return fail(
      "SAVE_FAILED",
      "Nothing was saved. Please try again.",
      logUnexpectedError("removeBookFromShelfAction", err),
    );
  }
}
