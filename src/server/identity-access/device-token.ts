import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { now } from "@/server/lib/clock";
import { getChildDeviceSecret, getConfig } from "@/server/lib/config";

// The `child_device` cookie, which marks a browser a child has signed in on
// (design/shlf.md, Components; OI-49). It is used to count wrong passwords and for
// nothing else. It lists, for each such child, a random device ID, the opaque child ID
// and an expiry, under one signature, so the server trusts it without storing anything.
// It holds no name, username or IP address, and is never logged.

export const CHILD_DEVICE_COOKIE = "child_device";
export const CHILD_DEVICE_LIFETIME_SECONDS = 30 * 24 * 60 * 60;
/** Only the child pages are sent the cookie. */
const COOKIE_PATH = "/child";

const entriesSchema = z.array(
  z.strictObject({
    deviceId: z.string().min(1),
    childId: z.string().min(1),
    /** Milliseconds since the epoch, UTC. */
    expiresAt: z.number().int(),
  }),
);

type Entry = z.infer<typeof entriesSchema>[number];

function sign(payload: string): Buffer {
  return createHmac("sha256", getChildDeviceSecret()).update(payload).digest();
}

/** The cookie's unexpired entries, oldest first. None unless the signature is ours. */
async function readEntries(): Promise<Entry[]> {
  const value = (await cookies()).get(CHILD_DEVICE_COOKIE)?.value;
  const parts = value?.split(".") ?? [];
  const [payload, signature] = parts;
  if (parts.length !== 2 || !payload || !signature) return [];
  const expected = sign(payload);
  const given = Buffer.from(signature, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return [];
  }
  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return [];
  }
  const parsed = entriesSchema.safeParse(decoded);
  if (!parsed.success) return [];
  const at = now().getTime();
  return parsed.data.filter((entry) => entry.expiresAt > at);
}

/** This browser's device ID for the child, or null when it is not trusted for them. */
export async function readTrustedDevice(
  childId: string,
): Promise<string | null> {
  const entries = await readEntries();
  return entries.find((entry) => entry.childId === childId)?.deviceId ?? null;
}

/**
 * Trusts this browser for the child, or renews that trust, keeping the other children's
 * entries up to the configured number, the oldest going first. Call it only after a
 * correct password: a failed attempt must never earn a count of its own.
 */
export async function issueDeviceToken(childId: string): Promise<void> {
  const entries = await readEntries();
  const renewed: Entry = {
    deviceId:
      entries.find((entry) => entry.childId === childId)?.deviceId ??
      randomBytes(16).toString("hex"),
    childId,
    expiresAt: now().getTime() + CHILD_DEVICE_LIFETIME_SECONDS * 1000,
  };
  const kept = [
    ...entries.filter((entry) => entry.childId !== childId),
    renewed,
  ].slice(-getConfig().CHILD_DEVICE_MAX_CHILDREN);
  const payload = Buffer.from(JSON.stringify(kept)).toString("base64url");
  (await cookies()).set(
    CHILD_DEVICE_COOKIE,
    `${payload}.${sign(payload).toString("base64url")}`,
    {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: COOKIE_PATH,
      // The newest entry's, which is the latest.
      expires: new Date(renewed.expiresAt),
    },
  );
}
