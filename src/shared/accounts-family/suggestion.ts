// The parent suggestion's fixed values (UC-PAR-suggest-book step 2, 3b; design/par.md).
// Pure: the form's counter, the action's zod schema and the `parentSuggestions`
// validator all read this, so a changed limit changes in one place.

/** The note's maximum length after trimming, the parent note's limit (§8.2.5). */
export const SUGGESTION_NOTE_MAX_LENGTH = 250;
