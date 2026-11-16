import "server-only";
import { randomUUID } from "node:crypto";

// Logging (architecture §8.2.7). Callers pass a fixed description of where the
// failure happened. No property of the error is logged: it may quote user input.

export function logUnexpectedError(where: string, err: unknown): string {
  const errorId = randomUUID();
  // Error objects can contain user input even in name/code, so log no fields from them.
  console.error(
    JSON.stringify({
      level: "error",
      errorId,
      where,
      kind: err instanceof Error ? "exception" : "unknown",
    }),
  );
  return errorId;
}
