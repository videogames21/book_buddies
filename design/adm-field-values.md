# ADM field values

**Area:** `UC-ADM-add-content` · **Design:** [adm.md](adm.md)

Values the design could not invent (`DI-field-tables`). The team agreed them on 2026-11-17; the client's confirmation is `OI-42`. `/implement` builds `src/shared/catalog/tags.ts` and the limits from these tables and from nothing else. When a table changes, update the use case's data table to match.

The standard tag lists are the values found in the client's `BookBuddies_Seed_Catalog.xlsx` (134 books), so the lists match how the seed is tagged. The file is on the REC design branch, not on `main`.

**Adding a value later.** Each list is one array in `tags.ts`, one value per line, and the form, the schema and the import all read it from there. Adding a value is a one-line change plus a test row, with no migration, because books store the value itself and never a position. An in-app screen for an admin to edit the lists would be a new use case; none exists.

## Standard tag lists (steps 2, 4, 4b)

| Tag               | Several values per book? | Agreed list                                                                                                                      |
|-------------------|--------------------------|----------------------------------------------------------------------------------------------------------------------------------|
| Genre             | yes, at least one        | realistic fiction, fantasy, animal story, mystery, adventure, non-fiction                                                        |
| Subjects          | yes, optional            | animals, school, magic & mythical creatures, science & technology, food, space, dinosaurs, history & biography, vehicles, sports |
| Mood              | yes, at least one        | funny/silly, exciting, heartwarming, spooky-but-safe, fascinating, calm, inspiring                                               |
| Format            | no, one                  | comic/graphic novel, chapter book, picture book, early reader                                                                    |
| Length            | no, one                  | quick read, longer story                                                                                                         |
| Reading challenge | no, one                  | reading independently, reading with some help, read aloud together                                                               |

## Reading level (4c)

| Scale                | Accepted value format                                                                |
|----------------------|--------------------------------------------------------------------------------------|
| Lexile               | a number, with an optional "BR", "AD", "GN" or "NC" prefix and an "L" suffix         |
| AR/ATOS              | a decimal 0.0 to 13.0                                                                |
| DRA                  | 1 to 80, or A to Z                                                                   |
| Guided Reading Level | a letter A to Z                                                                      |
| Grade-level range    | two grades                                                                           |

## Limits

| Rule                      | Value                                                                                                                                       |
|---------------------------|---------------------------------------------------------------------------------------------------------------------------------------------|
| Title, maximum length     | 200                                                                                                                                         |
| Author, maximum length    | 200                                                                                                                                         |
| Earliest accepted year    | 1400; the latest is the current year from the clock                                                                                         |
| Suggested age min and max | whole numbers, min not above max; 0 to 21 is the usual range, and a value outside it is a warning the admin can accept, never an error (4i) |
| Custom tag length         | 1 to 30, counted after normalization (use case 4e)                                                                                          |
| Custom tags per book      | 10, counted after normalization and removal of duplicates (use case 4g)                                                                     |
