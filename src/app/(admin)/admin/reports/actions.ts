"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { decideReportedBook } from "@/server/administration/book-decisions";
import { requireAdmin } from "@/server/identity-access/sessions";
import { fail, type ActionResult } from "@/server/lib/action-result";
import { BLOCK_REASONS } from "@/shared/catalog/block-reasons";

const schema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("warn"),
    entry: z.literal("reports"),
    reportId: z.string().regex(/^[0-9a-f]{24}$/),
  }),
  z.object({
    kind: z.literal("block"),
    entry: z.enum(["catalog", "reports"]),
    reason: z.enum(BLOCK_REASONS),
  }),
  z.object({ kind: z.literal("close"), entry: z.literal("reports") }),
  z.object({ kind: z.literal("discard"), entry: z.literal("reports") }),
]);

export async function saveBookDecision(
  bookId: string,
  _previous: ActionResult<null> | null,
  form: FormData,
): Promise<ActionResult<null>> {
  const admin = await requireAdmin();
  if (!admin.ok) return admin;
  if (!z.uuid().safeParse(bookId).success)
    return fail("BOOK_NOT_FOUND", "This book is no longer in the catalog.");
  if (form.get("confirmed") !== "yes")
    return fail("CONFIRMATION_REQUIRED", "Confirm the decision before saving.");
  const parsed = schema.safeParse({
    kind: form.get("kind"),
    entry: form.get("entry"),
    reason: form.get("reason"),
    reportId: form.get("reportId"),
  });
  if (!parsed.success)
    return fail("INVALID_REASON", "Choose a valid decision and reason.");
  const result = await decideReportedBook(admin.data, bookId, parsed.data);
  if (!result.ok) return result;
  if (parsed.data.kind === "warn")
    redirect(`/admin/reports/${bookId}?decision=warned`);
  const next =
    parsed.data.entry === "catalog" ? "/admin/catalog" : "/admin/reports";
  const status = result.data.outcome === "DISCARDED" ? "discarded" : "blocked";
  redirect(`${next}?decision=${status}`);
}
