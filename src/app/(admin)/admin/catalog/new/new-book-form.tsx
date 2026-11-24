"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type SubmitEvent } from "react";
import {
  ageWarning,
  buildNewBookSchema,
  newBookErrorMessage,
  newBookErrorOf,
  type NewBookField,
} from "@/shared/catalog/new-book-schema";
import {
  FORMATS,
  GENRES,
  LENGTHS,
  MOODS,
  READING_CHALLENGES,
  SUBJECTS,
  TAG_LISTS,
} from "@/shared/catalog/tags";
import { addCatalogBook } from "./actions";
import styles from "./new-book.module.css";

const CATALOG_PATH = "/admin/catalog";

type FormState = {
  title: string;
  author: string;
  year: string;
  isbn: string;
  noIsbn: boolean;
  genres: string[];
  subjects: string[];
  moods: string[];
  format: string;
  length: string;
  ageMin: string;
  ageMax: string;
  readingChallenge: string;
  readingLevel: string;
  customTags: string;
};

const EMPTY: FormState = {
  title: "",
  author: "",
  year: "",
  isbn: "",
  noIsbn: false,
  genres: [],
  subjects: [],
  moods: [],
  format: "",
  length: "",
  ageMin: "",
  ageMax: "",
  readingChallenge: "",
  readingLevel: "",
  customTags: "",
};

const splitTags = (text: string) =>
  text.split(",").filter((tag) => tag.trim() !== "");

function toInput(form: FormState) {
  return { ...form, customTags: splitTags(form.customTags) };
}

export function NewBookForm({
  existingCustomTags,
}: {
  existingCustomTags: string[];
}) {
  const inFlight = useRef(false);
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [fieldError, setFieldError] = useState<{
    field: NewBookField;
    message: string;
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };
  const toggle = (field: "genres" | "subjects" | "moods", value: string) => {
    setForm((current) => ({
      ...current,
      [field]: current[field].includes(value)
        ? current[field].filter((entry) => entry !== value)
        : [...current[field], value],
    }));
  };

  const errorFor = (field: NewBookField) =>
    fieldError?.field === field ? (
      <p id={`${field}-error`} className={styles.error}>
        {fieldError.message}
      </p>
    ) : null;
  const invalid = (field: NewBookField) =>
    fieldError?.field === field
      ? { "aria-invalid": true, "aria-describedby": `${field}-error` }
      : {};

  const min = form.ageMin.trim() === "" ? NaN : Number(form.ageMin);
  const max = form.ageMax.trim() === "" ? NaN : Number(form.ageMax);
  const warning =
    Number.isInteger(min) && Number.isInteger(max)
      ? ageWarning(min, max)
      : null; // 4i: a warning, never an error

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    setSubmitError(null);
    const input = toInput(form);
    // An early check only: the server's check is the one that counts (§8.2.5).
    const parsed = buildNewBookSchema({
      tags: TAG_LISTS,
      now: new Date(),
    }).safeParse(input);
    if (!parsed.success) {
      const { code, field } = newBookErrorOf(parsed.error);
      setFieldError({ field, message: newBookErrorMessage(code, field) });
      return;
    }
    setFieldError(null);
    inFlight.current = true;
    setSubmitting(true);
    try {
      const result = await addCatalogBook(input);
      if (result.ok) {
        router.push(CATALOG_PATH); // step 7
        return;
      }
      inFlight.current = false;
      // 5a and 6a: every entry stays in the form.
      setSubmitError(
        result.error.errorId
          ? `${result.error.message} (Error ID: ${result.error.errorId})`
          : result.error.message,
      );
    } catch {
      inFlight.current = false;
      setSubmitError(
        "We couldn't save the book. Nothing was saved. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const checks = (
    field: "genres" | "subjects" | "moods",
    values: readonly string[],
  ) => (
    <div className={styles.checks}>
      {values.map((value) => (
        <label key={value}>
          <input
            type="checkbox"
            checked={form[field].includes(value)}
            onChange={() => {
              toggle(field, value);
            }}
          />
          {value}
        </label>
      ))}
    </div>
  );
  const select = (
    field: "format" | "length" | "readingChallenge",
    label: string,
    values: readonly string[],
  ) => (
    <>
      <label>
        {label}
        <select
          value={form[field]}
          onChange={(e) => {
            set(field, e.target.value);
          }}
          {...invalid(field)}
        >
          <option value="">Choose one</option>
          {values.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      {errorFor(field)}
    </>
  );
  const text = (field: keyof FormState & NewBookField, label: string) => (
    <>
      <label>
        {label}
        <input
          value={form[field]}
          onChange={(e) => {
            set(field, e.target.value);
          }}
          autoComplete="off"
          {...invalid(field)}
        />
      </label>
      {errorFor(field)}
    </>
  );

  return (
    <form
      onSubmit={(event) => {
        void onSubmit(event);
      }}
      noValidate
      className={styles.form}
    >
      <p className={styles.brand}>BookBuddies</p>
      <h1>Add a book</h1>
      <p className={styles.intro}>
        The book is saved as a draft. It is not recommended until it is
        published.
      </p>

      {text("title", "Title")}
      {text("author", "Author")}
      {text("year", "Year published")}

      <label>
        ISBN
        <input
          value={form.isbn}
          onChange={(e) => {
            set("isbn", e.target.value);
          }}
          autoComplete="off"
          {...invalid("isbn")}
        />
      </label>
      <label className={styles.inline}>
        <input
          type="checkbox"
          checked={form.noIsbn}
          onChange={(e) => {
            set("noIsbn", e.target.checked);
          }}
        />
        This book has no ISBN
      </label>
      {errorFor("isbn")}

      <fieldset>
        <legend>Genre</legend>
        {checks("genres", GENRES)}
        {errorFor("genres")}
      </fieldset>

      <fieldset>
        <legend>Subjects (optional)</legend>
        {checks("subjects", SUBJECTS)}
        {errorFor("subjects")}
      </fieldset>

      <fieldset>
        <legend>Mood</legend>
        {checks("moods", MOODS)}
        {errorFor("moods")}
      </fieldset>

      {select("format", "Format", FORMATS)}
      {select("length", "Length", LENGTHS)}
      {text("ageMin", "Suggested age min")}
      {text("ageMax", "Suggested age max")}
      {warning ? (
        <p className={styles.warning} role="status">
          {warning}
        </p>
      ) : null}
      {select("readingChallenge", "Reading challenge", READING_CHALLENGES)}
      {text("readingLevel", "Reading level (optional)")}
      {text("customTags", "Custom tags (optional, separated by commas)")}
      {existingCustomTags.length > 0 ? (
        <p className={styles.hint}>
          Existing custom tags: {existingCustomTags.join(", ")}
        </p>
      ) : null}

      {submitError ? (
        <p className={styles.error} role="alert">
          {submitError}
        </p>
      ) : null}

      <div className={styles.actions}>
        <button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Save book"}
        </button>
        <Link href={CATALOG_PATH}>Cancel</Link>
      </div>
    </form>
  );
}
