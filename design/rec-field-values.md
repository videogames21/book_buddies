# REC field values

**Area:** `UC-REC-kid-onboarding`, `UC-REC-recommend-quiz-rules` · **Design:** [rec.md](rec.md)

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

The proposed maximum is six. The quiz never shows that number to the child. One pending batch per child is enforced by a partial unique index; later requests acknowledge it rather than adding to the parent's queue. It remains until parent review, child-data/account deletion or the existing inactivity purge, with no separate timer.

`RECOMMENDER_MODE` is read through the validated server environment in `src/server/lib/config.ts`. Unset defaults to `rules` for V1; `ai`, `off` and unknown values return `RULES_UNAVAILABLE`. The child never selects a mode.

### Ranking rules proposed for V1

Use three age-fit groups: **2** when actual age and grade-reference age are both inside the book's band; **1** when actual age is inside and grade reference is at most one year outside; **0** when actual age is inside and grade reference is farther away. The grade reference is preschool = 4, kindergarten = 5, and grades 1–12 = grade + 5. Rank higher groups first. Within a group, order by interest score descending, then actual-age distance from the band midpoint, then opaque book ID ascending. This keeps age and grade primary without making interests and history tie-break-only.

Catalog parses a clearly formatted annotation such as `740L (AR 5.1)` into `comparableLevels: { lexile?: 740, arAtos?: 5.1 }`. It returns no raw label and no custom tags. Within an age-fit group, a plain Lexile match within 100L or explicit AR/ATOS match within one level adds one interest point. Ignore estimates, nonstandard prefixes and ambiguous or unsupported values. Missing or incomparable scales add zero; no conversion or assessment is made.

Use the approved genre and subject values in [ADM field values](adm-field-values.md#standard-tag-lists-steps-2-4-4b) as the interest keys. Map onboarding options to their catalog genre; map Animals to both `animal story` and `animals`. Match notes against those fixed labels and the onboarding labels as phrases, case-insensitively, preferring the longest match. Accounts & Family reads the latest retained `parentNotes` record by `savedAt` and contributes up to three distinct recognized keys. That collection has no setup/finish discriminator, so none is inferred. A separate finish-note source is absent and contributes zero until its owning use case defines a typed read. Confirm whether the client wants richer interpretation under OI-2.

| Signal | Adjustment |
|---|---|
| Onboarding interest | +2 per mapped key. |
| Favorite book | +1 per matching genre/subject key for each distinct favorite. |
| Latest retained parent note | +1 per recognized key, up to three. |
| Comparable parent-entered level | +1 when scales and tolerances match; missing or incomparable levels add 0. |
| Latest reaction per book | Yes +2, Maybe Later +1 for its keys. Not interested in topic gives −2 for subjects, or genres when there are no subjects. Not my style gives −2 for genres. A difficulty/length decline gives +1 to the opposite length only. Other or no reason changes no tag weights. Any decline gives −2 to that exact book. |
| Latest retained shelf activity per book | +1 for its keys if the book is currently on the shelf or has a confirmed finish. |
| Latest confirmed rating per book | Loved it or Liked it gives +1 per key. It was okay gives 0. Not for me gives −1. |

Read at most the 20 most recent distinct books from each of reactions, shelf history and ratings, ordered by source time descending and book ID ascending. Use active Catalog features only for cited history books. For each candidate, average the totals for its distinct genre and subject keys. Add its length adjustment, exact-book decline adjustment and comparable-level point to get the interest score. A missing or not-yet-designed source contributes zero. Use the source's retained records and apply its existing retention rules. Quiz answers do not change the saved reading profile or the derived interest profile.
