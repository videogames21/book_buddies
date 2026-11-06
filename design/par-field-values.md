# PAR field values (to be agreed)

**Area:** `UC-PAR-create-kid-account` · **Design:** [par.md](par.md)

Values the design could not invent (`DI-field-tables`). The team fills each table in; nothing below is decided. `/implement` builds the checks from these tables and from nothing else. When a table is filled, update the use case's data table to match.

## Username (4h)

| Rule | Value |
|---|---|
| Allowed characters | |
| Minimum / maximum length | |
| Longest allowed run of digits | |
| Reserved words | |

## Nickname (4a)

| Rule | Value |
|---|---|
| Allowed characters | |
| Minimum / maximum length | |

## Generated password

| Rule | Value |
|---|---|
| Structure | |
| Length | |
| Word source | |
| Random source | |

## Age (4b)

| Rule | Value |
|---|---|
| Accepted range (server) | |
| Warning range (form) | |

## Grades (4c)

Decided by the developer, 2026-11-05.

| Grade value | Label |
|---|---|
| `pre-school` | Pre-school and under |
| `kindergarten` | Kindergarten |
| `1` | 1st grade |
| `2` | 2nd grade |
| `3` | 3rd grade |
| `4` | 4th grade |
| `5` | 5th grade |
| `6` | 6th grade |
| `7` | 7th grade |
| `8` | 8th grade |
| `9` | 9th grade |
| `10` | 10th grade |
| `11` | 11th grade |
| `12` | 12th grade |

Intent: "kindergarten and under", then 1 through 12. Kindergarten and pre-school are kept as separate values (developer allowed either).

## Reading-level scales (4d)

| Scale | Accepted format | Example |
|---|---|---|
| | | |

## Avatars

| Key | Description |
|---|---|
| | |

## Note word list (`OI-19`)

| Word | Category |
|---|---|
| | |

Categories to settle: the ones `UC-ADM-flag-review` lists (violence, self-harm).
