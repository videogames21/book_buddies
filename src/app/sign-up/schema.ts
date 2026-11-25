import { z } from "zod";

// The one schema for the sign-up form and the signUpParent action (§8.2.5). The values
// are the tables in design/par-field-values.md. Each issue's message is the error code
// the API contract names (design/par.md).

export type SignUpField = "name" | "email" | "password" | "acknowledged";

export type ValidationErrorCode =
  | "NAME_REQUIRED"
  | "INVALID_NAME"
  | "INVALID_EMAIL"
  | "WEAK_PASSWORD"
  | "CONSENT_NOT_ACKNOWLEDGED";

export const NAME_MAX = 100;
export const EMAIL_MAX = 254;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;
const NOTICE_VERSION_MAX = 100;

export const signUpSchema = z
  .object({
    name: z
      .string({ error: "NAME_REQUIRED" })
      .trim()
      .min(1, { error: "NAME_REQUIRED" })
      .max(NAME_MAX, { error: "INVALID_NAME" }),
    email: z
      .string({ error: "INVALID_EMAIL" })
      .trim()
      .toLowerCase()
      .max(EMAIL_MAX, { error: "INVALID_EMAIL" })
      .pipe(z.email({ error: "INVALID_EMAIL" })),
    // NIST-style: length only, no character-class rules (4c).
    password: z
      .string({ error: "WEAK_PASSWORD" })
      .min(PASSWORD_MIN, { error: "WEAK_PASSWORD" })
      .max(PASSWORD_MAX, { error: "WEAK_PASSWORD" }),
    // 3b: the literal true only; a pre-checked or missing box is no consent.
    acknowledged: z.literal(true, { error: "CONSENT_NOT_ACKNOWLEDGED" }),
    // The notice version the page showed; createFamily compares it with the current
    // one (3b). Not a form field, so a bad value is INVALID_INPUT.
    noticeVersion: z.string().min(1).max(NOTICE_VERSION_MAX),
  })
  .refine(
    (input) => input.password.toLowerCase() !== input.email.toLowerCase(),
    { path: ["password"], error: "WEAK_PASSWORD" },
  );

export type SignUpInput = z.infer<typeof signUpSchema>;

export const VALIDATION_MESSAGES: Record<ValidationErrorCode, string> = {
  NAME_REQUIRED: "Enter your name.",
  INVALID_NAME: `Keep your name to ${String(NAME_MAX)} characters or fewer.`,
  INVALID_EMAIL: "Enter a valid email address.",
  WEAK_PASSWORD: `Use ${String(PASSWORD_MIN)} to ${String(PASSWORD_MAX)} characters, and not your email address.`,
  CONSENT_NOT_ACKNOWLEDGED:
    "Please read the consent notice and tick the box to continue.",
};

const FORM_ORDER: SignUpField[] = ["name", "email", "password", "acknowledged"];

export type FieldErrors = Partial<Record<SignUpField, ValidationErrorCode>>;

export function fieldErrorsOf(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as SignUpField | undefined;
    if (field && !errors[field] && issue.message in VALIDATION_MESSAGES)
      errors[field] = issue.message as ValidationErrorCode;
  }
  return errors;
}

/** The first failing field in form order, which the action returns. */
export function firstErrorOf(error: z.ZodError): ValidationErrorCode | null {
  const errors = fieldErrorsOf(error);
  for (const field of FORM_ORDER) {
    const code = errors[field];
    if (code) return code;
  }
  return null;
}
