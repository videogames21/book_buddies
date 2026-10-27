# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

BookBuddies (Team 05, client Dr. Yang Yang) is a book recommendation and reading shelf web app for children aged 6–11, with parent oversight and an admin role. **No application code exists yet.** The repository holds the specification and design documents, and code gets built one use case at a time from them. So there are no build, lint or test commands yet. When code arrives, the stack is TypeScript, Next.js on Vercel and MongoDB Atlas (`KD-tech-stack`). Tests will use Vitest for units, an in-memory MongoDB replica set for integration and Playwright for end to end (architecture §8.2.10).

## Where things live

- `docs/requirements/`: the specification. `use-cases.md` is large (~2400 lines), so find a use case by its `### UC-<AREA>-<slug>` heading instead of reading the whole file. The other files are `business-rules.md` (`BR-*`), `software-requirements-specification.md` (`FR-*`, `SEC-*`, `DI-*`, `CO-*`, `OE-*` and the rest), `project-glossary.md` (the vocabulary: use its terms in code and UI and add no synonyms), `vision-and-scope.md` (`FEAT-*`) and `OPEN-ISSUES.md` (`OI-*`, whose numbers are never reused).
- `design/architectural-design.md`: the **architecture-of-record** (arc42 + C4 in mermaid). Section 8 (Crosscutting Concepts) is binding on all code.
- `design/<area>.md`: one **design-of-record** per use case area, named for the lowercase area code (`par.md` covers `UC-PAR-*`).
- `docs/traceability.md`: links features to use case areas and business rules to what enforces them.
- `docs/Team_Decisions.md`: an index of dated team decisions. Record decisions that survive a team meeting there.
- `docs/coppa/`: COPPA source material and the requirements derived from it.

The design-of-record template is not in the repo; use the course copy linked in `/design` and follow the shape of `design/par.md`. `/design` and `/implement` also expect a per-use-case table in `traceability.md` with Build/Design/Code/Tests/Verify columns. It doesn't exist yet (§3 "From here (week 8)"), so add it the first time a use case is designed.

Use case areas: `PAR` (Accounts & Family), `REC` (Recommendation), `SHLF` (Shelf), `ADM` (Administration). The cross-cutting components are Identity & Access, Child Identity Store, Catalog, Safety Flagging, Notification and Scheduled Cleanup (architecture §5.2).

## Workflow

- Building happens in two stages, through the project commands: `/design <UC-ID>` writes the design-of-record and stops before any code. A teammate merges it. Then `/implement <UC-ID>` builds from the merged design in a fresh session. Never design inside the build.
- Documents **cite identifiers and never restate** another document's content. Before citing a `UC-*`, `BR-*`, `FR-*`, `OI-*` or `KD-*` identifier, confirm it exists in the document that owns it.
- The specification is authoritative but not infallible. When it is ambiguous or contradictory, ask or push back and propose the edit. Don't invent the missing detail. Questions only the client can answer go into `OPEN-ISSUES.md`.
- Don't add scope the use case doesn't ask for: no admin overrides, retry queues, status fields or extra notifications.
- Git: branch per sub-issue (`feat/42-short-slug`, `fix/...`) and never push to `main`. Every change goes through a pull request using `.github/PULL_REQUEST_TEMPLATE.md` (its `Traces to:` line names the `UC-*`/`BR-*`/design), and needs 2 approving reviews from non-owners. Don't commit or open a PR unless asked; the developer reviews first.

## Must not

- Don't add a dependency until a person confirms it exists and is the one intended.
- Never remove the `Co-Authored-By` trailer from a commit.
- Never put secrets in the repo or docs. They live in Vercel environment variables and an untracked `.env.local`.
- Never use or create real children's data; test data is invented.

## Architecture rules every change must follow

The full rules are in `design/architectural-design.md` §8; cite the subsection instead of restating it.

- **One deployable** (`KD-deployment-shape`): one Next.js app plus one MongoDB database. The catalog import is a hand-run script, never a live API call. Don't propose separate services, queues or caches unless a §9.1 requirement forces them.
- **Trust boundary (§8.1):** every server action and route handler checks the session and role itself through Identity & Access. Middleware is never the check. Every query is scoped to the caller's family inside the component's data-access functions.
- **Child PII (`KD-pii-segregation`):** a child's real name, age, grade and reading level live only in the Child Identity Store. Everything else uses an opaque child ID, nickname and avatar. Admin code never reads child details, except the single audited flagged-content review path (`KD-admin-flag-review`).
- **Auth (`KD-auth-sessions`):** Auth.js with *database* sessions, not JWT, so suspension revokes sessions immediately.
- **Errors (8.2.1):** every action returns `{ ok: true, data }` or `{ ok: false, error: { code, message } }` through one shared helper. Responses never include exception messages or stack traces.
- **Time (8.2.2, `KD-time-rules-on-read`):** store times in UTC, use `now()` from the settable clock module, and check deadlines on read. Cron only purges what has already expired.
- **API (8.2.3):** pages change data through verb-first server actions (session check, then zod validation, then the owning component). `/api/` route handlers exist only for Auth.js and the cron cleanup.
- **Code (8.2.4):** TypeScript strict mode with no `any` in domain code. Only a component's own data-access functions under `src/server/<component>/` touch its collections. Mark server modules `server-only`.
- **Validation (8.2.5):** server-side zod is the check that counts.
- **Logging (8.2.7):** never log passwords, session IDs, emails, usernames, child details, reflection text, report comments or flagged passages.
- **Transactions (8.2.8):** paired writes (for example a reflection with its flag and alerts) are one MongoDB transaction. Single-actor state changes use conditional updates. Reuse one Mongo client per instance.
- **Audit (8.2.9):** append-only, IDs only.
- **Child-facing views (8.2.11):** show book data, the child's nickname and avatar only, with no counts, streaks, levels or comparisons.
- **Exclusions (`KD-book-exclusion`):** every recommendation and search query filters blocked books *and* the child's per-child report exclusions.
