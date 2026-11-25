"use server";

import { after } from "next/server";
import { z } from "zod";
import { sendPasswordReset } from "@/server/identity-access/password-reset-flow";
import { fail, ok, type ActionResult } from "@/server/lib/action-result";
import { logUnexpectedError } from "@/server/lib/log";
import { EMAIL_MAX } from "@/app/sign-up/schema";

const requestSchema = z.object({
  email: z.string().trim().toLowerCase().max(EMAIL_MAX).pipe(z.email()),
});

export type RequestResetCode = "INVALID_EMAIL" | "REQUEST_FAILED";

/**
 * Password reset request (OI-44). Open to anyone, so there is no session check. Only a
 * malformed email is refused; otherwise the answer is the same `ok` whether or not an
 * account exists, and the lookup and email happen after the response (design/par.md).
 */
// Server actions must be async; the work itself runs in after(), so nothing is awaited.
// eslint-disable-next-line @typescript-eslint/require-await
export async function requestPasswordReset(
  input: unknown,
): Promise<ActionResult<null, RequestResetCode>> {
  try {
    const parsed = requestSchema.safeParse(input);
    if (!parsed.success) {
      return fail("INVALID_EMAIL", "Enter a valid email address.");
    }
    const { email } = parsed.data;
    after(() => sendPasswordReset(email));
    return ok(null);
  } catch (err) {
    return fail(
      "REQUEST_FAILED",
      "Something went wrong. Please try again.",
      logUnexpectedError("requestPasswordReset", err),
    );
  }
}
