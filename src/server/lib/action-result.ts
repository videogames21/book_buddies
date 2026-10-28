import "server-only";

// The one result shape every server action returns (architecture §8.2.1).
// Messages are written for the user; exception messages and stack traces never go in them.

export type ActionError<Code extends string = string> = {
  code: Code;
  message: string;
  /** Present on unexpected failures, so a parent can quote it and the logs can be searched for it. */
  errorId?: string;
};

export type ActionResult<Data, Code extends string = string> =
  | { ok: true; data: Data }
  | { ok: false; error: ActionError<Code> };

export function ok<Data>(data: Data): { ok: true; data: Data } {
  return { ok: true, data };
}

export function fail<Code extends string>(
  code: Code,
  message: string,
  errorId?: string,
): { ok: false; error: ActionError<Code> } {
  return { ok: false, error: errorId ? { code, message, errorId } : { code, message } };
}
