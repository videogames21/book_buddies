import { z } from "zod";

// The one schema for the delete-child form and the deleteChildAccount action
// (architecture §8.2.5). The child ID comes from the route; the password and the typed
// nickname from the form (UC-PAR-delete-kid-account step 3). Neither is trimmed here:
// the password is checked as typed, and the nickname comparison trims it once.

export type DeleteChildInputCode =
  "PASSWORD_REQUIRED" | "NICKNAME_REQUIRED" | "INVALID_INPUT";

// Far above any real password or nickname; bounds the work done on hostile input.
const MAX_FIELD_LENGTH = 1024;

export const deleteChildSchema = z.object({
  childId: z
    .string({ error: "INVALID_INPUT" })
    .regex(/^[0-9a-f-]{36}$/, "INVALID_INPUT"),
  password: z
    .string({ error: "PASSWORD_REQUIRED" })
    .min(1, "PASSWORD_REQUIRED")
    .max(MAX_FIELD_LENGTH, "INVALID_INPUT"),
  nickname: z
    .string({ error: "NICKNAME_REQUIRED" })
    .max(MAX_FIELD_LENGTH, "INVALID_INPUT")
    .refine((value) => value.trim().length > 0, "NICKNAME_REQUIRED"),
});

export type DeleteChildInput = z.infer<typeof deleteChildSchema>;

export const DELETE_CHILD_INPUT_MESSAGES: Record<DeleteChildInputCode, string> =
  {
    PASSWORD_REQUIRED: "Enter your password.",
    NICKNAME_REQUIRED: "Type your child's nickname.",
    INVALID_INPUT: "Check what you entered and try again.",
  };

/** The first issue's code, or `INVALID_INPUT` for anything unexpected. */
export function firstErrorCode(error: z.ZodError): DeleteChildInputCode {
  const message = error.issues.at(0)?.message;
  return message && message in DELETE_CHILD_INPUT_MESSAGES
    ? (message as DeleteChildInputCode)
    : "INVALID_INPUT";
}

/**
 * Step 3's check that the right child is being deleted: the typed nickname must match
 * exactly, letter case included, after trimming spaces at either end (the use case's
 * Associated Information, team proposal 2026-11-19).
 */
export function nicknameMatches(typed: string, nickname: string): boolean {
  return typed.trim() === nickname;
}
