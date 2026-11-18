# PAR field values (to be agreed)

**Area:** `UC-PAR-create-kid-account`, `UC-PAR-onboarding` · **Design:** [par.md](par.md)

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

## Parent password (`UC-PAR-onboarding` 4c)

Decided by the developer, 2026-11-17: NIST-style, length only.

| Rule | Value |
|---|---|
| Minimum / maximum length | 8 / 128 characters |
| Character-class rules | None |
| Must not equal | The account's email, ignoring case |

## Parent name and email (`UC-PAR-onboarding` 3–4)

Proposed in `par.md`: the name 1–100 characters after trimming; the email at most 254 characters, lowercased.

| Rule | Value |
|---|---|
| Name minimum / maximum length (after trimming) | |
| Email maximum length | |

## Sign-in throttling (`SEC-signin-throttling`, `OI-37`)

Proposed in `par.md`: after 5 failures, a delay starting at 30 seconds and doubling to a 15-minute cap, with no lockout.

| Rule | Value |
|---|---|
| Failures before a delay | |
| First delay | |
| Delay growth and cap | |
| Lockout | |

## Password reset (`OI-37`)

Proposed in `par.md`: the link works for 1 hour; at most one reset email per account every 5 minutes.

| Rule | Value |
|---|---|
| Reset link lifetime | |
| Minimum time between reset emails to one account | |
