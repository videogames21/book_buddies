# REC field values (to be agreed)

**Area:** `UC-REC-kid-onboarding` · **Design:** [rec.md](rec.md)

Values the design could not invent (`DI-field-tables`). The team fills each table in; nothing below is decided. `/implement` builds `src/server/recommendation/interests.ts` and the book cap from these tables and from nothing else. When a table is filled, update the use case's data table to match.

## Reading-interest options (step 2, step 3)

A fixed list the parent picks from; no free text (`BR-child-structured-responses`). Proposed from the Genre values actually used in `BookBuddies_Seed_Catalog.xlsx` (134 books), so every option matches catalog books. The glossary's suggestion "funny" is left out because no seed book carries it as a genre; add it only together with a catalog tag. These are only suggestions.

| Option key | Label shown to the parent | Matching catalog tag (optional) |
|---|---|---|
|  `realistic-fiction` | Everyday life stories | realistic fiction |
| `fantasy` | Fantasy and magic | fantasy |
| `animals` | Animal stories | animal story |
| `adventure` | Adventure | adventure |
| `mystery` | Mystery | mystery |
| `non-fiction` | True stories and facts | non-fiction |

Note: 5 seed books have no Genre; tag them before import.

## Favorite books (step 4)

| Rule | Value |
|---|---|
| Maximum number of favorite books | (proposed: 10) |
| Book fields shown in the picker | (proposed: title and author) (`PickerBook = { id, title, author }` in `rec.md`) |
