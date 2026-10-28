import "server-only";
import { randomUUID } from "node:crypto";

// Logging (architecture §8.2.7). Callers pass a fixed description of where the
// failure happened; only the error's class name and driver code are logged, never
// its message, because driver messages can quote the data (a duplicate key error
// quotes the username).

export function logUnexpectedError(where: string, err: unknown): string {
  const errorId = randomUUID();
  const name = err instanceof Error ? err.name : typeof err;
  const code =
    typeof err === "object" && err !== null && "code" in err ? String((err as { code: unknown }).code) : undefined;
  console.error(JSON.stringify({ level: "error", errorId, where, name, code }));
  return errorId;
}
