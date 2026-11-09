# Child account implementation review

## Source

Based on `main` at `0a620ee`, including PR #56 and PR #57. The ZIP link failed, so code, assets and tests were recovered from `origin/feat/53-createKidAccount` (PR #54) and updated to match the merged design.

The merged design, architecture, requirements, grade table, ESLint rules and five CI jobs are unchanged. The build runs Next.js, tests run Vitest, and a new CI job runs Playwright against the production build.

## Implementation

- The page and server action check a current Auth.js database session, Main Parent role and family consent before accepting input. Child/admin sessions are refused. `consentRecords` assumes one record per family with `confirmedAt`; a `revokedAt` field prevents authorization. Parent onboarding/revocation must maintain that contract.
- Unknown request properties are discarded; the family always comes from the session. Child IDs are random UUIDs. No real-name field exists in the form, domain input or storage schema.
- Component-owned data functions share one MongoDB transaction. Child identity, credential, flag and audit failures roll back the preceding writes. Usernames share a unique index across child and Sub Parent accounts.
- The plaintext password is returned once. It is not persisted, logged, placed in a URL or made available through a later read. A synchronous submit lock prevents duplicate browser submissions and protects the first credentials response.
- A lost browser response does not prove a failed save. The form says so and retries with the same username, which cannot create another account. Password recovery remains a separate use case.
- Notes are trimmed, limited to 250 Unicode code points, and screened locally. Offsets use UTF-16 positions in the stored text, matching JavaScript strings. Flags may record multiple categories from one note; note text is stored only once. No admin alert is created, following the merged PAR design.
- The shared word list is still empty. Screening therefore records `check_not_run`, never `none`. Unit tests inject artificial terms; integration tests inject screening outcomes to verify clean, flagged and failed detector paths. The team must supply the real word list before release.
- Parent summaries and completion/REC integration pages are family-scoped. Other/unknown child IDs have the same not-found result. No child/admin detail-reading endpoint is introduced.
- The REC hand-off route is `/parent/children/[childId]/reading-profile`. It is an explicit integration placeholder, not a completed implementation of `UC-REC-kid-onboarding`. The family-scoped `/onboarding-complete` page implements PAR step 10 and deliberately does not verify REC state, as the approved design specifies.

## Settings needing approval

These are review settings recovered from PR #54 and proposals in the merged design. They do not fill or approve the intentionally empty tables in `design/par-field-values.md`.

| Setting        | Implemented review value                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Nickname       | 1–20 ASCII letters/digits, trimmed                                                                                       |
| Username       | 3–20 ASCII letters/digits/underscores, trimmed and lowercased; no seven consecutive digits; cannot contain the nickname  |
| Age            | Whole numbers 3–17; non-blocking warning outside 6–11                                                                    |
| Grades         | Existing approved `pre-school`, `kindergarten`, 1–12                                                                     |
| Reading scales | Lexile, AR/ATOS, DRA, Guided Reading Level, grade range; formats in `schema.ts`; entered value preserved, never assessed |
| Avatar set     | Existing 20 provided assets recovered from PR #54; no uploads                                                            |
| Password       | Three cryptographically selected words from the existing 160-word list and two digits; salted scrypt hash                |
| Notes          | Optional; blank is omitted; limit after trimming; multiple matched categories supported                                  |

Password format/entropy and sign-in throttling must be reviewed before real child sign-in is implemented; this PR does not implement sign-in throttling or a reset flow. The real word list/categories, field values and avatar set still need the team's approval. Open-source dependencies and exact versions are recovered from the existing application branch; PR #57's development-tool versions are retained. No paid service or external detector is added.

`PRIVACY_NOTICE_URL` must identify the client's BookBuddies notice in production. Without it the production form fails closed. The local test URL and development placeholder are not a release notice.

## Tests

| Design flow or invariant                                                                                                       | Automated coverage                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Main flow; optional reading level; family from session; UUID; no name storage                                                  | `actions.int.test.ts`; `create-kid-account.spec.ts`                                 |
| Cancel (1a); Sub Parent page/action (1b); missing/revoked consent (1c)                                                         | Playwright cancel/Sub Parent/consent tests; action integration tests                |
| Nickname, age bounds/warning, grades, username required/format/contact/nickname, reading scales, avatar, 250/251 note boundary | `schema.test.ts`; action first-error test; Playwright warning/note tests            |
| Note word matching, Unicode offsets, regex escaping, no substring matches, no configured list                                  | `screen-note.test.ts`                                                               |
| Trimmed note, clean/flagged/failed screening; IDs-only audit; no note in response                                              | Action integration tests                                                            |
| Identity/credential/flag/audit failures; password generation failure; no partial writes                                        | Action integration tests; `db.int.test.ts` transaction tests                        |
| Case-insensitive normalized duplicate usernames including Sub Parents; concurrent creation                                     | Action integration tests; username index test                                       |
| One-time plaintext password; synchronous double submit; lost response and safe retry                                           | Password unit tests; action storage test; Playwright duplicate/reload/network tests |
| Completion family scoping; child/admin refusal; database session deletion                                                      | Action/session integration tests; Playwright family/role/session tests              |
| No sensitive fields in application logs                                                                                        | `log.test.ts`; action logging integration test                                      |
| Production build, mobile width, actual setup script idempotence                                                                | Next build; Playwright mobile test; `db.int.test.ts` setup command test             |

Tests use invented data and seeded database sessions. Parent sign-in and REC onboarding (PAR POST-6) remain unfinished. This PR requires two approvals from non-owners; the agent must not merge it.
