import { z } from "zod";

// One schema for the form and the action (§8.2.5). Both fields are trimmed and
// lowercased: usernames are stored that way and generated passwords are all lowercase,
// so a letter a tablet capitalizes still works (design/shlf.md, Key decisions).

export const CHILD_SIGN_IN_PROBLEMS = {
  USERNAME_REQUIRED: "Type your username.",
  PASSWORD_REQUIRED: "Type your password.",
  INVALID_CREDENTIALS:
    "That username or password isn’t right. Try again, or ask a grown-up.",
} as const;

export type ChildSignInProblem = keyof typeof CHILD_SIGN_IN_PROBLEMS;

/** An issue's message is the problem's code. */
const field = (missing: ChildSignInProblem, longest: number) =>
  z
    .string({ error: missing })
    .trim()
    .toLowerCase()
    .min(1, missing)
    // Longer than any account's, and it bounds what an anonymous caller makes us hash.
    .max(longest, "INVALID_CREDENTIALS");

export const childSignInSchema = z.object({
  username: field("USERNAME_REQUIRED", 20),
  password: field("PASSWORD_REQUIRED", 128),
});

export function childSignInProblem(error: z.ZodError): ChildSignInProblem {
  const code = error.issues[0]?.message ?? "";
  return Object.hasOwn(CHILD_SIGN_IN_PROBLEMS, code)
    ? (code as ChildSignInProblem)
    : "INVALID_CREDENTIALS";
}
