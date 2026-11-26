import { NextResponse } from "next/server";
import { fail, ok } from "@/server/lib/action-result";
import { getConfig } from "@/server/lib/config";
import { pingDatabase } from "@/server/lib/db";
import { logUnexpectedError } from "@/server/lib/log";

export const dynamic = "force-dynamic";

const PING_TIMEOUT_MS = 3_000;
const NO_STORE = { "Cache-Control": "no-store" };

// Health check (architecture §8.1, §8.2.7). Public on purpose, so a monitor needs no
// secret: it takes no input, reads no collection and returns nothing about any person.
// 200 means the configuration is valid and the database answered.
export async function GET() {
  try {
    const commit = getConfig().VERCEL_GIT_COMMIT_SHA ?? null;
    const startedAt = performance.now();
    await pingDatabase(PING_TIMEOUT_MS);
    const databaseMs = Math.round(performance.now() - startedAt);
    return NextResponse.json(ok({ commit, databaseMs }), { headers: NO_STORE });
  } catch (err) {
    return NextResponse.json(
      fail(
        "UNHEALTHY",
        "The service is unavailable.",
        logUnexpectedError("health", err),
      ),
      { status: 503, headers: NO_STORE },
    );
  }
}
