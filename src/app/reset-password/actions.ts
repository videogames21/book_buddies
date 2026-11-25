"use server";

import { z } from "zod";
import {
  resetParentPassword,
  type ResetCode,
} from "@/server/identity-access/password-reset-flow";
import { fail, type ActionResult } from "@/server/lib/action-result";
import { logUnexpectedError } from "@/server/lib/log";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/app/sign-up/schema";

const tokenSchema = z.string().min(1).max(128);
// The 4c rule (design/par-field-values.md); the email comparison is made once the
// token names the account.
const passwordSchema = z.string().min(PASSWORD_MIN).max(PASSWORD_MAX);

export type ResetPasswordCode = ResetCode | "SAVE_FAILED";

/**
 * Password reset (OI-44). Anyone holding the token may call it, with no session; the
 * account comes from the token, never the request.
 */
export async function resetPassword(
  input: unknown,
): Promise<ActionResult<null, ResetPasswordCode>> {
  try {
    const fields = (input ?? {}) as { token?: unknown; password?: unknown };
    const token = tokenSchema.safeParse(fields.token);
    if (!token.success) {
      return fail(
        "RESET_LINK_INVALID",
        "This link no longer works. Ask for a new one.",
      );
    }
    const password = passwordSchema.safeParse(fields.password);
    if (!password.success) {
      return fail(
        "WEAK_PASSWORD",
        `Use ${String(PASSWORD_MIN)} to ${String(PASSWORD_MAX)} characters, and not your email address.`,
      );
    }
    return await resetParentPassword(token.data, password.data);
  } catch (err) {
    return fail(
      "SAVE_FAILED",
      "We couldn't change your password. Please try again.",
      logUnexpectedError("resetPassword", err),
    );
  }
}
