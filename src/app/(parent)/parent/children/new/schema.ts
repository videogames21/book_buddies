import { z } from "zod";
import { AVATAR_KEYS } from "@/server/accounts-family/avatars";
import { GRADES, type Grade } from "@/server/accounts-family/grades";

// The one schema for the new child form and the createChildAccount action
// (architecture §8.2.5). The values come from UC-PAR-create-kid-account's data table.
// Each issue's message is the error code the API contract names (design/par.md).

export const READING_LEVEL_SCALES = {
  lexile: { label: "Lexile", format: "a number, optionally with BR before it and L after it, such as 650L or BR200L" },
  atos: { label: "AR / ATOS", format: "a number from 0.0 to 13.0, such as 3.5" },
  dra: { label: "DRA", format: "a letter A–Z or a number from 1 to 80" },
  grl: { label: "Guided Reading Level", format: "one letter A–Z" },
  gradeRange: { label: "Grade-level range", format: "two grades, such as 2–3 or K–1" },
} as const;

export type ReadingLevelScale = keyof typeof READING_LEVEL_SCALES;

const SCALE_KEYS = Object.keys(READING_LEVEL_SCALES) as [ReadingLevelScale, ...ReadingLevelScale[]];

/** The age range the form accepts without a warning (4b); outside it the form warns but still submits. */
export const TARGET_AGE = { min: 6, max: 11 } as const;

export function isReadingLevelValid(scale: ReadingLevelScale, value: string): boolean {
  switch (scale) {
    case "lexile":
      return /^(BR)?\d{1,4}L?$/i.test(value);
    case "atos":
      return /^\d{1,2}(\.\d)?$/.test(value) && Number(value) <= 13;
    case "dra":
      return /^[A-Z]$/i.test(value) || (/^\d{1,2}$/.test(value) && Number(value) >= 1 && Number(value) <= 80);
    case "grl":
      return /^[A-Z]$/i.test(value);
    case "gradeRange": {
      const match = /^(K|\d{1,2})\s*[-–]\s*(K|\d{1,2})$/i.exec(value);
      if (!match) return false;
      const from = GRADES.indexOf(match[1]!.toUpperCase() as Grade);
      const to = GRADES.indexOf(match[2]!.toUpperCase() as Grade);
      return from !== -1 && to !== -1 && from <= to;
    }
  }
}

export const createChildSchema = z
  .object({
    name: z.string({ error: "NAME_REQUIRED" }).trim().min(1, { error: "NAME_REQUIRED" }),
    nickname: z
      .string({ error: "NICKNAME_REQUIRED" })
      .trim()
      .min(1, { error: "NICKNAME_REQUIRED" })
      .max(20, { error: "INVALID_NICKNAME" }),
    age: z.number({ error: "INVALID_AGE" }).int({ error: "INVALID_AGE" }).min(3, { error: "INVALID_AGE" }).max(17, { error: "INVALID_AGE" }),
    grade: z.enum(GRADES, { error: "INVALID_GRADE" }),
    username: z
      .string({ error: "USERNAME_REQUIRED" })
      .trim()
      .toLowerCase()
      .min(1, { error: "USERNAME_REQUIRED" })
      .regex(/^[a-z0-9_]{3,20}$/, { error: "INVALID_USERNAME" }),
    readingLevel: z
      .object(
        {
          scale: z.enum(SCALE_KEYS, { error: "INVALID_READING_LEVEL" }),
          value: z.string({ error: "INVALID_READING_LEVEL" }).trim(),
        },
        { error: "INVALID_READING_LEVEL" },
      )
      .refine((level) => isReadingLevelValid(level.scale, level.value), { error: "INVALID_READING_LEVEL" })
      .optional(),
    avatar: z.enum(AVATAR_KEYS, { error: "INVALID_AVATAR" }),
  })
  .refine((child) => child.nickname.toLowerCase() !== child.name.toLowerCase(), {
    error: "NICKNAME_MATCHES_NAME",
    path: ["nickname"],
  });

export type CreateChildInput = z.infer<typeof createChildSchema>;
export type CreateChildField = keyof CreateChildInput;

export type ValidationErrorCode =
  | "NAME_REQUIRED"
  | "NICKNAME_REQUIRED"
  | "INVALID_NICKNAME"
  | "NICKNAME_MATCHES_NAME"
  | "INVALID_AGE"
  | "INVALID_GRADE"
  | "USERNAME_REQUIRED"
  | "INVALID_USERNAME"
  | "INVALID_READING_LEVEL"
  | "INVALID_AVATAR";

export const VALIDATION_MESSAGES: Record<ValidationErrorCode, string> = {
  NAME_REQUIRED: "Enter your child's name.",
  NICKNAME_REQUIRED: "Enter a nickname for your child.",
  INVALID_NICKNAME: "The nickname can be at most 20 characters.",
  NICKNAME_MATCHES_NAME: "The nickname must be different from your child's name, so it does not show their real name.",
  INVALID_AGE: "Enter your child's age as a whole number from 3 to 17.",
  INVALID_GRADE: "Choose your child's grade.",
  USERNAME_REQUIRED: "Enter a username for your child.",
  INVALID_USERNAME: "The username must be 3–20 characters: letters, numbers and underscores only.",
  INVALID_READING_LEVEL: `Enter the reading level in one of these formats: ${Object.values(READING_LEVEL_SCALES)
    .map((scale) => `${scale.label}, ${scale.format}`)
    .join("; ")}. Or leave it blank.`,
  INVALID_AVATAR: "Choose an avatar.",
};

export type FieldErrors = Partial<Record<CreateChildField, ValidationErrorCode>>;

/** Every failing field with its code, first issue per field; the form shows them inline. */
export function fieldErrorsOf(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as CreateChildField | undefined;
    if (field && !errors[field]) errors[field] = issue.message as ValidationErrorCode;
  }
  return errors;
}
