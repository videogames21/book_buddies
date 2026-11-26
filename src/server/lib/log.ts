import "server-only";
import { randomUUID } from "node:crypto";

// Logging (architecture §8.2.7). Callers pass a fixed description of where the
// failure happened. An error may quote user input in any property, so its message and
// stack are never logged, and its name and code only when listed here.

const LOGGED_ERROR_NAMES = [
  "HealthTimeoutError",
  "MongoNetworkError",
  "MongoNetworkTimeoutError",
  "MongoOperationTimeoutError",
  "MongoServerError",
  "MongoServerSelectionError",
  "TypeError",
];

// Network and SMTP failure codes.
const LOGGED_ERROR_CODES = [
  "EAUTH",
  "ECONNECTION",
  "ECONNREFUSED",
  "ECONNRESET",
  "EDNS",
  "ENOTFOUND",
  "ESOCKET",
  "ETIMEDOUT",
];

/** The listed value equal to `value`, so nothing else can reach a log line. */
const listed = (list: string[], value: unknown) =>
  list.find((entry) => entry === value);

export function logUnexpectedError(where: string, err: unknown): string {
  const errorId = randomUUID();
  const error =
    err instanceof Error ? (err as Error & { code?: unknown }) : null;
  console.error(
    // JSON.stringify leaves out a field that is undefined.
    JSON.stringify({
      level: "error",
      errorId,
      where,
      kind: error ? "exception" : "unknown",
      errorName: listed(LOGGED_ERROR_NAMES, error?.name),
      errorCode: listed(LOGGED_ERROR_CODES, error?.code),
    }),
  );
  return errorId;
}

type SecurityEvent =
  | "sign-in-refused"
  | "reauth-refused"
  | "cleanup-refused"
  | "cleanup-run"
  | "recommendation-request-failed";

/** A security event (§8.2.7): a fixed event name and result code, and nothing else. */
export function logSecurityEvent(event: SecurityEvent, code: string): string {
  const eventId = randomUUID();
  console.warn(JSON.stringify({ level: "warn", eventId, event, code }));
  return eventId;
}
