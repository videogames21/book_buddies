import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { purgeExpiredUnconfirmed } from "@/server/accounts-family/families";
import { purgeEndedChildSessions } from "@/server/identity-access/child-sessions";
import { purgeExpiredResets } from "@/server/identity-access/password-resets";
import { purgeExpiredSignInAttempts } from "@/server/identity-access/sign-in-throttle";
import { fail, ok } from "@/server/lib/action-result";
import { getConfig } from "@/server/lib/config";
import { logSecurityEvent, logUnexpectedError } from "@/server/lib/log";
import { releaseExpiredBatches } from "@/server/recommendation/batches";

export const dynamic = "force-dynamic";

const digest = (value: string) => createHash("sha256").update(value).digest();

function hasCronSecret(request: Request): boolean {
  const secret = getConfig().CRON_SECRET;
  if (!secret) return false;
  return timingSafeEqual(
    digest(request.headers.get("authorization") ?? ""),
    digest(`Bearer ${secret}`),
  );
}

// Scheduled Cleanup (design/par.md). It deletes only what has already expired: unconfirmed
// accounts, password resets, sign-in counts and ended child sessions. It also records
// expired recommendation handoffs. Run every task before reporting a failure.
const PURGES = [
  purgeExpiredUnconfirmed,
  purgeExpiredResets,
  purgeExpiredSignInAttempts,
  purgeEndedChildSessions,
];

async function runCleanup(): Promise<{ purged: number; released: number }> {
  let purged = 0;
  let released = 0;
  let failure: Error | undefined;
  for (const purge of PURGES) {
    try {
      purged += await purge();
    } catch (err) {
      failure ??= new Error("a purge failed", { cause: err });
    }
  }
  try {
    released = await releaseExpiredBatches();
  } catch (err) {
    failure ??= new Error("the batch release failed", { cause: err });
  }
  if (failure) throw failure;
  return { purged, released };
}

export async function GET(request: Request) {
  try {
    if (!hasCronSecret(request)) {
      logSecurityEvent("cleanup-refused", "UNAUTHORIZED");
      return NextResponse.json(fail("UNAUTHORIZED", "Not authorized."), {
        status: 401,
      });
    }
    const counts = await runCleanup();
    logSecurityEvent("cleanup-run", "OK");
    return NextResponse.json(ok(counts));
  } catch (err) {
    return NextResponse.json(
      fail(
        "CLEANUP_FAILED",
        "Cleanup failed.",
        logUnexpectedError("cronCleanup", err),
      ),
      { status: 500 },
    );
  }
}
