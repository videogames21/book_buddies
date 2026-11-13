# Child account implementation review

## Source

Based on `main` at `0a620ee`, including PR #56 and PR #57. The ZIP link failed, so code, assets and tests were recovered from `origin/feat/53-createKidAccount` (PR #54) and updated to match the merged design.

The merged design, architecture, requirements, grade table, ESLint rules and five CI jobs are unchanged. The build runs Next.js, tests run Vitest, and a new CI job runs Playwright against the production build.

## Implementation

- The page and server action check a current Auth.js database session, Main Parent role and family consent before accepting input. Child/admin sessions are refused. `consentRecords` assumes one record per family with `confirmedAt`; a `revokedAt` field prevents authorization. Inside the child transaction a conditional write increments `childCreationVersion` on that same consent document. This serializes creation with revocation, including when consent changes after the action's initial check. Parent onboarding/revocation must maintain that shared-record contract.
- Unknown request properties are discarded; the family always comes from the session. Child IDs are random UUIDs. No real-name field exists in the form, domain input or storage schema.
- Component-owned data functions share one MongoDB transaction. Child identity, credential, flag and audit failures roll back the preceding writes. Usernames share a unique index across child and Sub Parent accounts.
- The plaintext password is returned once. It is not persisted, logged, placed in a URL or made available through a later read. A synchronous submit lock prevents duplicate browser submissions and protects the first credentials response.
- A lost browser response does not prove a failed save. The form explains that the password cannot be recovered on this page and asks the parent to contact the team before trying again. It does not promise that retrying recovers credentials. Password reset remains `OI-26`; the implementation does not store a recoverable password or invent a reset flow.
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

Password format/entropy and sign-in throttling must be reviewed before real child sign-in is implemented; this PR does not implement sign-in throttling or a reset flow. The real word list/categories, field values and avatar set still need the team's approval. PR #57's development-tool versions are retained. No paid service or external detector is added.

The review follow-up replaces the beta `next-auth` pin with stable `4.24.15`, using `getServerSession` and the existing MongoDB adapter. Its published peer ranges include Next.js 16 and React 19; the official release is not marked as a prerelease. `AUTH_SECRET` is explicitly validated. Fixtures use the stable release's `next-auth.session-token` cookie. Reference: [official release](https://github.com/nextauthjs/next-auth/releases/tag/next-auth%404.24.15).

The review's 128 MB figure describes temporary scrypt working memory per active operation, not the size of each stored child hash. No family child-count limit is specified, so this change does not invent one. Request-rate and hash-concurrency limits remain deployment/authentication design work before real users. A demo uses only a loopback server, invented data and a fresh temporary database.

`PRIVACY_NOTICE_URL` must identify the client's BookBuddies notice in production. Without it the production form fails closed. The local test URL and development placeholder are not a release notice.

## Tests

| Design flow or invariant                                                                                                       | Automated coverage                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Main flow; optional reading level; family from session; UUID; no name storage                                                  | `actions.int.test.ts`; `create-kid-account.spec.ts`                                                                                     |
| Cancel (1a); Sub Parent page/action (1b); missing/revoked consent (1c)                                                         | Playwright cancel/Sub Parent/consent tests; action integration tests                                                                    |
| Nickname, age bounds/warning, grades, username required/format/contact/nickname, reading scales, avatar, 250/251 note boundary | `schema.test.ts`; action first-error test; Playwright warning/note tests                                                                |
| Note word matching, Unicode offsets, regex escaping, no substring matches, no configured list                                  | `screen-note.test.ts`                                                                                                                   |
| Trimmed note, clean/flagged/failed screening; IDs-only audit; no note in response                                              | Action integration tests                                                                                                                |
| Identity/credential/flag/audit failures; password generation failure; no partial writes                                        | Action integration tests; `db.int.test.ts` transaction tests                                                                            |
| Case-insensitive normalized duplicate usernames including Sub Parents; concurrent creation                                     | Action integration tests; username index test                                                                                           |
| One-time plaintext password; synchronous double submit                                                                         | Password unit tests; action storage test; Playwright duplicate/reload tests; the displayed password must verify against its stored hash |
| Completion family scoping; child/admin refusal; database session deletion                                                      | Action/session integration tests; Playwright family/role/session tests                                                                  |
| No sensitive fields in application logs                                                                                        | `log.test.ts`; action logging integration test                                                                                          |
| Production build; infrastructure setup idempotence                                                                             | Next build; separate infrastructure suite in `tests/infrastructure/schema-setup.int.test.ts`                                            |

Tests use invented data and seeded database sessions. Parent sign-in and REC onboarding (PAR POST-6) remain unfinished. This PR requires two approvals from non-owners; the agent must not merge it.

## Review follow-up

Based on the [changes-requested review and discussion in PR #67](https://github.com/videogames21/book_buddies/pull/67).

| Finding                                                                          | Follow-up                                                                                                                                                                            |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Username boundaries, seven-digit threshold, nickname digits, complete grade list | Positive and negative boundary cases in `schema.test.ts`                                                                                                                             |
| Access checks must precede validation                                            | Invalid payloads under signed-out, child and admin sessions                                                                                                                          |
| Field-error mapping and top-level payloads                                       | Non-nickname action errors, first error in form order, `INVALID_INPUT` for non-object payloads                                                                                       |
| Duplicate trimming                                                               | Schema alone trims the note, as `design/par.md` requires                                                                                                                             |
| Flag offsets/method and audit transaction                                        | Assert stored passage offsets, detector method and shared transaction session                                                                                                        |
| Passage ordering and non-vacuous logging                                         | Cross-entry ordering; real flagged marker; require an error log; exclude age/grade fields                                                                                            |
| Password randomness, cost and double-submit assertion                            | Spy on cryptographic random source; verify scrypt parameters; verify browser password against stored hash                                                                            |
| Test scope                                                                       | Remove lost-response retry/mobile-width assertions and REC placeholder internals; move real session revocation to Identity & Access browser tests and setup checks to infrastructure |
| Consent race, missing secret, beta library, misleading throttling comment        | Transactional consent write, validated secret, stable auth pin and corrected comment                                                                                                 |
| Word list, limits and password reset                                             | Pending owning team/client decisions; no invented moderation terms, child-count policy or password-recovery behavior                                                                 |

The demo is started with `npm run demo`; see the README. It changes no production
authentication route. The follow-up targets `feat/53-create-child-revised`, so
reviewers see only its changes. The original PR's size still needs a submission
decision. Nothing is merged automatically.
