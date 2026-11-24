import "server-only";
import { forbidden, redirect } from "next/navigation";
import {
  requireAdmin,
  type AdminSession,
} from "@/server/identity-access/sessions";

export const SIGN_IN_PATH = "/sign-in";
export const CATALOG_PATH = "/admin/catalog";
export const NEW_BOOK_PATH = "/admin/catalog/new";

/**
 * The check every admin page starts with (§8.1; UC-ADM-add-content 1a). No session goes
 * to sign-in; any other role ends with HTTP 403 and the fixed "Not authorized" page.
 * The page checks itself because the action cannot be trusted to have run first.
 */
export async function requireAdminPage(): Promise<AdminSession> {
  const admin = await requireAdmin();
  if (admin.ok) return admin.data;
  if (admin.error.code === "NOT_SIGNED_IN") return redirect(SIGN_IN_PATH);
  return forbidden();
}
