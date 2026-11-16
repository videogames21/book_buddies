"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type SubmitEvent } from "react";
import { AVATAR_KEYS, avatarSrc } from "@/server/accounts-family/avatars";
import { GRADES } from "@/server/accounts-family/grades";
import type { CreatedChild } from "@/server/accounts-family/child-accounts";
import { createChildAccount } from "./actions";
import {
  createChildSchema,
  fieldErrorsOf,
  READING_LEVEL_SCALES,
  TARGET_AGE,
  VALIDATION_MESSAGES,
  type CreateChildField,
  type FieldErrors,
  type ReadingLevelScale,
} from "./schema";
import styles from "./new-child.module.css";

// Where the parent goes next. These belong to use cases not built yet; placeholders
// until they are designed (design/par.md, Open questions).
const DASHBOARD_PATH = "/parent";
const readingProfilePath = (childId: string) =>
  `/parent/children/${childId}/reading-profile`; // UC-REC-kid-onboarding

// 4e: outside resources for a parent unsure of the reading level. The system never estimates one.
const REFERRAL_LINKS = [
  { label: "AR BookFinder", href: "https://www.arbookfind.com/" },
  {
    label: "Scholastic Book Wizard",
    href: "https://www.scholastic.com/teachers/bookwizard/",
  },
];

type FormState = {
  nickname: string;
  age: string;
  grade: string;
  username: string;
  readingLevelScale: ReadingLevelScale | "";
  readingLevelValue: string;
  avatar: string;
  note: string;
};

const EMPTY: FormState = {
  nickname: "",
  age: "",
  grade: "",
  username: "",
  readingLevelScale: "",
  readingLevelValue: "",
  avatar: "",
  note: "",
};

function toInput(form: FormState) {
  return {
    nickname: form.nickname,
    age: form.age.trim() === "" ? undefined : Number(form.age),
    grade: form.grade,
    username: form.username,
    readingLevel: form.readingLevelScale
      ? { scale: form.readingLevelScale, value: form.readingLevelValue }
      : undefined,
    avatar: form.avatar,
    note: form.note,
  };
}

export function NewChildForm({
  privacyNoticeUrl,
}: {
  privacyNoticeUrl: string;
}) {
  const inFlight = useRef(false);
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<CreatedChild | null>(null);
  const [usernameTaken, setUsernameTaken] = useState<string | null>(null);

  const set = (field: keyof FormState) => (value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const age = Number(form.age);
  const ageWarning =
    form.age.trim() !== "" &&
    Number.isInteger(age) &&
    (age < TARGET_AGE.min || age > TARGET_AGE.max);

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    setSubmitError(null);
    const input = toInput(form);
    const parsed = createChildSchema.safeParse(input);
    if (!parsed.success) {
      setErrors(fieldErrorsOf(parsed.error));
      return;
    }
    setErrors({});
    inFlight.current = true;
    setSubmitting(true);
    try {
      const result = await createChildAccount(input);
      if (result.ok) {
        setCreated(result.data);
        return;
      }
      inFlight.current = false;
      const code = result.error.code;
      if (code === "USERNAME_TAKEN") {
        setUsernameTaken(result.error.message); // 4g, shown inline under the username
      } else if (code in VALIDATION_MESSAGES) {
        setErrors(
          fieldErrorsFromCode(code as keyof typeof VALIDATION_MESSAGES),
        );
      } else {
        setSubmitError(
          result.error.errorId
            ? `${result.error.message} (Error ID: ${result.error.errorId})`
            : result.error.message,
        );
      }
    } catch {
      inFlight.current = false;
      setSubmitError(
        "The account may have been created, but we didn't receive its password. The password cannot be recovered on this page. Contact the team before trying again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    // Step 7. The password lives only in this component's state; it is not stored,
    // put in a URL or fetched again (7a).
    return (
      <section className={styles.form} aria-labelledby="credentials-heading">
        <h1 id="credentials-heading">Account created</h1>
        <dl className={styles.credentials}>
          <dt>Username</dt>
          <dd data-testid="child-username">{created.username}</dd>
          <dt>Password</dt>
          <dd data-testid="child-password">{created.password}</dd>
        </dl>
        <p>
          <strong>Tell your child to log in with these credentials.</strong>{" "}
          Write them down now: the password is shown only once.
        </p>
        <button
          type="button"
          onClick={() => {
            router.push(readingProfilePath(created.childId));
          }}
        >
          I&apos;ve noted them, continue
        </button>
      </section>
    );
  }

  const fieldError = (field: CreateChildField) => {
    const code = errors[field];
    const message =
      field === "username" && usernameTaken
        ? usernameTaken
        : code && VALIDATION_MESSAGES[code];
    return message ? (
      <p id={`${field}-error`} className={styles.error}>
        {message}
      </p>
    ) : null;
  };
  const invalid = (field: CreateChildField) =>
    errors[field] || (field === "username" && usernameTaken)
      ? { "aria-invalid": true, "aria-describedby": `${field}-error` }
      : {};

  return (
    <form
      onSubmit={(event) => {
        void onSubmit(event);
      }}
      noValidate
      className={styles.form}
    >
      <p className={styles.brand}>BookBuddies</p>
      <h1>Add a child</h1>
      <p className={styles.intro}>
        Create an account and save your child’s sign-in details.
      </p>
      <p className={styles.notice}>
        Read the{" "}
        <a href={privacyNoticeUrl} target="_blank" rel="noopener noreferrer">
          privacy notice
        </a>{" "}
        before creating an account.
      </p>

      <label>
        Nickname (what your child is shown as)
        <input
          value={form.nickname}
          onChange={(e) => {
            set("nickname")(e.target.value);
          }}
          maxLength={20}
          autoComplete="off"
          {...invalid("nickname")}
        />
      </label>
      {fieldError("nickname")}
      <p className={styles.hint}>
        Use a nickname, never your child’s real name.
      </p>

      <label>
        Age
        <input
          type="number"
          inputMode="numeric"
          value={form.age}
          onChange={(e) => {
            set("age")(e.target.value);
          }}
          {...invalid("age")}
        />
      </label>
      {fieldError("age")}
      {ageWarning && !errors.age ? (
        <p className={styles.warning} role="status">
          BookBuddies is made for children aged {TARGET_AGE.min}–
          {TARGET_AGE.max}. You can still add this child.
        </p>
      ) : null}

      <label>
        Grade
        <select
          value={form.grade}
          onChange={(e) => {
            set("grade")(e.target.value);
          }}
          {...invalid("grade")}
        >
          <option value="">Choose a grade</option>
          {GRADES.map((grade) => (
            <option key={grade} value={grade}>
              {grade === "pre-school"
                ? "Pre-school and under"
                : grade === "kindergarten"
                  ? "Kindergarten"
                  : `Grade ${grade}`}
            </option>
          ))}
        </select>
      </label>
      {fieldError("grade")}

      <label>
        Username (your child signs in with this)
        <input
          value={form.username}
          onChange={(e) => {
            setUsernameTaken(null);
            set("username")(e.target.value);
          }}
          autoComplete="off"
          {...invalid("username")}
        />
      </label>
      {fieldError("username")}
      <p className={styles.hint}>
        Use 3–20 letters, numbers or underscores. Leave out real names, contact
        information and the nickname.
      </p>

      <fieldset>
        <legend>Reading level (optional)</legend>
        <label>
          Scale
          <select
            value={form.readingLevelScale}
            onChange={(e) => {
              set("readingLevelScale")(e.target.value);
            }}
            {...invalid("readingLevel")}
          >
            <option value="">I&apos;ll skip this</option>
            {Object.entries(READING_LEVEL_SCALES).map(([key, scale]) => (
              <option key={key} value={key}>
                {scale.label}
              </option>
            ))}
          </select>
        </label>
        {form.readingLevelScale ? (
          <label>
            Level ({READING_LEVEL_SCALES[form.readingLevelScale].format})
            <input
              value={form.readingLevelValue}
              onChange={(e) => {
                set("readingLevelValue")(e.target.value);
              }}
              {...invalid("readingLevel")}
            />
          </label>
        ) : null}
        {fieldError("readingLevel")}
        <p className={styles.hint}>
          Not sure? These sites can help you find it:{" "}
          {REFERRAL_LINKS.map((link, i) => (
            <span key={link.href}>
              {i > 0 ? ", " : ""}
              <a href={link.href} target="_blank" rel="noopener noreferrer">
                {link.label}
              </a>
            </span>
          ))}
          .
        </p>
      </fieldset>

      <label>
        Parent note (optional)
        <textarea
          value={form.note}
          onChange={(e) => {
            set("note")(e.target.value);
          }}
          rows={4}
          aria-describedby="note-prompt note-count"
          {...invalid("note")}
        />
      </label>
      <p id="note-prompt" className={styles.hint}>
        Share anything that may help BookBuddies better understand your child's
        reading interests and provide more relevant recommendations. Please do
        not include personal, identifying, sensitive, or confidential
        information, such as full names, school names, addresses, or contact
        information.
      </p>
      <p id="note-count" className={styles.hint}>
        {Array.from(form.note.trim()).length} / 250 characters
      </p>
      {fieldError("note")}

      <fieldset>
        <legend>Choose a character</legend>
        <div
          className={styles.avatars}
          role="radiogroup"
          {...invalid("avatar")}
        >
          {AVATAR_KEYS.map((key) => (
            <label key={key} className={styles.avatar}>
              <input
                type="radio"
                name="avatar"
                value={key}
                checked={form.avatar === key}
                onChange={() => {
                  set("avatar")(key);
                }}
              />
              <Image
                src={avatarSrc(key)}
                alt={`Avatar ${key}`}
                width={72}
                height={72}
              />
            </label>
          ))}
        </div>
        {fieldError("avatar")}
      </fieldset>

      {submitError ? (
        <p className={styles.error} role="alert">
          {submitError}
        </p>
      ) : null}

      <div className={styles.actions}>
        <button type="submit" disabled={submitting}>
          {submitting ? "Creating…" : "Create account"}
        </button>
        <Link href={DASHBOARD_PATH}>Cancel</Link>
      </div>
    </form>
  );
}

function fieldErrorsFromCode(
  code: keyof typeof VALIDATION_MESSAGES,
): FieldErrors {
  const field: Record<keyof typeof VALIDATION_MESSAGES, CreateChildField> = {
    NICKNAME_REQUIRED: "nickname",
    INVALID_NICKNAME: "nickname",
    USERNAME_CONTAINS_NICKNAME: "username",
    NOTE_TOO_LONG: "note",
    INVALID_AGE: "age",
    INVALID_GRADE: "grade",
    USERNAME_REQUIRED: "username",
    INVALID_USERNAME: "username",
    INVALID_READING_LEVEL: "readingLevel",
    INVALID_AVATAR: "avatar",
  };
  return { [field[code]]: code };
}
