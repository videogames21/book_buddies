# PAR field values

**Area:** `UC-PAR-create-kid-account`, `UC-PAR-onboarding` · **Design:** [par.md](par.md)

Values the design could not invent (`DI-field-tables`). `/implement` builds the checks from these tables and from nothing else; when a table changes, update the use case's data table to match.

**Status, 2026-11-17.** The developer approved every table below except the note word list. The child-account tables record the values `UC-PAR-create-kid-account` was built and reviewed with ([`docs/implementation/child-account.md`](../docs/implementation/child-account.md), "Settings needing approval"). The `UC-PAR-onboarding` tables take the values proposed in [`par.md`](par.md). The note word list stays empty until the client supplies it (`OI-34`); moderation terms are not invented here.

## Username (4h)

| Rule | Value |
|---|---|
| Allowed characters | Letters `a`–`z`, digits and underscore, after trimming and lowercasing |
| Minimum / maximum length | 3 / 20 characters |
| Longest allowed run of digits | 6 (seven or more in a row reads as a phone number and is refused) |
| Must not contain | The child's nickname, ignoring case |
| Reserved words | None |

## Nickname (4a)

| Rule | Value |
|---|---|
| Allowed characters | ASCII letters and digits only, after trimming; no spaces |
| Minimum / maximum length | 1 / 20 characters |

## Generated password

| Rule | Value |
|---|---|
| Structure | Three words and two digits, joined by hyphens, such as `otter-maple-sun-42` |
| Length | Three words of the list below plus two digits `00`–`99` |
| Word source | The 160 short, common, child-friendly words in `src/server/identity-access/password-words.ts` |
| Random source | `randomInt` from Node's `crypto` module (cryptographically secure) |
| Stored as | A salted scrypt hash only (`passwords.ts`) |

## Age (4b)

| Rule | Value |
|---|---|
| Accepted range (server) | Whole numbers 3–17 |
| Warning range (form) | Outside 6–11 the form warns and still submits |

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

The value is stored as the parent typed it, with its scale, and never converted (`BR-no-reading-level-assessment`).

| Scale | Accepted format | Example |
|---|---|---|
| Lexile (`lexile`) | A number of up to 4 digits, optionally with `BR` before it and `L` after it | `650L`, `BR200L` |
| AR / ATOS (`atos`) | A number from 0.0 to 13.0, with at most one decimal place | `3.5` |
| DRA (`dra`) | One letter A–Z, or a whole number 1–80 | `16` |
| Guided Reading Level (`grl`) | One letter A–Z | `M` |
| Grade-level range (`gradeRange`) | Two grades from the grade list (`K` for kindergarten), lower first | `2–3`, `K–1` |

## Avatars

Twenty drawn characters in `public/avatars/`, chosen from a fixed set; never an upload (`BR-kid-anonymous-profile`).

| Key | Description |
|---|---|
| `1`, `1-1`, `2`, `2-1`, `3`, `3-1`, `4`, `4-1`, `5`, `5-1` | Five characters, each in two variants (`<n>.png` and `<n>-1.png`) |
| `6` to `15` | Ten further characters, one image each (`<n>.png`) |

## Note word list (`OI-19`, `OI-34`)

**Not filled: the client supplies the words and categories (`OI-34`).** Until then the list is empty and every note is saved as `check_not_run`, never as clean.

| Word | Category |
|---|---|
| | |

Categories to settle: the ones `UC-ADM-flag-review` lists (violence, self-harm).

## Parent password (`UC-PAR-onboarding` 4c)

Decided by the developer, 2026-11-17: NIST-style, length only.

| Rule | Value |
|---|---|
| Minimum / maximum length | 8 / 128 characters |
| Character-class rules | None |
| Must not equal | The account's email, ignoring case |

## Parent name and email (`UC-PAR-onboarding` 3–4)

| Rule | Value |
|---|---|
| Name minimum / maximum length (after trimming) | 1 / 100 characters |
| Email maximum length | 254 characters, trimmed and lowercased |

## Sign-in throttling (`SEC-signin-throttling`, `OI-44`)

| Rule | Value |
|---|---|
| Failures before a delay | 5 failed sign-ins on one account key (the lowercased email) |
| First delay | 30 seconds before the next attempt is allowed |
| Delay growth and cap | Doubles with each further failure, capped at 15 minutes |
| Count reset | 24 hours after the last wait ends; the daily cleanup then deletes the row |
| Lockout | None; a successful sign-in or a password reset clears the count |

## Password reset (`OI-44`)

| Rule | Value |
|---|---|
| Reset link lifetime | 1 hour from when it is sent |
| Minimum time between reset emails to one account | 5 minutes; a request inside that window sends nothing and gets the same answer |
