import "server-only";
import type { Db } from "mongodb";
import { ensureCollection } from "@/server/lib/collections";
import { SUGGESTION_NOTE_MAX_LENGTH } from "@/shared/accounts-family/suggestion";

// The schema of Accounts & Family's `parentSuggestions` (UC-PAR-suggest-book;
// design/par.md, Data model). Kept apart from suggestions.ts so the index setup script,
// which runs outside Next.js, does not load the session code that module depends on (as
// book-report-schema.ts does).

export const PARENT_SUGGESTIONS = "parentSuggestions";

/**
 * One pending suggestion per child and book (4a). Only pending suggestions are ever
 * stored, since every end of a suggestion's purpose deletes it, so a full index is the
 * "one pending suggestion" rule (design/par.md, Key decisions).
 */
export const SUGGESTION_UNIQUE_INDEX = "childId_bookId_unique";

export async function ensureParentSuggestionIndexes(db: Db): Promise<void> {
  // No status, deadline (OI-67), parent ID or copied book data.
  await ensureCollection(db, PARENT_SUGGESTIONS, {
    bsonType: "object",
    required: ["_id", "childId", "bookId", "suggestedAt"],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      childId: { bsonType: "string", minLength: 1 },
      bookId: { bsonType: "string", minLength: 1 },
      note: {
        bsonType: "string",
        minLength: 1,
        maxLength: SUGGESTION_NOTE_MAX_LENGTH,
      },
      suggestedAt: { bsonType: "date" },
    },
  });
  await db
    .collection(PARENT_SUGGESTIONS)
    .createIndex(
      { childId: 1, bookId: 1 },
      { unique: true, name: SUGGESTION_UNIQUE_INDEX },
    );
}
