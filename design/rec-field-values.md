# REC field values (to be agreed)

**Area:** `UC-REC-kid-onboarding` · **Design:** [rec.md](rec.md)

Values the design could not invent (`DI-field-tables`). The team fills each table in; nothing below is decided. `/implement` builds `src/server/recommendation/interests.ts` and the book cap from these tables and from nothing else. When a table is filled, update the use case's data table to match.

## Reading-interest options (step 2, step 3)

A fixed list the parent picks from; no free text (`BR-child-structured-responses`). The glossary's Book Domains list the Genre/Subject values funny, mystery, adventure, animals and fantasy; they are a **suggestion only**, so the options match how the catalog is tagged.

| Option key | Label shown to the parent | Matching catalog tag (optional) |
|---|---|---|
| | | |

## Favorite books (step 4)

| Rule | Value |
|---|---|
| Maximum number of favorite books | (proposed: 10) |
| Book fields shown in the picker | (proposed: title and author) |
