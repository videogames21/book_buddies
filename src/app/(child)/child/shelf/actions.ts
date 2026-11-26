"use server";

import {
  requireChild,
  type ChildSessionErrorCode,
} from "@/server/identity-access/sessions";
import { fail, ok, type ActionResult } from "@/server/lib/action-result";
import { logUnexpectedError } from "@/server/lib/log";
import { markNoticeSeen } from "@/server/notification/child-notices";
import { noticeIdSchema } from "./schema";

export type DismissNoticeCode =
  ChildSessionErrorCode | "INVALID_NOTICE" | "DISMISS_FAILED";

const TRY_AGAIN = "That didn’t work. Try again or ask a grown-up.";

/**
 * The child tapped OK on a notice (UC-SHLF-kid-view-shelf 3d, 3f): the shelf's one
 * write. The child is the session's, never the request's. It answers `ok` whether or not
 * this call marked anything, so it does not show whether another child's notice exists.
 */
export async function dismissChildNotice(
  noticeId: unknown,
): Promise<ActionResult<null, DismissNoticeCode>> {
  try {
    const session = await requireChild();
    if (!session.ok) return session;
    const parsed = noticeIdSchema.safeParse(noticeId);
    if (!parsed.success) return fail("INVALID_NOTICE", TRY_AGAIN);
    await markNoticeSeen(session.data.childId, parsed.data);
    return ok(null);
  } catch (err) {
    return fail(
      "DISMISS_FAILED",
      TRY_AGAIN,
      logUnexpectedError("dismissChildNotice", err),
    );
  }
}
