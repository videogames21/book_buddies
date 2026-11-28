# REC field values

**Area:** `UC-REC-kid-onboarding`, `UC-REC-recommend-quiz-rules`, `UC-REC-parent-review` · **Design:** [rec.md](rec.md)

Values the design could not invent (`DI-field-tables`). The team fills each table in; nothing below is decided. `/implement` builds `src/server/recommendation/interests.ts` and the book cap from these tables and from nothing else. When a table is filled, update the use case's data table to match.

## Reading-interest options (step 2, step 3)

A fixed list the parent picks from; no free text (`BR-child-structured-responses`). Proposed from the Genre values actually used in `BookBuddies_Seed_Catalog.xlsx` (134 books), so every option matches catalog books. The glossary's suggestion "funny" is left out because no seed book carries it as a genre; add it only together with a catalog tag. These are only suggestions.

| Option key          | Label shown to the parent | Matching catalog tag (optional) |
|---------------------|---------------------------|---------------------------------|
| `realistic-fiction` | Everyday life stories     | realistic fiction               |
| `fantasy`           | Fantasy and magic         | fantasy                         |
| `animals`           | Animal stories            | animal story                    |
| `adventure`         | Adventure                 | adventure                       |
| `mystery`           | Mystery                   | mystery                         |
| `non-fiction`       | True stories and facts    | non-fiction                     |

Note: 5 seed books have no Genre; tag them before import.

## Favorite books (step 4)

| Rule                             | Value                                                                           |
|----------------------------------|---------------------------------------------------------------------------------|
| Maximum number of favorite books | (proposed: 10)                                                                  |
| Book fields shown in the picker  | (proposed: title and author) (`PickerBook = { id, title, author }` in `rec.md`) |

## Rules quiz proposal (OI-2)

These values are proposed for `UC-REC-recommend-quiz-rules`. The team and client still need to confirm them under `OI-2`.

| Question | Buttons and catalog values |
|---|---|
| What kind of story sounds good? | Funny (`funny/silly`), Exciting (`exciting`), Heartwarming (`heartwarming`), A little spooky (`spooky-but-safe`), Fascinating (`fascinating`), Calm (`calm`), Inspiring (`inspiring`), Any mood (`any`). |
| How long a book do you want? | A quick read (`quick read`), A longer story (`longer story`), Any length (`any`). |

The proposed maximum is six, held as one internal `OI-2` constant rather than a new environment variable. The quiz never shows that number to the child. One pending batch per child is enforced by a partial unique index; later requests acknowledge it rather than adding to the parent's queue. It stores `handoffDeadline = createdAt + BATCH_REVIEW_WINDOW_HOURS` (below) once using the shared clock and stays pending only until the parent confirms it or that deadline, whose bounded duration is stated in the privacy notice, whichever comes first; at the deadline it is released to the child, and its stored status leaves `pending` at the child's next quiz save or the next daily cleanup run (`rec.md`, `UC-REC-parent-review` 2a). Child-data/account deletion and the existing inactivity purge also remove it. REC adds no separate timer, and the real entry remains unavailable until the parent-review build exists.

`RECOMMENDER_MODE` is read through the validated server environment in `src/server/lib/config.ts`. Unset defaults to `rules` for V1. Startup parsing preserves unknown strings, and the server-only getter accepts exactly `rules`; `ai`, `off` and unknown values return `RULES_UNAVAILABLE`. The child never selects a mode.

### Ranking rules proposed for V1

Use three age-fit groups: **2** when actual age and grade-reference age are both inside the book's inclusive band; **1** when actual age is inside and grade reference is outside by at most one year, inclusive; **0** when actual age is inside and grade reference is farther away. The grade reference is preschool = 4, kindergarten = 5, and grades 1–12 = grade + 5. Rank higher groups first. Within a group, order by interest score descending, then `abs(age − (ageMin + ageMax) / 2)` ascending, then opaque book ID by deterministic code-unit/binary ordinal ascending, never locale collation. This keeps age and grade primary without making interests and history tie-break-only.

Catalog parses a clearly formatted annotation such as `740L (AR 5.1)` into `comparableLevels: { lexile?: 740, arAtos?: 5.1 }`. It returns no raw label and no custom tags. Within an age-fit group, a plain Lexile absolute difference `<= 100` or explicit AR/ATOS absolute difference `<= 1.0` adds one interest point. Compare only identical supported scales. Ignore estimates, nonstandard prefixes and ambiguous or unsupported values. Missing or incomparable scales add zero; no conversion or assessment is made.

Use the approved genre and subject values in [ADM field values](adm-field-values.md#standard-tag-lists-steps-2-4-4b) as the interest keys. Map onboarding options to their catalog genre; map Animals to both `animal story` and `animals`. Match notes against those fixed labels and the onboarding labels as whole phrases, case-insensitively, preferring the longest phrase at a given text position. De-duplicate recognized keys and take the first three in text order. Accounts & Family reads the latest retained `parentNotes` record with no `bookId` (the note from `UC-PAR-create-kid-account`) by `savedAt` descending, then note ID ascending, and contributes those keys. A finish note has a `bookId` (`UC-SHLF-par-finish-book`) and contributes zero until a typed read is designed (`OI-76`). Confirm whether the client wants richer interpretation under OI-2.

| Signal | Adjustment |
|---|---|
| Onboarding interest | +2 per mapped key. |
| Favorite book | +1 per matching genre/subject key for each distinct favorite. |
| Latest retained profile note (no `bookId`) | +1 per recognized key, up to three. |
| Comparable parent-entered level | +1 when scales and tolerances match; missing or incomparable levels add 0. |
| Latest reaction per book | Yes +2, Maybe Later +1 for its keys. Not interested in topic gives −2 for subjects, or genres when there are no subjects. Not my style gives −2 for genres. A difficulty/length decline gives +1 to the opposite length only. Other or no reason changes no tag weights. Any decline gives −2 to that exact book. |
| Latest retained shelf activity per book | +1 for its keys if the book is currently on the shelf or has a confirmed finish. |
| Latest confirmed rating per book | Loved it or Liked it gives +1 per key. It was okay gives 0. Not for me gives −1. |

For each book, choose the latest source record by source time descending, then source-record ID ascending. Read at most the 20 most recent distinct books from each of reactions, shelf history and ratings, ordered by source time descending and book ID ascending. Use active Catalog features only for cited history books.

For each candidate, de-duplicate its normalized genre/subject keys. Sum every listed onboarding, favorite, note, reaction, shelf and rating adjustment for each key, then take the arithmetic mean over the candidate's keys; a defensive empty-key fixture has base score 0. Sum qualifying length adjustments from the selected latest reactions: **Too easy/too short** gives +1 only to **longer story**, **Too hard/too long** gives +1 only to **quick read**, and other lengths get 0. Add those length adjustments, the exact-book decline adjustment (−2 when the candidate's selected latest reaction is a decline), and the 0/1 comparable-level point to get the interest score.

Worked example: a candidate has distinct keys `animals` and `cats`. Onboarding and the latest note give `animals` a total of 3; a favorite and a **Yes** reaction give `cats` a total of 3. Their mean is 3. One qualifying quick-read adjustment and one comparable-level point add 2, with no exact-book decline, for an interest score of 5. Boundary vectors are 99/100/101 Lexile points, 0.9/1.0/1.1 AR levels, half-point midpoints and exact ties.

A missing record or not-yet-designed source contributes zero; an error from an existing owner is `LOAD_FAILED`, never neutral. Use the source's retained records and apply its existing retention rules. Quiz answers do not change the saved reading profile or the derived interest profile.

## Batch review (`UC-REC-parent-review` 2a)

Decided by the developer, 2026-11-23, **provisional** until the client answers `OI-69`.

| Rule | Value |
|---|---|
| Review window, from the batch's creation to its release unchanged (`BATCH_REVIEW_WINDOW_HOURS`, stored on the batch as `handoffDeadline`) | 24 hours; the setting accepts 1 to 168 |
| Does opening the batch stop the clock? | No; the deadline applies whether or not the parent opened it |
