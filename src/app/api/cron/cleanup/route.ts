import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { purgeExpiredUnconfirmed } from "@/server/accounts-family/families";
import { purgeEndedChildSessions } from "@/server/identity-access/child-sessions";
import { purgeExpiredResets } from "@/server/identity-access/password-resets";
import { purgeExpiredSignInAttempts } from "@/server/identity-access/sign-in-throttle";
import { fail, ok } from "@/server/lib/action-result";
import { getConfig } from "@/server/lib/config";
import { logSecurityEvent, logUnexpectedError } from "@/server/lib/log";

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
// accounts past their deadline (6a), password reset records, sign-in counts and ended
// child sessions. Each purge runs even if an earlier one fails; any failure is reported
// after all have run.
const PURGES = [
  purgeExpiredUnconfirmed,
  purgeExpiredResets,
  purgeExpiredSignInAttempts,
  purgeEndedChildSessions,
];

async function runPurges(): Promise<number> {
  let purged = 0;
  let failure: Error | undefined;
  for (const purge of PURGES) {
    try {
      purged += await purge();
    } catch (err) {
      failure ??= new Error("a purge failed", { cause: err });
    }
  }
  if (failure) throw failure;
  return purged;
}

export async function GET(request: Request) {
  try {
    if (!hasCronSecret(request)) {
      logSecurityEvent("cleanup-refused", "UNAUTHORIZED");
      return NextResponse.json(fail("UNAUTHORIZED", "Not authorized."), {
        status: 401,
      });
    }
    const purged = await runPurges();
    logSecurityEvent("cleanup-run", "OK");
    return NextResponse.json(ok({ purged }));
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
