"use server";

import { z } from "zod";
import { continueChildSession } from "@/server/identity-access/child-sessions";
import {
  requireChild,
  type ChildSessionErrorCode,
} from "@/server/identity-access/sessions";
import { fail, ok, type ActionResult } from "@/server/lib/action-result";
import { logUnexpectedError } from "@/server/lib/log";

const keepAliveSchema = z.strictObject({ active: z.boolean() });

export type KeepAliveCode =
  ChildSessionErrorCode | "INVALID_INPUT" | "KEEP_ALIVE_FAILED";

/**
 * Sent by every open child page (design/shlf.md, "The session ends at the next
 * midnight"). The session check marks the visit as still open; it counts as activity
 * only if the child tapped, pressed a key or scrolled since the last one. Returns
 * nothing else, and logs nothing about the child (§8.2.7).
 */
export async function keepChildSessionAlive(
  input: unknown,
): Promise<ActionResult<null, KeepAliveCode>> {
  try {
    const session = await requireChild({ countsAsActivity: false });
    if (!session.ok) return session;
    const parsed = keepAliveSchema.safeParse(input);
    if (!parsed.success) return fail("INVALID_INPUT", "That didn’t work.");
    if (
      parsed.data.active &&
      !(await continueChildSession(session.data.sessionId, true))
    ) {
      return fail("NOT_SIGNED_IN", "Please sign in.");
    }
    return ok(null);
  } catch (err) {
    return fail(
      "KEEP_ALIVE_FAILED",
      "That didn’t work.",
      logUnexpectedError("keepChildSessionAlive", err),
    );
  }
}
