"use server";

import { revalidatePath } from "next/cache";
import { addBook, type AddBookErrorCode } from "@/server/catalog/books";
import {
  requireAdmin,
  type AdminSessionErrorCode,
} from "@/server/identity-access/sessions";
import { fail, ok, type ActionResult } from "@/server/lib/action-result";
import { now } from "@/server/lib/clock";
import { logUnexpectedError } from "@/server/lib/log";
import {
  buildNewBookSchema,
  newBookErrorMessage,
  newBookErrorOf,
  type NewBookErrorCode,
} from "@/shared/catalog/new-book-schema";
import { TAG_LISTS } from "@/shared/catalog/tags";

export type AddCatalogBookCode =
  AdminSessionErrorCode | NewBookErrorCode | AddBookErrorCode;

/**
 * UC-ADM-add-content steps 4 to 7. Session and role first, then validation, then the
 * Catalog (§8.2.3). The admin comes from the session, never the request, and a status in
 * the request is dropped by the schema: a new book is always draft.
 */
export async function addCatalogBook(
  input: unknown,
): Promise<ActionResult<{ bookId: string }, AddCatalogBookCode>> {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return admin;

    const parsed = buildNewBookSchema({
      tags: TAG_LISTS,
      now: now(),
    }).safeParse(input);
    if (!parsed.success) {
      const { code, field } = newBookErrorOf(parsed.error);
      return fail(code, newBookErrorMessage(code, field));
    }

    const added = await addBook(admin.data, parsed.data);
    if (!added.ok) return added;
    revalidatePath("/admin/catalog");
    return ok(added.data);
  } catch (err) {
    return fail(
      "SAVE_FAILED",
      "We couldn't save the book. Nothing was saved. Please try again.",
      logUnexpectedError("addCatalogBook", err),
    );
  }
}
