// Team-editable. Fill from the "Note word list" table in design/par-field-values.md.
// Raise WORD_LIST_VERSION whenever the list changes.

export type WordCategory = string; // narrowed to the agreed categories once the table is filled

export interface WordListEntry {
  word: string;
  category: WordCategory;
}

export const WORD_LIST: readonly WordListEntry[] = [];

export const WORD_LIST_VERSION = "0";
