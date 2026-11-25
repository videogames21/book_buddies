"use server";

import { getChildForFamily } from "@/server/accounts-family/child-accounts";
import {
  deleteChild,
  type DeleteChildCode,
} from "@/server/accounts-family/child-deletion";
import { getParentCredential } from "@/server/identity-access/parent-accounts";
import { verifyPassword } from "@/server/identity-access/passwords";
import {
  requireParent,
  type SessionErrorCode,
} from "@/server/identity-access/sessions";
import { waitMessage } from "@/server/identity-access/sign-in";
import {
  claimSignInAttempt,
  clearSignInAttempts,
} from "@/server/identity-access/sign-in-throttle";
import { fail, ok, type ActionResult } from "@/server/lib/action-result";
import { logSecurityEvent, logUnexpectedError } from "@/server/lib/log";
import {
  DELETE_CHILD_INPUT_MESSAGES,
  deleteChildSchema,
  firstErrorCode,
  nicknameMatches,
  type DeleteChildInputCode,
} from "./schema";

export type DeleteChildAccountCode =
  | SessionErrorCode
  | DeleteChildInputCode
  | DeleteChildCode
  | "WRONG_PASSWORD"
  | "TOO_MANY_ATTEMPTS"
  | "NICKNAME_MISMATCH";

const WRONG_PASSWORD_MESSAGE = "That password is incorrect.";

/**
 * UC-PAR-delete-kid-account steps 4–5. In order (§8.2.3, design/par.md): the session;
 * a Sub Parent refused (1a); validation; the child checked against the session's family,
 * so another family's child is not found before anything else is revealed; the password
 * re-check through the sign-in throttle, counted before the check and sharing sign-in's
 * account key (4a, SEC-signin-throttling); the nickname (4a); then Accounts & Family.
 * The family comes from the session and never from the request. Consent need not be
 * active (UC-PAR-revoke-consent 2a). No password, nickname or email is logged (§8.2.7).
 */
export async function deleteChildAccount(
  input: unknown,
): Promise<ActionResult<null, DeleteChildAccountCode>> {
  try {
    const session = await requireParent();
    if (!session.ok) return session;
    const parent = session.data;
    if (parent.parentRole !== "main") {
      return fail(
        "NOT_MAIN_PARENT",
        "Only the Main Parent can delete a child's account.",
      );
    }

    const parsed = deleteChildSchema.safeParse(input);
    if (!parsed.success) {
      const code = firstErrorCode(parsed.error);
      return fail(code, DELETE_CHILD_INPUT_MESSAGES[code]);
    }
    const { childId, password, nickname } = parsed.data;

    const child = await getChildForFamily(parent.familyId, childId);
    if (!child) return fail("CHILD_NOT_FOUND", "We couldn't find that child.");

    const credential = await getParentCredential(parent.userId);
    if (!credential) {
      // Fail closed: an account with no password cannot confirm a deletion.
      logSecurityEvent("reauth-refused", "WRONG_PASSWORD");
      return fail("WRONG_PASSWORD", WRONG_PASSWORD_MESSAGE);
    }
    const claim = await claimSignInAttempt(credential.email);
    if (!claim.allowed) {
      logSecurityEvent("reauth-refused", "TOO_MANY_ATTEMPTS");
      return fail("TOO_MANY_ATTEMPTS", waitMessage(claim.waitSeconds));
    }
    if (!(await verifyPassword(password, credential.passwordHash))) {
      logSecurityEvent("reauth-refused", "WRONG_PASSWORD");
      return fail("WRONG_PASSWORD", WRONG_PASSWORD_MESSAGE);
    }
    await clearSignInAttempts(credential.email);

    if (!nicknameMatches(nickname, child.nickname)) {
      return fail(
        "NICKNAME_MISMATCH",
        "That nickname doesn't match. Type it exactly as it appears above.",
      );
    }

    const deleted = await deleteChild(parent, childId);
    return deleted.ok ? ok(null) : deleted;
  } catch (err) {
    return fail(
      "DELETE_FAILED",
      "We couldn't delete the account. Nothing was deleted; please try again.",
      logUnexpectedError("deleteChildAccount", err),
    );
  }
}
