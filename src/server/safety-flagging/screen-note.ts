import "server-only";
import { WORD_LIST, WORD_LIST_VERSION, type WordListEntry } from "./word-list";

export type Passage = { start: number; end: number; category: string };
export type ScreenResult =
  | { state: "none"; passages: Passage[]; version: string }
  | { state: "flagged"; passages: Passage[]; version: string };

/** UTF-16 offsets refer to the trimmed stored text; no note is sent outside the app. */
export function screenNote(
  text: string,
  entries: readonly WordListEntry[] = WORD_LIST,
  version: string = WORD_LIST_VERSION,
): ScreenResult {
  // The team has not supplied a real list. Do not label unscreened text as clean.
  if (entries.length === 0) throw new Error("Word list is not configured");
  const passages: Passage[] = [];
  for (const entry of entries) {
    if (!entry.word.trim()) throw new Error("Invalid word-list entry");
    const escaped = entry.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(
      `(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`,
      "giu",
    );
    for (const match of text.matchAll(pattern)) {
      passages.push({
        start: match.index,
        end: match.index + match[0].length,
        category: entry.category,
      });
    }
  }
  passages.sort((a, b) => a.start - b.start || a.end - b.end);
  return { state: passages.length ? "flagged" : "none", passages, version };
}
