"use server";

import {
  createChild,
  type CreatedChild,
} from "@/server/accounts-family/child-accounts";
import { logUnexpectedError } from "@/server/lib/log";
import { fail, type ActionResult } from "@/server/lib/action-result";
import { checkCreateChildAccess, type CreateChildAccessCode } from "./access";
import {
  createChildSchema,
  fieldErrorsOf,
  VALIDATION_MESSAGES,
  type ValidationErrorCode,
} from "./schema";

export type CreateChildAccountCode =
  | CreateChildAccessCode
  | ValidationErrorCode
  | "USERNAME_TAKEN"
  | "SAVE_FAILED";

/**
 * UC-PAR-create-kid-account steps 4–6. Session and role first, then validation, then
 * Accounts & Family (§8.2.3). The family comes from the session, never the request.
 */
export async function createChildAccount(
  input: unknown,
): Promise<ActionResult<CreatedChild, CreateChildAccountCode>> {
  try {
    const access = await checkCreateChildAccess();
    if (!access.ok) return access;

    const parsed = createChildSchema.safeParse(input);
    if (!parsed.success) {
      const code =
        Object.values(fieldErrorsOf(parsed.error))[0] ?? "NICKNAME_REQUIRED";
      return fail(code, VALIDATION_MESSAGES[code]);
    }

    return await createChild(access.data, parsed.data);
  } catch (err) {
    return fail(
      "SAVE_FAILED",
      "We couldn't create the account. Please try again.",
      logUnexpectedError("createChildAccount", err),
    );
  }
}
