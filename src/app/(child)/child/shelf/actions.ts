"use server";

import { z } from "zod";
import { requireChild } from "@/server/identity-access/sessions";
import { fail, ok } from "@/server/lib/action-result";
import { logUnexpectedError } from "@/server/lib/log";
import { markNoticeSeen } from "@/server/notification/child-notices";

const noticeIdSchema = z.string().regex(/^[a-f\d]{24}$/i);

export async function dismissChildNotice(input: unknown) {
  try {
    const session = await requireChild();
    if (!session.ok) return session;
    const noticeId = noticeIdSchema.safeParse(input);
    if (!noticeId.success)
      return fail("INVALID_NOTICE", "That notice could not be dismissed.");
    await markNoticeSeen(session.data.childId, noticeId.data);
    return ok(null);
  } catch (error) {
    return fail(
      "SAVE_FAILED",
      "That notice could not be dismissed. Try again.",
      logUnexpectedError("dismissChildNotice", error),
    );
  }
}
