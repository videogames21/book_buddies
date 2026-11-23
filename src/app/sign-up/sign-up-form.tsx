"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type SubmitEvent } from "react";
import type { ConsentNoticeSection } from "@/server/accounts-family/consent-notice";
import {
  CHECK_EMAIL_PATH,
  FORGOT_PASSWORD_PATH,
  NOT_SENT_FLAG,
  SIGN_IN_PATH,
} from "@/app/(parent)/parent/onboarding/paths";
import { signUpParent } from "./actions";
import {
  EMAIL_MAX,
  fieldErrorsOf,
  NAME_MAX,
  PASSWORD_MAX,
  signUpSchema,
  VALIDATION_MESSAGES,
  type FieldErrors,
  type SignUpField,
  type ValidationErrorCode,
} from "./schema";
import base from "@/app/(parent)/parent/children/new/new-child.module.css";
import own from "./sign-up.module.css";

const styles = { ...base, ...own };

const FIELD_OF_CODE: Record<ValidationErrorCode, SignUpField> = {
  NAME_REQUIRED: "name",
  INVALID_NAME: "name",
  INVALID_EMAIL: "email",
  WEAK_PASSWORD: "password",
  CONSENT_NOT_ACKNOWLEDGED: "acknowledged",
};

export function SignUpForm({
  notice,
  noticeVersion,
  privacyNoticeUrl,
}: {
  notice: ConsentNoticeSection[];
  noticeVersion: string;
  privacyNoticeUrl: string;
}) {
  const router = useRouter();
  const inFlight = useRef(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Never pre-checked (FR-ACCT-consent).
  const [acknowledged, setAcknowledged] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [emailTaken, setEmailTaken] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    setSubmitError(null);
    setEmailTaken(false);
    const input = { name, email, password, acknowledged };
    const parsed = signUpSchema.safeParse(input);
    if (!parsed.success) {
      setErrors(fieldErrorsOf(parsed.error)); // 3b, 4b, 4c inline
      return;
    }
    setErrors({});
    inFlight.current = true;
    setSubmitting(true);
    try {
      const result = await signUpParent(input);
      if (result.ok) {
        router.push(
          result.data.emailSent
            ? CHECK_EMAIL_PATH
            : `${CHECK_EMAIL_PATH}?${NOT_SENT_FLAG}=1`, // 5b
        );
        return;
      }
      inFlight.current = false;
      const code = result.error.code;
      if (code === "EMAIL_TAKEN") {
        setEmailTaken(true); // 4a
      } else if (code in VALIDATION_MESSAGES) {
        const validation = code as ValidationErrorCode;
        setErrors({ [FIELD_OF_CODE[validation]]: validation });
      } else {
        setSubmitError(
          result.error.errorId
            ? `${result.error.message} (Error ID: ${result.error.errorId})`
            : result.error.message,
        );
      }
    } catch {
      inFlight.current = false;
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const errorFor = (field: SignUpField) => {
    const code = errors[field];
    return code ? (
      <p id={`${field}-error`} className={styles.error}>
        {VALIDATION_MESSAGES[code]}
      </p>
    ) : null;
  };

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={(event) => {
        void onSubmit(event);
      }}
    >
      <p className={styles.brand}>BOOKBUDDIES</p>
      <h1>Create your parent account</h1>

      <label>
        Your name
        <input
          name="name"
          autoComplete="name"
          maxLength={NAME_MAX}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
          }}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? "name-error" : undefined}
        />
      </label>
      {errorFor("name")}

      <label>
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          maxLength={EMAIL_MAX}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
          }}
          aria-invalid={errors.email || emailTaken ? true : undefined}
          aria-describedby={
            errors.email || emailTaken ? "email-error" : undefined
          }
        />
      </label>
      {errorFor("email")}
      {emailTaken && (
        <p id="email-error" className={styles.error}>
          An account already uses this email.{" "}
          <Link href={SIGN_IN_PATH}>Sign in</Link> or{" "}
          <Link href={FORGOT_PASSWORD_PATH}>reset your password</Link>.
        </p>
      )}

      <label>
        Password
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          maxLength={PASSWORD_MAX}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
          }}
          aria-invalid={errors.password ? true : undefined}
          aria-describedby="password-hint"
        />
      </label>
      <p id="password-hint" className={styles.hint}>
        At least 8 characters. A short sentence is easy to remember.
      </p>
      {errorFor("password")}

      <section
        className={styles.consent}
        aria-labelledby="consent-heading"
        data-testid="consent-notice"
      >
        <h2 id="consent-heading">Consent notice</h2>
        {notice.map((section) => (
          <div key={section.heading}>
            <h3>{section.heading}</h3>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        ))}
        <p className={styles.hint}>
          Notice version{" "}
          <span data-testid="notice-version">{noticeVersion}</span>. Read our
          full{" "}
          <a href={privacyNoticeUrl} target="_blank" rel="noopener noreferrer">
            privacy notice
          </a>
          .
        </p>
      </section>

      <label className={styles.checkbox}>
        <input
          name="acknowledged"
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => {
            setAcknowledged(e.target.checked);
          }}
          aria-invalid={errors.acknowledged ? true : undefined}
        />
        I am the parent or guardian, I have read the consent notice, and I
        consent.
      </label>
      {errorFor("acknowledged")}

      {submitError && (
        <p role="alert" className={styles.error}>
          {submitError}
        </p>
      )}
      <button type="submit" disabled={submitting}>
        {submitting ? "Creating your account…" : "Create Account"}
      </button>
      <p className={styles.hint}>
        Already have an account? <Link href={SIGN_IN_PATH}>Sign in</Link>.
      </p>
    </form>
  );
}
