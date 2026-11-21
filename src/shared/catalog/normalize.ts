// Pure normalization for catalog books (design/adm.md, Key decisions). The browser, the
// addCatalogBook action and the catalog import script all call these same functions, so
// one book can never be keyed two ways. No server, database, clock or Node-only imports.

/**
 * Folds one piece of text for duplicate matching: NFKC, lower case, accents removed,
 * punctuation removed, each run of whitespace one space, trimmed.
 */
export function normalizeText(text: string): string {
  return (
    text
      .normalize("NFKC")
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/\s+/gu, " ")
      // Control characters go too, so U+001F can never appear inside a key part.
      .replace(/[\p{P}\p{Cc}]/gu, "")
      .replace(/\s+/gu, " ")
      .trim()
  );
}

/** U+001F, the unit separator: no entered text contains it, so keys cannot collide. */
const KEY_SEPARATOR = "\u001f";

/** The key the unique `matchKey` index uses: normalized title and author (5a). */
export function buildMatchKey(title: string, author: string): string {
  return `${normalizeText(title)}${KEY_SEPARATOR}${normalizeText(author)}`;
}

/** A custom tag: trimmed, spaces collapsed, lower case. No plural merging. May be empty. */
export function normalizeCustomTag(tag: string): string {
  return tag.normalize("NFKC").replace(/\s+/gu, " ").trim().toLowerCase();
}

function isbn13CheckDigit(first12: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++)
    sum += Number(first12[i]) * (i % 2 === 0 ? 1 : 3);
  return (10 - (sum % 10)) % 10;
}

function isValidIsbn10(isbn10: string): boolean {
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const char = isbn10[i];
    sum += (char === "X" ? 10 : Number(char)) * (10 - i);
  }
  return sum % 11 === 0;
}

/**
 * Returns the ISBN-13 digits for a valid ISBN-10 or ISBN-13 (hyphens and spaces
 * ignored, an X counts as 10 in an ISBN-10), or null when the input is not a valid ISBN.
 * An ISBN-10 is converted with the 978 prefix and a recomputed check digit.
 */
export function normalizeIsbn(input: string): string | null {
  const text = input.replace(/[\s-]/gu, "").toUpperCase();
  if (/^\d{13}$/.test(text)) {
    const isIsbnPrefix = text.startsWith("978") || text.startsWith("979");
    return isIsbnPrefix &&
      isbn13CheckDigit(text.slice(0, 12)) === Number(text[12])
      ? text
      : null;
  }
  if (/^\d{9}[\dX]$/.test(text) && isValidIsbn10(text)) {
    const first12 = `978${text.slice(0, 9)}`;
    return `${first12}${String(isbn13CheckDigit(first12))}`;
  }
  return null;
}
