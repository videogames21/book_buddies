import "server-only";
import { RESET_PASSWORD_PATH } from "@/app/(parent)/parent/onboarding/paths";
import { appendPasswordResetAudit } from "@/server/audit/audit-log";
import { fail, ok, type ActionResult } from "@/server/lib/action-result";
import { getAppUrl } from "@/server/lib/config";
import { withTransaction } from "@/server/lib/db";
import { logUnexpectedError } from "@/server/lib/log";
import { sendEmail } from "@/server/notification/email";
import {
  findParentByEmail,
  findParentEmail,
  replaceMainParentPassword,
} from "./parent-accounts";
import {
  consumeResetToken,
  findResetUser,
  issueResetToken,
} from "./password-resets";
import { hashPassword } from "./passwords";
import { deleteSessionsOfUser } from "./sessions";
import { clearSignInAttempts } from "./sign-in-throttle";

// The password reset supporting flow (OI-44, design/par.md). Main Parents only. It
// treats every Main Parent alike, whatever their onboarding step.

/** The token rides in the fragment, which browsers never send to the server (§8.2.7). */
export function resetLink(token: string): string {
  return `${getAppUrl()}${RESET_PASSWORD_PATH}#token=${encodeURIComponent(token)}`;
}

export function buildResetEmail(input: { token: string; expiresAt: Date }): {
  subject: string;
  text: string;
} {
  const expires = input.expiresAt.toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "long",
    timeZone: "UTC",
  });
  const text = [
    "Someone asked to reset the password of your BookBuddies parent account.",
    "",
    "To choose a new password, open this link:",
    resetLink(input.token),
    "",
    `The link works once and stops working on ${expires}.`,
    "",
    "If you did not ask for this, ignore this email. Your password stays the same.",
  ].join("\n");
  return { subject: "Reset your BookBuddies password", text };
}

/**
 * Sends a reset link when the email belongs to a Main Parent and none was sent within
 * the spacing. Runs after the response, so the answer and its timing are the same
 * whether or not an account exists. Never throws: a failure is logged without the
 * email (§8.2.7).
 */
export async function sendPasswordReset(email: string): Promise<void> {
  try {
    const parent = await findParentByEmail(email);
    if (parent?.parentRole !== "main") return;
    const issued = await issueResetToken(parent.userId);
    if (!issued) return;
    await sendEmail({ to: email, ...buildResetEmail(issued) });
  } catch (err) {
    logUnexpectedError("sendPasswordReset", err);
  }
}

export type ResetCode = "RESET_LINK_INVALID" | "WEAK_PASSWORD";

class ResetLinkInvalidError extends Error {}

const invalidLink = () =>
  fail("RESET_LINK_INVALID", "This link no longer works. Ask for a new one.");

/**
 * One transaction uses the token, replaces the hash, ends every session of the parent,
 * clears the sign-in count and appends the audit entry (design/par.md, Key decisions).
 * The token is checked before the costly hash, and a password refused by the 4c rule
 * leaves the token usable.
 */
export async function resetParentPassword(
  token: string,
  password: string,
): Promise<ActionResult<null, ResetCode>> {
  const userId = await findResetUser(token);
  if (!userId) return invalidLink();
  const email = await findParentEmail(userId);
  if (email && password.toLowerCase() === email.toLowerCase()) {
    return fail(
      "WEAK_PASSWORD",
      "Use 8 to 128 characters, and not your email address.",
    );
  }
  const passwordHash = await hashPassword(password);
  try {
    await withTransaction(async (tx) => {
      const owner = await consumeResetToken(tx, token);
      if (owner !== userId) throw new ResetLinkInvalidError();
      const accountKey = await replaceMainParentPassword(
        tx,
        userId,
        passwordHash,
      );
      if (!accountKey) throw new ResetLinkInvalidError();
      await deleteSessionsOfUser(userId, tx);
      await clearSignInAttempts(accountKey, tx);
      await appendPasswordResetAudit(tx, userId);
    });
  } catch (err) {
    if (err instanceof ResetLinkInvalidError) return invalidLink();
    throw err;
  }
  return ok(null);
}
