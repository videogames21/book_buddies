import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
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

// Scheduled Cleanup (design/par.md). It deletes only what has already expired; the
// unconfirmed-account and password-reset purges join it with their flows.
export async function GET(request: Request) {
  try {
    if (!hasCronSecret(request)) {
      logSecurityEvent("cleanup-refused", "UNAUTHORIZED");
      return NextResponse.json(fail("UNAUTHORIZED", "Not authorized."), {
        status: 401,
      });
    }
    const purged = await purgeExpiredSignInAttempts();
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
