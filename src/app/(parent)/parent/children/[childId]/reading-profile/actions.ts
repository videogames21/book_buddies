"use server";

import { fail, ok, type ActionResult } from "@/server/lib/action-result";
import { logUnexpectedError } from "@/server/lib/log";
import { saveOnboardingProfile } from "@/server/recommendation/reading-profiles";
import { requireOwnChildWithConsent, type SaveAccessCode } from "./access";
import {
  firstErrorCode,
  READING_PROFILE_MESSAGES,
  readingProfileSchema,
  type ReadingProfileErrorCode,
} from "./schema";

export type SaveReadingProfileCode =
  | SaveAccessCode
  | ReadingProfileErrorCode
  | "ONBOARDING_ALREADY_COMPLETE"
  | "SAVE_FAILED";

/**
 * UC-REC-kid-onboarding steps 3 to 5. Session and family first, then consent, then
 * validation, then Recommendation (§8.2.3). The family comes from the session, never
 * the request, and a foreign child is refused before anything else is revealed.
 */
export async function saveReadingProfile(
  input: unknown,
): Promise<ActionResult<null, SaveReadingProfileCode>> {
  try {
    const childId =
      typeof input === "object" && input !== null && "childId" in input
        ? input.childId
        : undefined;
    const access = await requireOwnChildWithConsent(childId);
    if (!access.ok) return access;

    const parsed = readingProfileSchema.safeParse(input);
    if (!parsed.success) {
      const code = firstErrorCode(parsed.error);
      return fail(code, READING_PROFILE_MESSAGES[code]);
    }

    const saved = await saveOnboardingProfile(
      access.data.session,
      parsed.data.childId,
      parsed.data,
    );
    return saved.ok ? ok(null) : saved;
  } catch (err) {
    return fail(
      "SAVE_FAILED",
      "We couldn't save the reading profile. Nothing was saved; please try again.",
      logUnexpectedError("saveReadingProfile", err),
    );
  }
}
