# Recommendation (REC) Design

**Project:** BookBuddies
**Team:** Team 05
**Area:** `UC-REC`

> **Realizes:** `UC-REC-kid-onboarding`, `FR-ONB-profile` (the interests and favorite books half), `FEAT-onboarding-profile`, `UC-REC-recommend-quiz-rules`, `FR-REC-rules`, `FR-REC-every-request`, `FEAT-recommendation-quiz`, `UC-REC-parent-review`
> **Depends on:** `BR-parent-creates-kid-account`, `BR-kid-data-stored`, `BR-reading-level-proxy`, `BR-no-reading-level-assessment`, `BR-child-structured-responses`, `BR-coppa-minimization`, `BR-admin-limited-view`, `BR-coppa-notice`, `BR-coppa-parent-rights`, `BR-coppa-retention`, `FR-DATA-notice`, `FR-DATA-review`, `DI-integrity`, `DI-catalog-status`, `DI-field-tables`, `SEC-role-authorization`, `KD-pii-segregation`, `KD-auth-sessions`, `KD-book-exclusion`, `KD-catalog-import-offline`, `BR-parent-report-book`, `BR-parent-ultimate-say`, `BR-parent-note`, `DI-report-exclusion`, `SAF-child-content`, `PER-recommendation-latency`; for `UC-REC-parent-review`: `BR-parent-rec-not-forced`, `KD-time-rules-on-read`, `CI-in-app-alerts`, `ROB-no-data-loss`, `OI-25`, `OI-32`, the batch that `UC-REC-recommend-quiz-rules` stores (Rules quiz data, below), and the batch contract and batch entry point of `UC-PAR-report-book` in [`design/par.md`](par.md)
> **See:** [use cases, REC area](../docs/requirements/use-cases.md#uc-rec-kid-onboarding-capture-a-childs-reading-interests-and-favorite-books), [specification](../docs/requirements/software-requirements-specification.md), [business rules](../docs/requirements/business-rules.md), [glossary](../docs/requirements/project-glossary.md), [architecture-of-record](architectural-design.md), [PAR design](par.md), [field values to agree](rec-field-values.md)
> **Designed against:** `d8beec6` for onboarding, `8aadd95` for the rules quiz, and `10eebbc` for `UC-REC-parent-review` (after #115 merged; no batch code exists yet).

---

## Overview

The Recommendation area owns each child's reading profile and, in later use cases, the recommender itself ([containers](architectural-design.md#51-containers), [use case areas and components](architectural-design.md#52-use-case-areas-and-components)). `UC-REC-kid-onboarding`, the first use case designed here, lets a parent record the child's reading interests and favorite books already read, and marks onboarding complete. It is entered from `UC-PAR-create-kid-account` step 9 at the route PAR already fixed, `/parent/children/[childId]/reading-profile`, and ends by redirecting to PAR's `/onboarding-complete` page (PAR step 10).

The profile is held by Recommendation under the opaque child ID. It is not identifying, so it stays out of the Child Identity Store, which keeps only age, grade and reading level (architecture §5.2, `KD-pii-segregation`). Onboarding never touches those three fields and never estimates a reading level (`BR-no-reading-level-assessment`). The book picker reads the Catalog, which this design depends on but does not build (see Open questions). Either parent role, Main or Sub, may onboard a child of their family (architecture §8.1).

`UC-REC-recommend-quiz-rules` adds the child’s recommendation request. Catalog filters the active and age-appropriate books against the quiz and the child's permanent exclusions. Recommendation ranks the results using that child's profile and history, then stores an ordered batch for [parent review](../docs/requirements/use-cases.md#uc-rec-parent-review-parent-reviews-a-childs-recommendation-batch). The child sees that the request was sent. The books become available through the downstream release flow.

`UC-REC-parent-review` sits between the batch that `UC-REC-recommend-quiz-rules` stores as `pending` and the child's reactions in `UC-REC-kid-review`. Everything it needs is the **Recommendation Batch** document itself, owned by Recommendation, so it adds no collection. The parent is told a batch is ready (step 1) by a list of pending batches on the parent home page, which Recommendation reads from the batches; no separate notice is stored. The parent opens one batch, sees each book's title and tags through the Catalog (steps 2–3), and may remove books one at a time, each removal saved at once (step 4). Confirming (step 5) is one conditional update that marks the batch `released`, or `empty` when no book is left (4a), and that update **is** the release (step 6): `UC-REC-kid-review` reads released batches, so there is no separate hand-off to fail or retry (6a). A batch the parent never confirms is released unchanged when the deadline the quiz stored on it, `handoffDeadline`, passes (2a). Every read applies that rule from that instant (`KD-time-rules-on-read`), and the stored state follows without anyone opening a page: the child's next quiz save records the release in its own transaction, and otherwise the daily Scheduled Cleanup run does. Either way the batch leaves `pending`, so the child's one pending slot (#115's partial unique index) is free for the next request. Either parent role may review (architecture §8.1, `OI-25`). A parent may report a book from the batch instead of only removing it; the report is `UC-PAR-report-book`'s, and this design supplies the batch function and the entry path that [`par.md`](par.md) left to it. Parent-suggested books do not pass through this review (`BR-parent-rec-not-forced`, the use case's Assumptions).

## Components & classes

All files below are new unless marked reused. Paths follow §8.2.3 and §8.2.4.

```mermaid
classDiagram
    direction LR
    class ReadingProfilePage {
        <<new, replaces placeholder>>
        /parent/children/[childId]/reading-profile
    }
    class readingProfileActions {
        <<new>>
        +saveReadingProfile(input) ActionResult
    }
    class readingProfileSchema {
        <<new>>
        zod, shared by form and action
    }
    class readingProfiles {
        <<new, Recommendation>>
        +saveOnboardingProfile(session, childId, input)
        +isOnboardingComplete(familyId, childId) boolean
    }
    class interests {
        <<new, team-editable>>
        INTEREST_OPTIONS
    }
    class catalogBooks {
        <<new, minimal, Catalog>>
        +listPickerBooks() PickerBook[]
        +findActiveBookIds(ids) string[]
    }
    class childAccounts {
        <<reused, Accounts and Family>>
        +getChildForFamily()
        +isConsentConfirmed()
    }
    class sessions {
        <<reused, Identity and Access>>
        +requireParent()
    }
    ReadingProfilePage --> sessions
    ReadingProfilePage --> childAccounts
    ReadingProfilePage --> readingProfiles
    ReadingProfilePage --> catalogBooks
    ReadingProfilePage --> interests
    readingProfileActions --> sessions
    readingProfileActions --> childAccounts
    readingProfileActions --> readingProfileSchema
    readingProfileActions --> readingProfiles
    readingProfiles --> catalogBooks
    readingProfiles --> childAccounts
    readingProfileSchema --> interests
    class ParentHomePage {
        <<reused, gains a section>>
        /parent
    }
    class BatchReviewPage {
        <<new, UC-REC-parent-review>>
        /parent/children/[childId]/recommendations/[batchId]
    }
    class BatchReview {
        <<new, client component>>
        remove, report link, confirm
    }
    class batchActions {
        <<new>>
        +removeBookFromBatch(input) ActionResult
        +confirmBatch(input) ActionResult
    }
    class batches {
        <<Recommendation, file from UC-REC-recommend-quiz-rules>>
        +listPendingBatchesForFamily(familyId) PendingBatch[]
        +getBatchForReview(familyId, childId, batchId) BatchReviewView
        +removeBookFromBatch(session, input)
        +removeFromPendingBatchInTx(tx, childId, bookId) boolean
        +isInPendingBatch(childId, batchId, bookId) boolean
        +confirmBatch(session, input)
        +listReleasedBatchesForChild(childId) ReleasedBatch[]
    }
    class batchState {
        <<new, pure>>
        +batchState(batch, now) pending or released or empty
    }
    class bookReports {
        <<Accounts and Family, design/par.md>>
        +listExcludedBookIds(childId) string[]
        +reportBook(session, input)
    }
    ParentHomePage --> batches
    BatchReviewPage --> sessions
    BatchReviewPage --> batches
    BatchReviewPage --> BatchReview
    BatchReview --> batchActions
    batchActions --> sessions
    batchActions --> batches
    batches --> childAccounts
    batches --> catalogBooks
    batches --> bookReports
    batches --> batchState
    bookReports --> batches
```

- `src/app/(parent)/parent/children/[childId]/reading-profile/page.tsx` (**reused route, replaces the placeholder**): the form for steps 1 to 4. It calls `requireParent()`, then `getChildForFamily`; a child outside the session's family, or unknown, is not found with no hint which. If onboarding is already complete it shows the parent an error and no form (1a, PRE-3). The error has a link back to the parent's home page; that page is not built yet, so the target is one constant that points there once the route exists, and until then the error shows without a link. It shows the child's nickname and avatar only, the interest options, the catalog picker and a privacy notice block (`FR-DATA-notice`, `BR-coppa-notice`). **Placeholder, to be replaced by the client:** the block is a short plain paragraph saying what is collected (interests and favorite books), that it is used only to recommend books, and that the parent can review and delete it, shown in full above the Save button, with an unticked checkbox, "I have read this notice and agree to share this information about my child". Save stays disabled until the parent ticks it themselves; it is never pre-ticked or ticked by default. The tick is held in the form only and is not stored, because `BR-coppa-parental-consent` is already recorded in PAR, so whether to store it is for the client. The client, with a lawyer, supplies the real notice text; the block is one small component so swapping in the text changes nothing else. As built (the developer's decision, 2026-11-18), the block also carries a link to the privacy notice from `getPrivacyNoticeUrl()` in `src/server/lib/config.ts`, the same location `UC-PAR-create-kid-account` links to (`COPPA-online-notice`). It opens in a new tab, so the parent's selections stay on the form and closing the tab brings them back; the development placeholder page says so. Like the PAR form, the page fails closed in production when `PRIVACY_NOTICE_URL` is unset, and falls back to `/privacy-notice` in development and tests. There is no skip control: the use case has no skip extension, and saving with nothing selected is step 3 with zero choices. The save button is disabled while pending, and every selection stays in the form after a failed save (5a).
- `.../reading-profile/actions.ts` (new): `saveReadingProfile`. In order (§8.2.3): `requireParent()`, `getChildForFamily` (not found before anything else is revealed), `isConsentConfirmed`, zod validation, then Recommendation. The family comes from the session, never from the request. On success it returns `ok` with no data, and the form component calls `router.push` to `/parent/children/${childId}/onboarding-complete` (step 6), with `childId` taken from the route params, never from user input or a return parameter. The path template is fixed in code. `SAVE_FAILED` carries the error ID in the shared result helper's error ID field (§8.2.1), never in logs with profile data.
- `.../reading-profile/schema.ts` (new): the one zod schema (§8.2.5): child ID, interests (each from the fixed list, duplicates removed), favorite book IDs (duplicates removed, at most 10, proposed in `OI-38`; one constant in `schema.ts`). No free-text field exists.
- `src/server/recommendation/reading-profiles.ts` (new, server-only): the only code that touches `readingProfiles`. `saveOnboardingProfile` confirms the child belongs to the family through Accounts & Family, validates the book IDs through the Catalog, and writes with one conditional insert guarded by "no completed profile for this child". A duplicate-key error from the unique `childId` index is mapped to `ONBOARDING_ALREADY_COMPLETE`, not `SAVE_FAILED`. `isOnboardingComplete` is the read the page uses for PRE-3 and that `UC-REC-recommend-quiz-rules` will use later.
- `src/server/recommendation/interests.ts` (new, **team-editable**): the fixed interest options, filled from [rec-field-values.md](rec-field-values.md). As built it is not `server-only`, because the form and its schema read it too, like PAR's `grades.ts`. The route folder also holds `access.ts` (the session, family and consent checks the page and action share, kept out of the `"use server"` file) and `paths.ts` (the fixed completion path and the home-page constant, which the form imports).
- `src/server/catalog/books.ts` (new, minimal, owned by the Catalog): `listPickerBooks` (active, non-blocked books, returned as `PickerBook = { id: string; title: string; author: string }`, sorted by title) and `findActiveBookIds`. "Active" and "blocked" are the Catalog's own status values from `DI-catalog-status`; this design invents none, and fixture books use whatever names that requirement fixes. Draft and blocked books are never returned. Nothing else is designed here; the Catalog's collection, import and admin functions belong to `UC-ADM-add-content`. Until then integration tests insert invented fixture books.
- Reused, not changed: `src/server/identity-access/sessions.ts` (`requireParent`), `src/server/accounts-family/child-accounts.ts` (`getChildForFamily`, `isConsentConfirmed`), `src/server/lib/` (`action-result.ts`, `clock.ts`, `db.ts`, `log.ts`, `collections.ts`), and `src/server/setup/ensure-indexes.ts`, which gains one call for the new index.
- `/parent/children/[childId]/onboarding-complete/page.tsx` is PAR's and is not changed.

### Rules quiz components

| Component | Reuse or change |
|---|---|
| `src/app/(child)/child/page.tsx`, `recommendations/quiz/page.tsx`, `quiz-form.tsx`, `actions.ts` | Add **Get recommendations** to the child home and add the quiz page, shared validation and two child-session actions. Both the child home and quiz render the existing online-privacy-notice link from `getPrivacyNoticeUrl()` with the same production fail-closed behavior as onboarding and no additional consent checkbox. A page load may show readiness but only the start action records a failed request. |
| `src/shared/recommendation/quiz.ts` | The option keys, labels and one shared schema for the form and server action. See [field values](rec-field-values.md#rules-quiz-proposal-oi-2). |
| `src/server/lib/config.ts` | Add `RECOMMENDER_MODE` as an optional string in the validated environment, defaulting to `rules` for V1. Startup parsing preserves unknown strings; the server-only `getRecommenderMode()` whitelist accepts exactly `rules` and treats every other value as unavailable. |
| `src/server/identity-access/sessions.ts` and Child Identity Store | Reuse the designed `requireChild()` from [Shelf](shlf.md). The narrow recommendation reader in `child-identity.ts` returns age, grade and the optional parent-entered scale and value for the session's child. |
| `src/server/accounts-family/families.ts`, `book-reports.ts`, and `parent-notes.ts` | Reuse the child/family and consent guards and `listExcludedBookIds` from [parent reporting](par.md#uc-par-report-book-report-a-book-for-a-child). That read accepts the same transaction for batch generation. Accounts & Family reads notes for that child and projects only recognized preference keys to Recommendation. |
| `src/server/catalog/books.ts` | Add `listRuleCandidates(age, quiz, excludedBookIds, tx)` and a batched feature read for eligible history book IDs. It returns `RuleCandidate = { id, genres, subjects, length, ageMin, ageMax, comparableLevels: { lexile?: number; arAtos?: number } }`. Catalog owns the status/age/quiz filters, seed tag normalization and level parsing. The raw `readingLevel` annotation is read only inside this server-only Recommendation path and is never returned; `customTags` stays private. Recommendation compares the normalized numbers with the child’s optional level. |
| `src/server/recommendation/reading-profiles.ts`, Shelf and reaction readers | Read the existing onboarding profile, retained shelf activity, ratings and the child's recorded reactions in bounded, child-scoped queries. Use the owning component's API and the same transaction. |
| `src/server/recommendation/quiz-recommendations.ts`, `rules.ts` and `batches.ts` | Coordinate the reads and save, rank candidates in a pure function, and store the pending batch. Before the insert, the save transaction calls `releaseExpiredBatchInTx(tx, childId)` (`UC-REC-parent-review`), so an expired pending batch never blocks the new one. Do not depend on the parent review UI to complete the save. |

Added for `UC-REC-parent-review` (all new unless marked reused or contract):

- `src/app/(parent)/parent/page.tsx` (reused): the parent home, a placeholder until `UC-PAR-view-growth-report` designs the dashboard, gains a "Recommendations to review" section after its onboarding gate (step 1). It lists `listPendingBatchesForFamily(familyId)`: one line per pending batch with the child's nickname, the number of books and when the batch goes to the child, each linking to the batch page. With nothing pending the section is absent. Read on every load (dynamic).
- `src/app/(parent)/parent/children/[childId]/recommendations/[batchId]/page.tsx`: steps 2–3. A server component, dynamic. `requireParent()` (no session: redirect to `/sign-in`; not a parent: `notFound()`), then `getBatchForReview(familyId, childId, batchId)`; `null` is `notFound()`, the same `404` for another family's child, an unknown or malformed child or batch ID, and a batch of another child. A batch that is no longer pending (confirmed, or past `handoffDeadline`) shows "Already released to {nickname}" and its remaining books, with no controls. Otherwise it renders `BatchReview`.
- `.../[batchId]/batch-review.tsx` (client component): the books, each with title, author and tags (genres, subjects, moods, length), and two controls: "Remove", which calls `removeBookFromBatch` and drops the book from the list on success, and "Report", a link to the batch entry point below, rendered only once that page is built (until then the control is absent, so no link leads to a `404`). A line under the heading says the batch goes to the child unchanged at `handoffDeadline` if not confirmed (2a). "Confirm" calls `confirmBatch` (step 5). Every button is disabled while an action is pending. On `SAVE_FAILED` the page stays as it was and shows the error (5a); on `BATCH_ALREADY_RELEASED` it refreshes into the released view. Removing the last book leaves "No books left. Confirm to let {nickname} know there are no new picks right now" (4a). It shows the source as "Picked by the rules recommender" (the source is parent-visible, `UC-REC-recommend-quiz-rules` Associated Information).
- `.../[batchId]/actions.ts` and `schema.ts`: `removeBookFromBatch` (`childId`, `batchId`, `bookId`) and `confirmBatch` (`childId`, `batchId`), with one zod schema each (§8.2.5). Order (§8.2.3): `requireParent()`, validate, then Recommendation. The family comes from the session, never the request. Both revalidate the batch page and `/parent` on success. The schemas check shape only: each ID is a non-empty string of at most 100 characters, so a malformed ID passes zod and is answered by the data layer like an unknown one (`CHILD_NOT_FOUND`, then `BATCH_NOT_FOUND`), never by a validation error that would tell a caller which IDs exist. Any other shape failure (a missing field, a non-string) is `INVALID_INPUT`, as in PAR's actions. In Recommendation a `batchId` that is not a 24-character hex string is `BATCH_NOT_FOUND` without a query (`ObjectId.isValid` is not used, since it accepts any 12-character string); child IDs are plain strings, so `getChildForFamily` returns `null` for a malformed one and needs no guard.
- `src/server/recommendation/batches.ts` (server-only; the file and the batch insert are `UC-REC-recommend-quiz-rules`'s, #115): this design adds the reads and conditional updates below, which are the only code that changes a batch after it is stored.
  - `listPendingBatchesForFamily(familyId)`: the family's children from `listChildrenForFamily` (Accounts & Family; added by #111, or by this build with the same signature if #111 has not merged), then their batches that are pending and before `handoffDeadline`, oldest first.
  - `getBatchForReview(familyId, childId, batchId)`: `getChildForFamily` first, then the batch by `_id` **and** `childId`, then its remaining books through `getBooksForReview`, minus `listExcludedBookIds(childId)`. Returns the nickname, the state from `batchState`, `handoffDeadline`, the source and the books; never `removedBookIds`. The books keep `bookIds` order (#115 stores them ranked). **Remaining books** are always the same set: `bookIds` minus `listExcludedBookIds(childId)`, minus any book `getBooksForReview` does not return (blocked or draft). The 4a wording on the page, the count on `/parent` and the child's `empty` (below) all use that set, never the raw `bookIds`.
  - `removeBookFromBatch(session, input)`: `getChildForFamily`, `isConsentConfirmed`, then one `updateOne` on `{ _id, childId, status: "pending", handoffDeadline: { $gt: now() }, bookIds: bookId }` that pulls the book from `bookIds` and adds it to `removedBookIds`. When nothing matched it reads the batch once to give the right code: no batch is `BATCH_NOT_FOUND`, not pending or past its deadline is `BATCH_ALREADY_RELEASED`, a book already in `removedBookIds` is `ok` (a double tap), any other book is `BOOK_NOT_IN_BATCH`.
  - `removeFromPendingBatchInTx(tx, childId, bookId)`: **the contract [`par.md`](par.md) names**, now designed. The same update as `removeBookFromBatch` with `updateMany` over every batch of the child that is pending and before `handoffDeadline` and holds the book, on the report's transaction; returns whether any batch changed. This is 7d of `UC-PAR-report-book`: the batch stays pending.
  - `isInPendingBatch(childId, batchId, bookId)`: the PRE-3 check of the batch entry page.
  - `confirmBatch(session, input)`: `getChildForFamily`, `isConsentConfirmed`, then one `updateOne` on `{ _id, childId, status: "pending", handoffDeadline: { $gt: now() } }` with an update pipeline that sets `status` to `empty` when `bookIds` is empty and to `released` otherwise, and `releasedAt` to `now()`. A stored `empty` therefore only means `bookIds` was empty; a batch whose `bookIds` still holds only blocked or excluded books is stored `released` and is empty to the child by the rule in `listReleasedBatchesForChild`. When nothing matched it reads once: `BATCH_NOT_FOUND` or `BATCH_ALREADY_RELEASED`. A write error is `SAVE_FAILED` with an error ID from `logUnexpectedError`.
  - `releaseExpiredBatchInTx(tx, childId)` and `releaseExpiredBatches()`: **the timeout release (2a) in stored state.** One `updateMany` on `{ status: "pending", handoffDeadline: { $lte: now() } }` (the first also on `childId`, on the caller's transaction) with the same update pipeline as `confirmBatch`: `status` becomes `empty` when `bookIds` is empty and `released` otherwise, and `releasedAt` becomes the batch's own `handoffDeadline`, the moment the reads already treated it as released. Both return the number of batches changed. The match on `status: "pending"` makes each idempotent, and its deadline condition is the opposite of `confirmBatch`'s and `removeBookFromBatch`'s (`$gt: now()`), so a parent's write and a timeout release can never both apply to one batch. `releaseExpiredBatchInTx` is called by the quiz's save transaction before its insert (Rules quiz decisions, "Retry the same request"). `releaseExpiredBatches` is called by the Scheduled Cleanup route (`src/app/api/cron/cleanup/route.ts`, daily in `vercel.json`), beside the sign-in attempt purge, and logs only the count. Neither changes what any read returns; they make the stored status match it.
  - `listReleasedBatchesForChild(childId)`: the hand-off to `UC-REC-kid-review` (POST-2), built here and unused until that use case is. Released batches by the one rule in `batchState` (stored `released` or `empty`, or `pending` past `handoffDeadline` and not yet recorded), newest first, each as `{ batchId, releasedAt, bookIds, empty }`. `releasedAt` is the effective release time (`releasedAt`, or `handoffDeadline` for a 2a release not yet recorded, which is the value the release then stores), so the order and the result are the same before and after the timeout release is recorded. It is for ordering only and and is never sent to a child's screen (the release deadline is never shown to the child, Associated Information). `bookIds` is the remaining books as defined under `getBatchForReview`, read through the Catalog's active-only read with the child's current age (`getBooksForReview(ids, { age })`), so a book whose age band no longer contains that age is left out, for a confirmed batch and a 2a release alike. The age comes from the quiz's narrow recommendation reader in `child-identity.ts`, read once per call; if that read fails or returns no age, the call throws and returns no books. `empty` is true when that list is empty, whatever the stored status, so a batch the parent emptied and never confirmed (2a), or one left holding only blocked or excluded books, also gives the child 4a's message. Showing that message from `empty`, with no status shown, is `UC-REC-kid-review`'s. It never returns `removedBookIds`. Which books still await a reaction is that use case's.
- `src/server/recommendation/batch-state.ts` (pure, not `server-only`): `batchState(batch, now)` and the matching query filters for "pending" and "released", so the deadline rule is written once (§8.2.2). Unit-tested with a fixed clock (§8.2.10).
- `src/server/catalog/books.ts` (reused): gains `getBooksForReview(ids)`, the title, author and tags (genres, subjects, moods, length) of the active books among `ids`, one query. Draft and blocked books are absent. Given `{ age }` (the child-facing call only), the same query also requires the book's current `ageMin` and `ageMax` to contain that age, inclusive, the rule the quiz's `listRuleCandidates` applies; a book without a valid age band is absent. The parent's review read passes no age, so the parent still sees every remaining book.
- `src/server/accounts-family/book-reports.ts` (from [`par.md`](par.md), not built yet): `listExcludedBookIds(childId): Promise<string[]>` is read here, and the transaction handle `tx` is `Tx` from `src/server/lib/db.ts`. If this use case is built first, it builds `listExcludedBookIds` as `par.md` specifies (a read of `childBookExclusions` by `childId`), never a stub: no exclusion can exist before `reportBook` does, but a stub left in place would let a reported book reach the child (`KD-book-exclusion`). `reportBook` gains the one call to `removeFromPendingBatchInTx` inside its transaction, as `par.md` says. Whichever of this use case and `UC-PAR-report-book` is built second wires that call.
- Batch entry point for `UC-PAR-report-book`: `.../recommendations/[batchId]/[bookId]/report/page.tsx`, the path [`par.md`](par.md) left to this use case. It checks in the same order as `par.md`'s shelf entry point: `requireParent()` (no session: redirect to `/sign-in`; not a parent: `notFound()`), `getChildForFamily(familyId, childId)` (another family's or an unknown child: `404`), `isExcluded` (7c: "already reported", no form), `isInPendingBatch(childId, batchId, bookId)` (PRE-3: a book not in this pending batch, or a batch past `handoffDeadline`, is the `404`), then `getBooksForReview([bookId])` for the title. It renders `par.md`'s `ReportForm`, calls its `reportBook`, and links back to the batch page. Built with whichever of the two use cases is built second, since it needs both.
- `src/server/lib/config.ts` (reused): gains `BATCH_REVIEW_WINDOW_HOURS`, an integer from 1 to 168, default 24, provisional (`OI-69`, [`rec-field-values.md`](rec-field-values.md)) (§8.2.6). It is the "downstream parent-review handoff duration" that the batch insert of `UC-REC-recommend-quiz-rules` adds to `createdAt` to store `handoffDeadline` (Rules quiz data). There is no other deadline and no second setting.
- Reused as they are: `requireParent`, `getChildForFamily`, `isConsentConfirmed`, `action-result.ts`, `clock.ts` (`now()`), `log.ts`, `db.ts`.

## Sequence

### UC-REC-kid-onboarding: capture a child's reading interests and favorite books

```mermaid
sequenceDiagram
    actor P as Parent
    participant UI as reading-profile page
    participant ACT as saveReadingProfile
    participant IA as Identity & Access
    participant AF as Accounts & Family
    participant CAT as Catalog
    participant REC as Recommendation
    participant DB as Database
    P->>UI: Arrive from UC-PAR-create-kid-account step 9 (step 1)
    UI->>IA: requireParent()
    UI->>AF: getChildForFamily(familyId, childId) (PRE-2)
    UI->>REC: isOnboardingComplete(familyId, childId) (PRE-3)
    alt not in the family, or unknown
        UI-->>P: Not found
    else already complete (1a)
        UI-->>P: Error shown to the parent, no form
    end
    UI->>CAT: listPickerBooks()
    UI-->>P: Interest options, catalog picker and privacy notice block (step 2)
    P->>UI: Select zero or more interests (step 3)
    P->>UI: Select zero or more favorite books (step 4)
    P->>UI: Save
    UI->>ACT: saveReadingProfile(childId, interests, bookIds)
    ACT->>IA: requireParent()
    ACT->>AF: getChildForFamily(familyId, childId) (PRE-2)
    ACT->>AF: isConsentConfirmed(familyId)
    ACT->>ACT: Validate with the zod schema (steps 3, 4)
    ACT->>REC: saveOnboardingProfile(session, childId, input) (step 5)
    REC->>AF: getChildForFamily(familyId, childId) (PRE-2)
    REC->>CAT: findActiveBookIds(bookIds) (4a)
    alt a book is not an active catalog book (4a)
        REC-->>ACT: INVALID_BOOK
    end
    REC->>DB: Insert profile, complete, only if none is complete (step 5, PRE-3)
    alt write fails (5a)
        DB-->>REC: error
        REC-->>ACT: SAVE_FAILED
    else already complete (1a)
        REC-->>ACT: ONBOARDING_ALREADY_COMPLETE
    end
    REC-->>ACT: ok
    ACT-->>UI: ok
    UI-->>P: Redirect to onboarding-complete (step 6, PAR step 10)
```

The family check runs first, so a child outside the family gets `CHILD_NOT_FOUND` whatever else is wrong with the request. Consent and the family check come from `BR-kid-data-stored` and §8.1 and implement no extra step; the consent check is an assumption listed under Open questions.

### UC-REC-recommend-quiz-rules

```mermaid
sequenceDiagram
    actor Child
    participant UI as Child home and quiz
    participant REC as Recommendation
    participant Data as Owning components
    Child->>UI: Get recommendations (1)
    UI->>REC: Start quiz (1)
    REC->>Data: Check session and profile readiness (1)
    REC-->>UI: Open fixed quiz options (2)
    Child->>UI: Pick one answer per question (3)
    UI->>REC: Submit selections and request ID (3)
    REC->>Data: Check consent and read eligible books and child signals (4)
    REC->>REC: Rank matches and select up to the OI-2 maximum (5)
    REC->>REC: Commit one pending rules batch (6)
    REC-->>UI: Recommendations sent for parent review (6)
```


### UC-REC-parent-review: parent reviews a child's recommendation batch

```mermaid
sequenceDiagram
    actor P as Parent (Main or Sub)
    participant HOME as Parent home
    participant UI as Batch page
    participant ACT as Batch actions
    participant IA as Identity & Access
    participant AF as Accounts & Family
    participant REC as Recommendation
    participant CAT as Catalog
    participant DB as Database
    Note over DB: UC-REC-recommend-quiz-rules stored the batch as pending, with handoffDeadline
    P->>HOME: Open /parent
    HOME->>REC: listPendingBatchesForFamily(familyId)
    REC->>AF: listChildrenForFamily(familyId)
    REC->>DB: Batches of those children, pending and before handoffDeadline
    HOME-->>P: "Recommendations to review" with the child's nickname (step 1)
    P->>UI: Open the batch (step 2)
    UI->>IA: requireParent()
    UI->>REC: getBatchForReview(familyId, childId, batchId)
    REC->>AF: getChildForFamily (PRE-2)
    REC->>DB: The batch by _id and childId
    alt another family, unknown child or batch
        UI-->>P: 404
    else no longer pending (confirmed, or past handoffDeadline: 2a)
        UI-->>P: Already released, no controls
    end
    REC->>AF: listExcludedBookIds(childId)
    REC->>CAT: getBooksForReview(bookIds)
    UI-->>P: Each book with title and tags, and when the batch goes to the child (step 3)
    loop for each book the parent objects to, or none (step 4)
        P->>UI: Remove
        UI->>ACT: removeBookFromBatch(childId, batchId, bookId)
        ACT->>IA: requireParent()
        ACT->>REC: removeBookFromBatch(session, input)
        REC->>AF: getChildForFamily, isConsentConfirmed
        REC->>DB: If pending and before handoffDeadline: move the book to removedBookIds (step 4)
        alt nothing matched
            REC-->>ACT: BATCH_ALREADY_RELEASED, BATCH_NOT_FOUND or BOOK_NOT_IN_BATCH
        end
        ACT-->>UI: ok, the book leaves the list
    end
    opt the parent reports a book instead (UC-PAR-report-book 7d)
        P->>UI: Report, then the report page
        Note over REC: reportBook calls removeFromPendingBatchInTx in its transaction
    end
    P->>UI: Confirm (step 5)
    UI->>ACT: confirmBatch(childId, batchId)
    ACT->>IA: requireParent()
    ACT->>REC: confirmBatch(session, input)
    REC->>AF: getChildForFamily, isConsentConfirmed
    REC->>DB: If pending and before handoffDeadline: status released, or empty if no book left, releasedAt now (steps 5, 6, 4a)
    alt write fails (5a)
        DB-->>REC: error, batch still pending
        REC-->>ACT: SAVE_FAILED
    else already released, by the other parent or the deadline
        REC-->>ACT: BATCH_ALREADY_RELEASED
    end
    ACT-->>UI: ok
    UI-->>P: Released to the child (step 6)
    Note over REC,DB: UC-REC-kid-review reads listReleasedBatchesForChild: released, empty, or pending past handoffDeadline (step 6, 2a)
```

Every interaction names a use case step or a precondition. The family and consent checks implement no step; they come from §8.1 and `BR-kid-data-stored` and match the other REC and PAR actions. The deadline rule (2a) is a condition on every read and every write, so the child sees the batch at `handoffDeadline` whether or not anything runs then. Recording it in stored state has two callers and no user step, so it is drawn separately below.

```mermaid
sequenceDiagram
    participant Q as Quiz save (UC-REC-recommend-quiz-rules)
    participant CRON as Scheduled Cleanup (daily)
    participant REC as Recommendation
    participant DB as Database
    Note over DB: A pending batch's handoffDeadline has passed; reads already treat it as released (2a)
    alt the child asks again
        Q->>REC: releaseExpiredBatchInTx(tx, childId), in the save transaction
        REC->>DB: pending and handoffDeadline <= now: released or empty, releasedAt = handoffDeadline
        Q->>DB: Insert the new pending batch (the partial unique index is free)
    else nobody opens anything
        CRON->>REC: releaseExpiredBatches()
        REC->>DB: The same update over every child
    end
```

## API contract

| Endpoint or job | Caller (who may) | Request | Success | Errors, by extension |
|---|---|---|---|---|
| Page `/parent/children/[childId]/reading-profile` (UC-REC-kid-onboarding) | A signed-in parent, Main or Sub, of the child's family | Child ID in the path | The form, the interest options, the catalog picker, the privacy notice block, and the child's nickname and avatar | A child outside the session's family, or unknown: not found, with no hint which. Already complete (1a): the page shows an error to the parent and no form; the child's own access is untouched. No session: redirect to sign-in |
| Server action `saveReadingProfile` (UC-REC-kid-onboarding) | Same; the family comes from the session | Child ID, interests (zero or more, from the fixed list), favorite book IDs (zero or more) | `ok`; the form then navigates to `/parent/children/[childId]/onboarding-complete` (step 6). The result carries no profile data | Not signed in or not a parent: `NOT_SIGNED_IN`, `NOT_A_PARENT`. Child not in the family or unknown: `CHILD_NOT_FOUND`. No confirmed consent: `CONSENT_NOT_CONFIRMED`. 3: `INVALID_INTEREST`. 4a: `INVALID_BOOK` (not in the catalog, draft or blocked), `TOO_MANY_BOOKS`. 1a: `ONBOARDING_ALREADY_COMPLETE`. 5a: `SAVE_FAILED` with an error ID, nothing saved. Selecting no interests or no books is not an error |
| Page `/parent` (UC-REC-parent-review step 1; the existing parent home) | A signed-in Main or Sub Parent | None | The existing home, plus one line per pending batch of the family: the child's nickname, the number of books, when it goes to the child, and a link to the batch page. No line once a batch is confirmed or past `handoffDeadline` | As today: no session, redirect to `/sign-in`; a Main Parent still onboarding is sent on by the gate |
| Page `/parent/children/[childId]/recommendations/[batchId]` (UC-REC-parent-review steps 2–3) | A signed-in Main or Sub Parent of the child's family (`OI-25`) | Child and batch IDs in the path | A pending batch: each remaining book's title, author and tags, the source, when it goes to the child, and the Remove, Report and Confirm controls. A batch no longer pending: "Already released", its remaining books, no controls. Never the removed books | No session: redirect to `/sign-in`. Another family's child, an unknown or malformed child or batch ID, a batch of another child, a child or admin session: the same `404` |
| Server action `removeBookFromBatch` (UC-REC-parent-review step 4) | As above; the family comes from the session | `childId`, `batchId`, `bookId` | `ok` with no data; the book is in `removedBookIds` and no longer in the batch. Removing a book already removed is `ok` | `NOT_SIGNED_IN`, `NOT_A_PARENT`. `INVALID_INPUT` for a request of the wrong shape (a malformed ID is not one; it gets the not-found code). `CHILD_NOT_FOUND` for another family's or an unknown child. `CONSENT_NOT_CONFIRMED`. `BATCH_NOT_FOUND` for an unknown or malformed batch ID or a batch of another child. `BATCH_ALREADY_RELEASED` when confirmed or past `handoffDeadline` (2a). `BOOK_NOT_IN_BATCH`. `SAVE_FAILED` with an error ID, nothing changed |
| Server action `confirmBatch` (UC-REC-parent-review steps 5–6, 4a) | As above | `childId`, `batchId` | `ok` with `state`, either `released` or `empty` (4a: every book was removed); the batch is released to the child by this write | As above for session, child, consent and batch. `BATCH_ALREADY_RELEASED` when the other parent confirmed first or `handoffDeadline` has passed. 5a: `SAVE_FAILED` with an error ID; the batch stays pending and nothing reaches the child. 6a cannot occur apart from 5a (see Key decisions) |
| Page `/parent/children/[childId]/recommendations/[batchId]/[bookId]/report` (UC-PAR-report-book from step 4) | As above | Child, batch and book IDs in the path | `par.md`'s report screen and action, returning to the batch page | As `par.md`'s shelf entry point, with `isInPendingBatch` as the PRE-3 check: a book not in this pending batch, or a batch past `handoffDeadline`, is the same `404` |
| Function `listReleasedBatchesForChild(childId)` (UC-REC-parent-review step 6, POST-2; for `UC-REC-kid-review`) | Recommendation only, called by the child's recommendation list once a child session has been checked | Child ID | Released batches newest first, each as `{ batchId, releasedAt, bookIds, empty }`: the remaining books (minus exclusions, blocked and draft books, and books whose current age band no longer contains the child's age), and `empty` when none remain, whatever the stored status. `releasedAt` is for ordering and is never shown to the child | None of its own; a failed read throws to the caller's error handling |
| Job: Scheduled Cleanup route `/api/cron/cleanup` calls `releaseExpiredBatches()` (UC-REC-parent-review 2a, stored state) | Vercel cron only, `Authorization: Bearer <CRON_SECRET>` (§8.1), as the route already checks | None | The route's existing `ok` result, with the number of batches released among its counts; every pending batch past `handoffDeadline` is now `released` or `empty` | The route's existing `CLEANUP_FAILED` with an error ID; nothing is lost, since reads already treat the batches as released and the next run or quiz save records them |

Nothing in `UC-REC-kid-onboarding` is sent to a child's screen (`BR-parent-creates-kid-account`, §8.2.11).

Nothing in `UC-REC-parent-review` is sent to a child's screen. The removed books are never returned by any function a child session can reach (POST-2).

### Rules quiz API contract

| Entry | Request | Success | Refusal or failure |
|---|---|---|---|
| `startRecommendationQuiz` (1, 1a) | Signed-in child. No child ID in the request. | Opens `/child/recommendations/quiz` when no pending batch before its `handoffDeadline` exists. If one exists, returns its acknowledgment without opening another quiz. | Signed out or wrong role, consent unavailable, `RULES_UNAVAILABLE` if `RECOMMENDER_MODE` is not `rules` or dependencies prevent the flow, or `PROFILE_INCOMPLETE` after recording the failed request. Show “Ask a parent to finish your profile.” |
| `/child/recommendations/quiz` (2, 2a) | Child session. No parameters. | Fixed options, the existing online-privacy-notice URL and a random submission ID for this form when no pending batch exists; otherwise the existing-batch acknowledgment with the notice link. Leaving discards the selections. | Same read guards and production notice failure behavior as onboarding. A direct visit or prefetch never writes a failed-request event. |
| `submitRecommendationQuiz` (3–6) | Child session, one approved option per question and the form's UUID. | `ok` with the acknowledgment “Your recommendations were sent for parent review.” The same UUID returns the acknowledgment for its existing batch. If another pending batch exists, return its acknowledgment without storing the new answers or creating a batch. | Start refusals, including configured mode, are checked again for a new submission. `INVALID_QUIZ` gets a field highlight (3a). `NO_MATCHES` offers restart (4a). `LOAD_FAILED` offers retry (4b). `SAVE_FAILED` offers a retry with the same UUID (6a). |

## Key decisions

**The reading profile lives in Recommendation, keyed by the child ID, not in the Child Identity Store.** Interests and favorite books are not identifying, and the architecture puts them under the opaque ID (§5.2). Rejected: the Child Identity Store, which would widen the one collection `KD-pii-segregation` keeps small. Also rejected: Accounts & Family, whose §5.2 row said it owned the "onboarding answers"; that wording contradicted Recommendation's row and is corrected here.

**The child sees no raw interests or favorites.** The use case's table and `BR-kid-data-stored` said "visible to parent and child"; both are edited in this pull request to "parent only; the child sees only the derived interest profile", which is the dashboard's radar chart with no numbers (`UC-SHLF-kid-dashboard`). §8.2.11 allows a child's screen to show only book data, nickname and avatar, and no child function returns the stored lists. Rejected: a child-callable read.

**Interests are stored as a plain list of fixed values with no strengths.** The Interest Profile's relative strengths are built by the recommender from later choices and ratings, which `UC-REC-recommend-quiz-rules` owns. Rejected: inventing a strength model here.

**A missing profile means onboarding is incomplete.** Nothing is written until step 5, and the use case has no skip extension. Rejected: an `incomplete` record, which is a status field no use case reads.

**"Already complete" (1a) is enforced by the write, not only by a read before it.** One conditional insert fails if a completed profile exists, so two simultaneous saves leave one and the second gets the error (§8.2.8). Rejected: read then write, which lets both through. The error concerns the parent's screen only; nothing here changes the child's login or access.

**Step 6 always redirects to the completion page, with no return parameter.** The use case's "if started from" has one other entry, the re-fill after `UC-PAR-delete-child-data`, whose design may add its own landing. Rejected: a caller-supplied return URL, an open redirect.

**The picker loads every active book on the server.** The seed catalog is small (`AS-seed-catalog-size`). Rejected: a search action now, which no step asks for; revisit when the catalog grows (`KD-catalog-import-offline`).

**Blocked books are left out by the Catalog; per-child report exclusions are not applied.** A child being onboarded has no reports, and the picker is not a recommendation or search query (`KD-book-exclusion`). The re-fill after data deletion removes the exclusions with the rest of the child's data.

**The admin sees one child's interests and favorite books only through the audited usage lookup.** `UC-ADM-view-usage-stats` lets the admin check which interests and favorite books are common overall, with small counts hidden, but its child lookup never returns one child's interests or favorites. The totals are built later in that use case as aggregate functions in Recommendation that return counts keyed by interest or book and never a child ID. Rejected: any per-child read of the profile for the admin (`BR-admin-limited-view`, `KD-pii-segregation`).

**The profile keeps a save time, so the admin can count onboardings in a period.** `UC-ADM-view-usage-stats` lists "Onboardings completed" as a total for the chosen date range, and a count over a period needs the time each onboarding finished. Account creation dates cannot serve, because a parent may leave a child's onboarding unsaved (`OI-39`), so sign-ups and completions differ. The admin sees a count only, never which child or when (`BR-admin-limited-view`). The count is built later with `UC-ADM-view-usage-stats` as aggregate functions in Recommendation that return numbers; they are not built here, and no admin-callable function returns a profile or its time. Rejected: no time field, which makes the figure impossible; a separate event log, a second collection for one number. No index on `savedAt` now, as the seed catalog and family numbers are small. The figure is a team proposal and still needs confirming (`UC-ADM-view-usage-stats` Open Issues).

### Rules quiz decisions

**Keep the quiz short.** Ask about mood and length. Each question has an explicit **Any** answer, so a blank answer remains distinguishable from no preference. Requests use exact approved catalog tags from [the field table](rec-field-values.md#rules-quiz-proposal-oi-2). The proposal leaves these choices, batch size and ranking under `OI-2`. Rejected: a longer interest questionnaire or free text, which repeats onboarding and weakens structured responses; and treating an unanswered question as **Any**, which hides 3a.

**Filter before ranking.** Catalog returns active, tagged books whose inclusive age band contains the child's recorded age. It excludes book IDs supplied by Accounts & Family and enforces the chosen mood and length. Catalog skips rows missing required tags or a valid age interval. When the query finishes with zero matches, show 4a. When a read fails, show 4b and keep the answers. Never broaden the query after seeing the results. Rejected: ranking before exclusion, which wastes reads and risks an excluded book entering the candidate set; and broadening after zero matches, which 4a forbids.

**Age and grade come first, without drowning out interests.** Put each eligible book in one of three age-fit groups: **2** when both the child's age and grade-reference age fall inside its age band; **1** when the child's age is inside and the grade-reference age is at most one year outside; **0** when the child's age is inside but the grade-reference age is farther away. The Catalog filter already guarantees that the child's age is inside. Rank a higher group first. Within a group, rank by interest score, then by distance from the child's age to the band midpoint, then by opaque book ID in ascending ordinal order. A comparable parent-entered level adds one interest point; an absent or incomparable level adds zero. The grade reference uses preschool = 4, kindergarten = 5, and grades 1–12 = grade + 5. This compares a grade to catalog age bands; it does not produce a reading level. A missing onboarding profile or absent history is neutral. Rejected: continuous midpoint distance before interests, which makes ratings, reactions, notes and shelf history almost tie-break-only; and treating a missing level as a poor score, which penalizes a child for not supplying optional data.

**Use each account's existing signals.** Calculate interest strengths on demand using the rules in [the field table](rec-field-values.md#rules-quiz-proposal-oi-2). The child sees no inputs, scores or note text. Accounts & Family supplies recognized preference keys from the latest retained `parentNotes` record by `savedAt`; that collection has no setup/finish type, so this design does not invent one. A separate finish-note source is not designed and contributes zero until its owning use case exposes a typed read. Ratings, reactions and shelf history use bounded reads from their owners; a source that does not exist yet is neutral. All processing stays on the server. No note text or raw quiz answers are copied into a batch or logs. Rejected: inferring note types from free text, reading another component's collections directly, or generating interests at quiz time, which would require a backend the use case does not ask for.

**Fail closed on reads.** Consent, exclusion and candidate-catalog reads are mandatory. An absent onboarding profile contributes no onboarding/favorite signals; only absent age or grade follows 1a. A read error after the guard produces `LOAD_FAILED`, not a neutral profile. An error from any already-available notes, reactions, shelf-history, ratings or history-feature read also produces `LOAD_FAILED` with no batch. Neutral means that the owner has no matching records or that its source/API is explicitly not yet designed, never that a read failed. Rejected: treating exclusions or failed existing signals as empty, which could return a reported book or silently discard required inputs.

**Save once and hand off by state.** Use one transaction for the final consent guard, exclusion read, catalog reads and batch write. Take `lockChildForWrite(tx, childId)` from #119 ahead of the consent lock, then use `lockConsentForWrite` before reading exclusions, as in the report design. Report and quiz writes then serialize on the Consent Record. The quiz only saves `pending`. The parent-review flow owns notification, release and the final age/status/exclusion checks. Its handoff contract supplies the configured duration (`BATCH_REVIEW_WINDOW_HOURS`) used to store `handoffDeadline` at creation, and releases every pending batch at that deadline (`UC-REC-parent-review` 2a, below): every read treats it as released from that instant, and its stored status leaves `pending` at the child's next quiz save or the next daily cleanup run, whichever comes first, within the bounded timeframe stated in the published privacy notice. REC starts no second retry queue or timer. For a global block racing a list write, use the Catalog write contract once it is agreed in #109 (`OI-58` on that branch). Keep the quiz entry unavailable for real use until that bounded parent handoff is built (`UC-REC-parent-review`, designed below) and the child-deletion guard and concurrent block contract are available. Fixture data can exercise the flow before those dependencies land. Rejected: a read-only child check, whose snapshot would not conflict with deletion; and enabling the entry before the parent handoff, which would strand pending batches.

**Retry the same request, with one pending batch per child.** Authentication and consent checks precede every acknowledgment. An existing same-request UUID is acknowledged before new-request mode/profile gates; a genuinely new request passes every gate. Uniqueness on child ID and request UUID handles double-clicks, connection loss and concurrent retries. On insert collision, abort the failed transaction and classify the index by its key pattern: `{ childId, requestId }` means read and acknowledge that request's batch for the session's child; the partial pending index means read and acknowledge the child's current pending batch. Keep the answers and UUID together on retry. If the child edits an answer, issue a fresh UUID for the changed request. Restart creates a new UUID and resets the quiz. On an uncertain write result, the retry uses the same UUID. A partial unique index on `childId` for `status: pending` permits only one open batch, even across different request IDs. Start and Submit return an existing unexpired pending batch's acknowledgment without storing another set of answers; after parent review resolves it, a new request may create one. A batch is live only before its stored `handoffDeadline`. At or after that instant it is released to the child (`UC-REC-parent-review` 2a), so Start and the quiz page treat the child as having no pending batch, and Submit's transaction calls `releaseExpiredBatchInTx(tx, childId)` before its insert. That records the release and frees the partial unique index in the same transaction, so the new batch is saved; if the insert then fails, the release rolls back with it and is recorded later by the same call or by the daily cleanup. At review time `removeFromPendingBatchInTx` removes a reported book from every matching pending batch for that child. Rejected: unlimited pending batches, which grows an unreviewed parent queue without bound; and an IP/time rate limit, which neither bounds stored batches nor fits shared households.

### UC-REC-parent-review

**Release is the confirmation's write, not a step after it.** `confirmBatch` sets the batch `released` (or `empty`) in one conditional update, and `UC-REC-kid-review` reads released batches. A batch is one document, so the child sees all of its remaining books or none, and there is no hand-off that can fail on its own; 6a is folded into 5a in the use case (developer decision 2026-11-23). Rejected: copying the books into a separate child-facing list on release, which is a second write that can fail between the two and would need the retry 6a described, a retry queue no other requirement asks for.

**Each removal is saved when the parent taps Remove.** A parent who removes books and then leaves without confirming keeps those removals, and the batch is released at the deadline without them (2a), which is what `BR-parent-ultimate-say` needs. It is also how `UC-PAR-report-book` 7d reads: the book leaves the batch "as if the Parent had removed it" and the batch stays in review. Rejected: holding removals in the page until Confirm (developer decision 2026-11-23), where a parent who runs out the window or closes the tab loses them and the child sees the books.

**An unconfirmed batch is released by a stored deadline checked on read (2a).** The batch stores `handoffDeadline` when it is created (creation time plus `BATCH_REVIEW_WINDOW_HOURS`, 24 hours provisional, `OI-69`), and every read and write compares it with `now()` (`KD-time-rules-on-read`, §8.2.2). The deadline is the quiz's `handoffDeadline`, one stored value; this use case adds no second deadline field (changed in review of #118, 2026-11-24). `batchState` is the one place that turns "pending and past `handoffDeadline`" into released, so the child sees the batch at the deadline whether or not anything has run.

**The timeout release is then recorded in stored state, by the next quiz save or the daily cleanup.** A batch left `pending` past its deadline would hold #115's one-pending-batch index, so the child could not ask again, and a stored `pending` would outlive the review window that the privacy notice states. `releaseExpiredBatchInTx` runs inside the quiz's save transaction, so a child who asks again never waits for the cron; `releaseExpiredBatches` runs in the daily Scheduled Cleanup, so a batch nobody touches leaves `pending` within a day of its deadline. Each sets `released` or `empty` exactly as a confirmation would, with `releasedAt` equal to `handoffDeadline`, so what every read returns is the same before and after; correctness never depends on either running, which is what `KD-time-rules-on-read` asks of a scheduled job. This refines architecture §5.2's Scheduled Cleanup row, which listed only deletions (see "Changes to the architecture-of-record"). Rejected: leaving the status `pending` for ever, which blocks the next quiz (review of #118); deleting the batch at the deadline, which would take the released books away from the child; writing the status from the child's or parent's reads, which would make a GET change data (§8.2.3) and still leave untouched batches `pending`; and computing the deadline from `createdAt` and the current setting, which would move every waiting batch's deadline when the setting changes (§8.2.2 says each time-limited state stores its own deadline).

**The deadline applies whether or not the parent opened the batch.** The use case's 2a says "does not open"; a parent who opens the batch and stops before confirming is not covered. This design releases at the deadline in both cases, with the removals already made. Rejected: stopping the clock once the parent opens the batch, which could hold the child's books for ever with no rule to release them.

**Two parents, or a parent and the deadline, are settled by conditional updates.** Every removal and the confirmation match only a batch that is `pending` with `handoffDeadline` still ahead, and the timeout release matches only one whose `handoffDeadline` has passed (§8.2.8: a release is a single-actor state change). The first change wins; the other gets `BATCH_ALREADY_RELEASED` and the page shows the released batch. `confirmBatch` decides `released` or `empty` inside the same update with a pipeline, so a removal by the other parent cannot slip between reading the books and writing the status. Rejected: a transaction around a read and a write, which adds nothing a single-document update does not already give.

**The "batch ready" notice is the pending batch itself (step 1).** The parent home lists the family's pending batches, read from Recommendation. The notice persists until the batch is confirmed or its deadline passes, which is exactly as long as it is true, and it is in-app as `CI-in-app-alerts` asks (developer decision 2026-11-23). Rejected: a stored parent notice in Notification, which every confirmation, report and deadline would have to clear, a second record of the batch's state. This is a refinement of architecture §5.2's Notification row; see "Changes to the architecture-of-record".

**Exclusions, blocks and age eligibility are applied when books are read, not only when the batch was made.** A book reported for the child while the batch is pending leaves the batch through `removeFromPendingBatchInTx`; a book reported or blocked after release is filtered by `listReleasedBatchesForChild` (exclusions) and by the Catalog's active-only reads (blocks), as `KD-book-exclusion` and `par.md`'s risk on build order ask. The quiz design leaves the final age, status and exclusion checks to this hand-off, and a book can stay active while an admin changes its suggested age range (`UC-ADM-edit-content` POST-2), so the child-facing read also checks the book's current age band against the child's current age (changed in review of #118, 2026-11-24). Rejected: re-checking only at confirm, which a 2a release never passes through.

**The batch entry point for reports is a page under the batch.** `par.md` left its path to this use case. Rejected: reporting inline on the batch page, which would duplicate `par.md`'s form and its warning step.

**Removed books are kept on the batch for the parent only.** `removedBookIds` is the use case's "Removed books" (Associated Information), and POST-1 needs every book to be either removed or released. No child-callable function returns it. Whether the recommender learns from a parent's removal is `OI-2`'s; nothing here reads it for that.

## Data model

New collection `readingProfiles` (Recommendation), one document per child with a completed onboarding:

```mermaid
erDiagram
    CHILD ||--o| READING_PROFILE : "starting profile"
    READING_PROFILE {
        string childId "unique, the internal child ID"
        list interests "values from the fixed list"
        list favoriteBookIds "catalog book IDs"
        boolean onboardingComplete "true"
        date savedAt "UTC, from the clock module; when onboarding was completed"
    }
```

- Unique index on `childId`, created by `ensure-indexes.ts`; schema validation as backstop (§8.2.5).
- No name, age, grade or reading level (`KD-pii-segregation`). The purpose of each field is already in `BR-kid-data-stored` ("reading interests, favorite books already read").
- Favorite book IDs reference the Catalog by its internal book ID; the profile copies no book data.
- `savedAt` is set once, at the insert, from `now()`, and never changed. Its only reader is the "onboardings completed" figure of `UC-ADM-view-usage-stats` (see Key decisions). The profile never returns it to a page or a child.
- Deleting a child's data or account removes this document (`UC-PAR-delete-child-data`, `UC-PAR-delete-kid-account`). After a data deletion and a new fill-in, `savedAt` is the later save.

### Rules quiz data

Recommendation adds `recommendationBatches` with the fields below. It uses a unique index on `{ childId, requestId }`, a partial unique index on `{ childId }` where `status` is `pending`, and a lookup index on `{ childId, status, createdAt }`.

| Field | Generation contract |
|---|---|
| `_id`, `requestId`, `childId` | Batch ID, form submission UUID, and opaque child ID from the session. |
| `source`, `status`, `createdAt`, `handoffDeadline` | `rules`, `pending`, and UTC times from the shared clock. Compute `handoffDeadline` once at creation as `createdAt` plus `BATCH_REVIEW_WINDOW_HOURS` (the parent-review handoff duration), and store it on the batch; do not recompute it after configuration changes. It is the batch's only deadline. Parent review owns the duration and every later status change, including the timeout release (`UC-REC-parent-review` data, below). |
| `bookIds` | Ordered IDs of unique candidates. At generation the list is nonempty and contains at most six books under the `OI-2` proposal. Parent decisions or a block may later remove entries. |

A batch is included in the existing review, export and deletion inventory. It contains no age, grade, reading level, raw answers, note, history, or rank scores. The derived interest strengths are recomputed from retained source records. A batch stays pending until a parent confirms it or its stored `handoffDeadline` (whose bounded duration is documented in the privacy notice) is reached, whichever comes first. At the deadline the child can already read it (`batchState`); its stored status changes to `released` or `empty` on the child's next quiz save or the next cleanup run, whichever comes first, and from then on it is the child's released recommendations. Either way it is removed by child data/account deletion or the existing inactivity purge. Parent review owns that deadline and its release behavior (`UC-REC-parent-review` 2a); V1 adds no separate REC timer and never silently expires a parent's queue on its own. Rejected: indefinite retention for an active account, and an independent fixed REC expiry that would conflict with the parent-review contract.

The only new logging case is a fixed `recommendation-request-failed` event with `PROFILE_INCOMPLETE` and an event ID for 1a. It records the occurrence of the refusal, not a per-child history: it contains no child ID or inputs, no later step reads such a history, and the server does not retry that refusal. Rejected: a child-linked audit record, which adds retained correlation without a reader.

`UC-REC-parent-review` adds two fields and two status values to `recommendationBatches`, the collection `UC-REC-recommend-quiz-rules` creates (Rules quiz data, above), and no collection. It uses the quiz's `handoffDeadline` as its only deadline:

```mermaid
erDiagram
    CHILD ||--o{ RECOMMENDATION_BATCH : "recommended to"
    RECOMMENDATION_BATCH {
        id _id
        string requestId "from UC-REC-recommend-quiz-rules"
        string childId
        string source "rules"
        string status "pending; new: released or empty"
        list bookIds "remaining books; removals take books out"
        date createdAt "UTC"
        date handoffDeadline "from the quiz: createdAt plus BATCH_REVIEW_WINDOW_HOURS, set once at insert"
        list removedBookIds "new: books the parent removed, parent only"
        date releasedAt "new: UTC, now() at confirmBatch, or handoffDeadline when the timeout release is recorded"
    }
```

- `handoffDeadline` is written by the batch insert of `UC-REC-recommend-quiz-rules` and never changed. The validator requires it, so no batch can exist without a deadline.
- The other fields are the quiz's (Rules quiz data): `requestId` the form's UUID, `childId` the opaque string child ID, `bookIds` ordered string book IDs (one to six at insert), `createdAt` from `now()`. This design fixes `_id` as an `ObjectId` set by the insert, which the batch ID check above relies on. The insert sets `handoffDeadline` from the same `now()` value as `createdAt`, plus `BATCH_REVIEW_WINDOW_HOURS`.
- `status` leaves `pending` when `confirmBatch` sets `released` or `empty`, or, for a batch nobody confirmed, when the timeout release is recorded (by the child's next quiz save, or at the latest the first daily cleanup run after `handoffDeadline`). Between the deadline and that record, `batchState` already treats the batch as released, so the readers go by the filters in `batch-state.ts`, never by the stored value alone. Leaving `pending` frees the quiz's partial unique index on `{ childId }` for `status: pending`, so the child keeps at most one pending batch and can always ask again once it is released.
- `removedBookIds` holds book IDs only, each one that was in `bookIds`. It is the parent's; no child-callable function returns it (POST-2).
- #115's index `{ childId, status, createdAt }` serves the family list, the review read and the released read; no new index.
- The validator (`ensureCollection`, §8.2.5) gains `removedBookIds` and `releasedAt`; `status` is the enum above, and `handoffDeadline` stays required.
- Deleting a child's data or account removes the child's batches with the rest (`UC-PAR-delete-child-data`, `UC-PAR-delete-kid-account`), as #115 already lists them. The batch holds no new kind of child data: it is the recommendations `BR-kid-data-stored` already names.

## Reuse & cross-cutting

- **Authentication and authorization:** `requireParent()` and the family check on page and action (`KD-auth-sessions`, §8.1).
- **Error handling:** the shared result helper (§8.2.1).
- **Time:** `savedAt` from the clock module, stored in UTC, set once at the insert (§8.2.2). The date range of the admin's figure is applied on read; nothing is purged by age.
- **API conventions:** a verb-first server action; session, validation, then the owning component (§8.2.3).
- **Code conventions:** `server-only` on every module under `src/server/`; only Recommendation touches `readingProfiles`; only the Catalog touches books (§8.2.4).
- **Validation:** one zod schema for form and action; choices come from fixed lists, never free text (§8.2.5, `BR-child-structured-responses`).
- **Privacy notice:** a placeholder paragraph and a "read and agree" checkbox on the form for now, to be replaced by the client's notice, with the link from `getPrivacyNoticeUrl()` already shown (`FR-DATA-notice`, `BR-coppa-notice`). The notice text, which covers this data's purpose and retention, is the client's and a lawyer's to supply.
- **Parent rights:** `UC-PAR-review-child-data` shows the profile (interests, favorite books) and includes it in the downloadable copy; `UC-PAR-delete-child-data`, `UC-PAR-delete-kid-account` and `UC-PAR-revoke-consent` remove it or stop its use (`BR-coppa-parent-rights`, `FR-DATA-review`, `FR-DATA-removal`). This design adds no parent-facing read; Recommendation will export one read by child ID, scoped to the family, when `UC-PAR-review-child-data` is designed.
- **Retention:** the inactivity purge of Scheduled Cleanup deletes the profile and any pending batch with the child's other data once the configurable limit passes (`BR-coppa-retention`, `OI-22`, §8.2.6). For an active account, an unreviewed batch is released to the child at its stored `handoffDeadline` (the review window, `BATCH_REVIEW_WINDOW_HOURS`, which the published notice states) and is no longer stored as `pending` after the next daily cleanup run at the latest; from then on it is the child's released recommendations and follows the inactivity purge. Child-data/account deletion still applies immediately.
- **Logging:** never the interests, favorite books, or the child ID tied to them (§8.2.7).
- **Persistence:** the conditional insert (§8.2.8). No transaction is needed: one document is written.

Not used: Notification (no alert is asked for), the audit log (not in the §8.2.9 list), and the Child Identity Store.

`UC-REC-parent-review` reuses `requireParent()` and the family check inside data access (`getChildForFamily`, §8.1), `isConsentConfirmed`, the result helper (§8.2.1), `now()` and the deadline-on-read rule (§8.2.2, `KD-time-rules-on-read`), the action shape (§8.2.3), the Catalog's active-only reads (§8.2.4), `listExcludedBookIds` from [`par.md`](par.md) (`KD-book-exclusion`), and conditional updates for a single-actor state change (§8.2.8). Configuration: `BATCH_REVIEW_WINDOW_HOURS` (§8.2.6). Logging: never the child ID with book IDs, the nickname or a removal (§8.2.7); a failed save logs an error ID only. Scheduled Cleanup: `releaseExpiredBatches` joins the daily route, logging a count only. Not used: Notification (the batch-ready notice is read from the batches; see Key decisions), the audit log (batch review is not in the §8.2.9 list), the Child Identity Store, Shelf, and email.

## Tests

| Use case, flow | Level | Asserts |
|---|---|---|
| UC-REC-kid-onboarding main | integration | A parent of the family saves interests and favorite books: one profile keyed to the child, complete, with the chosen values and a `savedAt` equal to the clock module's `now()` (POST-1 to POST-3) |
| UC-REC-kid-onboarding main | end-to-end | From the PAR credentials screen the parent reaches the form, picks, saves and lands on "onboarding complete" (steps 1 to 6) |
| UC-REC-kid-onboarding 3, none selected | integration | An empty interest list is accepted and onboarding is complete |
| UC-REC-kid-onboarding 4, no favorites | integration | An empty book list is accepted and saved (POST-2) |
| UC-REC-kid-onboarding abandoned | end-to-end | Leaving the form without saving writes nothing: no profile exists and the child account is unchanged |
| UC-REC-kid-onboarding 3, invalid | unit | A value not on the interest list is refused with `INVALID_INTEREST`; duplicate interests and books are collapsed |
| UC-REC-kid-onboarding 4a | integration | An unknown, draft or blocked book ID is refused with `INVALID_BOOK` and nothing is saved |
| UC-REC-kid-onboarding 4a, cap | unit | More than 10 books are refused with `TOO_MANY_BOOKS` |
| UC-REC-kid-onboarding 5a | integration | When the write fails the result is `SAVE_FAILED` with an error ID and no profile exists |
| UC-REC-kid-onboarding 5a | end-to-end | After a failed save every selection is still in the form |
| UC-REC-kid-onboarding 1a | integration | A second save returns `ONBOARDING_ALREADY_COMPLETE` and changes nothing, and two simultaneous saves leave exactly one profile |
| UC-REC-kid-onboarding 1a | end-to-end | Opening the form for a completed child shows the parent an error and no form; the child can still sign in |
| UC-REC-kid-onboarding PRE-2 | integration | A child ID from another family, or an unknown one, gets the same not-found result on page and action (`CHILD_NOT_FOUND`) and nothing is saved |
| UC-REC-kid-onboarding consent | integration | A family without confirmed or with revoked consent gets `CONSENT_NOT_CONFIRMED` and nothing is saved |
| Authorization | integration | A Sub Parent of the family may save; a Sub Parent of another family gets `CHILD_NOT_FOUND`; a child session and an admin session are refused |
| Check order | integration | A foreign child ID with an invalid interest returns `CHILD_NOT_FOUND`, not `INVALID_INTEREST`, and a duplicate-key error from a simultaneous save returns `ONBOARDING_ALREADY_COMPLETE` |
| Step 6, redirect | integration | The redirect target is always the child's completion page, whatever the request carries |
| Admin boundary | integration | No admin-callable function returns the profile outside the audited usage lookup, and that lookup returns no identifying field. |
| Privacy notice | end-to-end | The form shows the notice block, Save stays disabled until the parent ticks the unticked-by-default checkbox, and the notice link opens the same location as the Add a child form in a new tab and the selections are still there after closing it |
| Child-facing read | integration | No function a child session can call returns the interests or favorite books (§8.2.11) |
| Logging | integration | After a success and a failure the logs contain no interests, favorite books or child ID |
| UC-REC-parent-review main | integration | Under a fixed clock, with a pending batch of three books: the review read returns the three with title, author and tags; removing one moves it to `removedBookIds`; `confirmBatch` sets `released` and `releasedAt` to `now()`; `listReleasedBatchesForChild` returns the batch with the two remaining books (POST-1, POST-2) |
| UC-REC-parent-review main | end-to-end | A parent sees "Recommendations to review" on `/parent`, opens the batch, removes a book, confirms, and sees "Released"; the line is gone from `/parent` (steps 1–6) |
| UC-REC-parent-review 1, list | integration | `listPendingBatchesForFamily` returns pending batches before `handoffDeadline` for every child of the family, and none that are released, empty, past `handoffDeadline`, or of another family |
| UC-REC-parent-review 2, access | integration | Another family's child, an unknown or malformed child or batch ID, and a batch of a different child of the same family all give the same `404` on the page and `CHILD_NOT_FOUND` or `BATCH_NOT_FOUND` on both actions, and change nothing; a child or admin session is refused; a Sub Parent of the family may remove and confirm |
| UC-REC-parent-review 3, books | integration | A book blocked or turned back to draft while the batch is pending, and a book reported for this child, are not shown; the removed books are never in the page's data |
| UC-REC-parent-review 4, none removed | integration | Confirming with no removals releases every book |
| UC-REC-parent-review 4, repeat | integration | Removing the same book twice is `ok` and leaves it once in `removedBookIds`; a book not in the batch is `BOOK_NOT_IN_BATCH` |
| UC-REC-parent-review 4, saved at once | integration | After a removal and no confirmation, the batch released at `handoffDeadline` (2a) does not contain the removed book |
| UC-REC-parent-review 4a | integration and end-to-end | Removing every book and confirming sets `empty`; `listReleasedBatchesForChild` returns the batch with no books; the page shows the 4a wording before Confirm |
| UC-REC-parent-review 4a, empty to the child | integration | `listReleasedBatchesForChild` returns `empty: true` for a batch the parent emptied and never confirmed, once past `handoffDeadline`, and for a confirmed batch whose only remaining books were blocked or reported after confirmation; no child-facing page renders `releasedAt` |
| UC-REC-parent-review input | integration | A malformed child ID gives `CHILD_NOT_FOUND` and a malformed batch ID `BATCH_NOT_FOUND` on both actions, the same as unknown ones; a missing or non-string field gives `INVALID_INPUT` |
| UC-REC-parent-review report entry page | integration (built with `UC-PAR-report-book`) | Another family's child gives the `404` before `isInPendingBatch` is called; a book already reported for the child shows 7c with no form |
| UC-REC-parent-review 2a | unit | `batchState` and its query filters, with a fixed clock: pending one millisecond before `handoffDeadline`, released at `handoffDeadline` and after; stored `released` and `empty` are unaffected by the clock |
| UC-REC-parent-review 2a, read | integration | With the clock past `handoffDeadline`, no parent activity and nothing run, the batch is in `listReleasedBatchesForChild` with every book and its release time is `handoffDeadline`, and it is gone from `/parent` |
| UC-REC-parent-review 2a, no page opened | integration | A quiz batch stored through the quiz's save path; the clock moves past `handoffDeadline` with no parent activity and no page opened; the cleanup route runs (with the cron secret). The stored batch is `released` with `releasedAt` equal to `handoffDeadline`; `listReleasedBatchesForChild` returns the same books as before the run; the child's next quiz submission saves a new pending batch. A second run changes nothing. A batch the parent emptied without confirming is stored `empty` |
| UC-REC-parent-review 2a, next quiz first | integration | Past `handoffDeadline` with no parent activity and no cleanup run, the child's next quiz submission records the expired batch as `released` and saves the new pending batch in one transaction; exactly one batch is `pending`; when the insert is made to fail, the expired batch is still `pending` and still released on read |
| UC-REC-parent-review 2a, unit | unit | `releaseExpiredBatches`'s filter matches a pending batch at and after `handoffDeadline` and none before it, the opposite of `confirmBatch`'s, under a fixed clock |
| UC-REC-parent-review 2a, late parent | integration | Past `handoffDeadline`, `removeBookFromBatch` and `confirmBatch` both return `BATCH_ALREADY_RELEASED` and change nothing; the page shows "Already released" with no controls |
| UC-REC-parent-review 5a | integration | When the confirmation's write fails, the result is `SAVE_FAILED` with an error ID, the batch is still pending, and `listReleasedBatchesForChild` does not return it; a retry succeeds |
| UC-REC-parent-review 5a | end-to-end | After a failed confirmation the page still shows the batch and its controls, with the error |
| UC-REC-parent-review 6a | integration | The child-facing read returns either the whole remaining batch or nothing: there is no state in which part of a confirmed batch is returned |
| UC-REC-parent-review concurrency | integration | Two simultaneous confirmations leave one release, and the second gets `BATCH_ALREADY_RELEASED`; a removal racing a confirmation either lands before it (and the book is absent from the release) or is refused, and `empty` is set only when no book remains at the moment of the write |
| UC-REC-parent-review report, 7d | integration | `removeFromPendingBatchInTx` on a transaction removes the book from every pending batch of the child that holds it, leaves each batch pending, returns true, and returns false when no pending batch holds it; it does not touch a released batch or another child's |
| UC-REC-parent-review report, entry page | integration (built with `UC-PAR-report-book`) | The batch entry page shows the report screen for a book in this pending batch and the `404` for a book not in it or a batch past `handoffDeadline` |
| UC-REC-parent-review released read | integration | `listReleasedBatchesForChild` leaves out a book reported for the child after release and returns no `removedBookIds` |
| UC-REC-parent-review released read, age band | integration | A pending batch holds an active book whose age band contains the child's age; an admin then narrows the band so it no longer does, and the book stays active. After the parent confirms, `listReleasedBatchesForChild` leaves the book out; in a separate run with no parent activity and the clock past `handoffDeadline`, it is left out too. The parent's review read still shows it while pending. A failed child age read returns no books |
| UC-REC-parent-review consent | integration | A family whose consent is unconfirmed or revoked gets `CONSENT_NOT_CONFIRMED` from both actions and nothing changes |
| UC-REC-parent-review child-facing | integration | No function a child session can reach returns a pending batch, a batch's `removedBookIds`, or a batch before its release (POST-2, §8.2.11) |
| UC-REC-parent-review validator | integration | The `recommendationBatches` validator refuses a batch without `handoffDeadline` and a `status` outside pending, released and empty |
| UC-REC-parent-review logging | integration | After a removal, a confirmation and a failed save, the logs hold no child ID with a book ID and no nickname |

### Rules quiz acceptance cases

| Flow | Level | Expected result |
|---|---|---|
| Main 1–6, 5a | Integration + browser | A child completes both questions. A fixture with three eligible matches saves all three in deterministic order with `source: rules` and `status: pending`. The child gets an acknowledgment and sees none of the pending books. |
| 1a | Integration + browser | Missing age or grade refuses Start and re-submission with the parent-help message and one failed-request event per refused action. No batch. |
| Neutral optional signals | Integration | Age and grade with no onboarding profile proceed with zero onboarding/favorite signals. A profile read error is 4b, not neutral. |
| 2a | Browser | Leave before answering. No write, including a prefetched quiz page. The child home and quiz render the existing privacy-notice link, production notice configuration fails closed, and no extra consent checkbox appears. |
| 3a | Unit + browser | Missing and unknown choices are refused. Show the first unanswered question. A direct action call cannot skip the server checks. |
| 4a | Integration + browser | Use a valid mood/length pair with zero eligible books. No batch and no fallback query. Show “We couldn’t find books for those choices. Try the quiz again.” Restart offers a fresh quiz. |
| 4b | Integration + browser | Fail consent, exclusions, Catalog and each already-available signal owner in turn. Show retry, retain choices and save no batch. Only absent records or explicitly undesigned sources are neutral. |
| 6a | Integration | A failed write has no pending handoff. An uncertain commit followed by retry of the same ID yields at most one saved batch. Two simultaneous submissions with the same ID do the same. |
| Pending capacity | Integration | Concurrent requests with different UUIDs leave exactly one pending batch. Start, a direct quiz visit and Submit acknowledge that batch without storing new answers. After parent review resolves it, a new request can create one. |
| Handoff deadline | Integration with fixed clock | Store `createdAt + BATCH_REVIEW_WINDOW_HOURS` once. Immediately before `handoffDeadline`, acknowledge the existing pending batch. At the deadline, Start opens the quiz and Submit records the old batch as released and saves exactly one new pending batch (`UC-REC-parent-review` 2a tests). |
| Ranking | Unit | Verify the three age-fit groups, interest ordering within each group, comparable and missing levels, low rating weight, every available signal type, absent finish notes as neutral, and stable ties. Verify optional signals never override age-fit groups or exclusions. |
| Authorization and mode | Integration | Refuse missing/expired and non-child sessions and revoked consent. Caller cannot select a child. With `RECOMMENDER_MODE` unset, V1 defaults to `rules`; `ai`, `off` and unknown values return `RULES_UNAVAILABLE` with no batch. Missing handoff dependencies keep the normal entry unavailable. |
| Safety and handoff | Integration + browser | Blocked, draft and reported books are absent. A report racing creation is either seen during generation or removes the committed pending item under the parent-review contract. Test the global-block race once the Catalog write contract is agreed. Parent sees only their linked child's batch. |
| Child data | Integration | Assert absence of raw quiz answers, age, grade, level, note and scores from the batch, response and logs. Check the batch in review/export and deletion integration once those use cases land. |
| Seed catalog | Integration | Benchmark all eligible combinations over the 134 source rows after import. Record elapsed time and result count internally. The target and traffic assumptions remain `OI-11` and `OI-12`. |

## Changes to the architecture-of-record

The rules quiz uses existing boundaries in §5.2 and the report-exclusion decision. `design/adm.md` receives one narrow Recommendation-only exception to the reading-level read rule; the raw annotation still never leaves Catalog. No architecture rule changes are proposed.

- §5.2 Accounts & Family: the words "and their onboarding answers" are removed; Recommendation owns the reading profile, as its own row and the paragraph after the table already say. Edited in `architectural-design.md` in this pull request.
- `BR-kid-data-stored`, `BR-admin-limited-view`, `FR-ADM-child-lookup`, `KD-admin-usage-lookup` and the use case's Associated Information are edited in this pull request (child sees no raw interests; admin lookup lists no interests).
- §5.2 Catalog: names the two narrow reads this use case needs (`listPickerBooks`, `findActiveBookIds`). Edited in this pull request.
- Catalog reading-level boundary: `design/adm.md` now permits only `listRuleCandidates` to read the raw annotation for Recommendation, returning normalized numeric difficulty and never the raw label or `customTags`; every other non-admin read still omits both.
- Revision history: a v0.11 row records `design/rec.md`.

For `UC-REC-parent-review`, edited in `architectural-design.md` in this pull request:

- §5.2 Notification: the parent's "batch ready" notice is not a stored notice; Recommendation lists the family's pending batches on the parent home (developer decision 2026-11-23).
- §8.2.6: the batch review window joins the configuration list.
- §5.2 Scheduled Cleanup: also records the timeout release of a batch past its `handoffDeadline` (`releaseExpiredBatches`). It changes no read's result, so it is still never the only thing enforcing the rule (`KD-time-rules-on-read`).
- Revision history: a v0.17 row.

## Open questions & risks

What this design had to assume. The developer accepted each on 2026-11-16 on the condition that none breaches a rule or COPPA.

- **The interest options (client and team).** The interest options (client): taken from the client’s Book domains slide (Genre and Subjects). Whether Mood and Themes are also options is to confirm (OI-37).
- **Favorite-book cap (team).** Proposed 10, since the glossary says "a few". Filed as `OI-38`.
- **Catalog does not exist in code (team).** No Catalog collection, import or read exists. `/implement` for this use case can build the form, action and Recommendation code against the two minimal reads and fixture books, but the picker cannot show real books until the seed catalog is imported (`KD-catalog-import-offline`, to be designed with `UC-ADM-add-content`). The import will need an `.xlsx` reader, a new dependency; `exceljs` is proposed and a person must confirm it before it is added (CLAUDE.md).
- **No skip, and no way back after leaving (specification).** The use case no longer has the skip extension (old 3b) or the next-login reminder. A parent who leaves the form unsaved leaves the child incomplete, with no reminder and no designed way to return to the form. Filed as `OI-39`.
- **Consent check (team).** Interests and favorite books are a child's personal information (`BR-kid-data-stored`) but the use case has no consent precondition. The action checks `isConsentConfirmed`. It does not join the `childCreationVersion` serialization of `OI-36`; a revocation racing a save can leave one profile, which revocation's own deletion removes.
- **Sub Parent may onboard (team).** PRE-1 says "Parent"; architecture §8.1 gives a Sub Parent the same access to linked children.
- **Use case edited by the developer (2026-11-16).** Step 3 is now "zero or more", extension 1a (already complete: raise an error to the parent; the child keeps normal access) is added, and 3a and 3b are removed. This design follows that text.
- **Save time for the admin's count (team).** `savedAt` exists only for the "onboardings completed" figure added to `UC-ADM-view-usage-stats` on 2026-11-16 as a team proposal. If the client does not want that figure, `savedAt` can be removed with no other change.
- **Privacy notice not written yet (client and a lawyer).** The client has to supply the real notice. Until then the form shows the placeholder paragraph and the "read and agree" checkbox described under Components, which is easy to replace. Whether the agreement should be stored is the client's to decide. `BR-coppa-notice` is met only once the client's text is in place, so the real notice must be in before launch.
- **Smaller assumptions, each breaking no rule, security measure or COPPA duty (developer, 2026-11-16).** Book and child IDs are strings. A complete child gives the error page with no link until the parent home page exists, and an unknown or foreign child gives `notFound()`. A revoked-consent family can still open the form, which collects nothing until Save, and the action refuses to save. `onboardingComplete` is stored as `true` and not read. The `savedAt` field stays as a team proposal. The Sub Parent from another family is the same not-found case as any foreign child.
- **Accepted risk:** parents could pick a long list of favorites that skews the first recommendations; the cap limits it. How favorites weigh in is `UC-REC-recommend-quiz-rules`'s to decide.

`UC-REC-parent-review`, what this design had to assume. The developer settled the first four on 2026-11-23.

- **Review window (developer; client, `OI-69`).** 24 hours from the batch's creation, provisional and configurable (`BATCH_REVIEW_WINDOW_HOURS`, [`rec-field-values.md`](rec-field-values.md)). The use case gives no length for 2a.
- **Removals saved at once (developer).** See Key decisions.
- **The notice is the pending batch (developer).** See Key decisions; an architecture §5.2 refinement.
- **6a folded into 5a (developer).** Use cases v0.19 rewords 6a, since release is the confirmation's own write.
- **No `FEAT-*` covers this use case (client).** Its own Open Issues ask to confirm with the client before it is built; `/implement` should not start until someone has. Nothing here depends on the answer.
- **The deadline runs even if the parent opened the batch (team).** See Key decisions. If the client wants an opened batch to wait for the parent, 2a changes and a batch can wait with no limit.
- **After release, a parent cannot remove or report a book the child has not reacted to (client, `OI-66`).** `UC-PAR-report-book` PRE-3 covers a pending batch or the shelf only, and this use case allows removals only while pending. A parent who opens a batch late can act only once the child puts the book on the shelf. Accepted until the client answers.
- **One deadline, from the quiz (team, review of #118).** #115 merged with `handoffDeadline`; this design uses it and adds no deadline of its own.
- **One pending batch per child (#115).** The quiz's partial unique index allows one, and a request while it is pending is acknowledged without a new batch. `removeFromPendingBatchInTx` still updates every matching pending batch, which is at most one; it needs no change if the limit is lifted.
- **The stored release can lag the deadline by up to a day (team).** If the child does not ask again, the stored status leaves `pending` at the next daily cleanup run. Every read already treats the batch as released, and it holds no data the released batch does not, so nothing is shown or kept that the rules forbid. A shorter lag needs a more frequent cron, which the Vercel plan may not allow.
- **Tags shown (team).** Genres, subjects, moods and length from the Catalog's book; not reading challenge or reading level. Step 3 says "tags" with no list.
- **Consent is checked on both actions (team).** As `UC-REC-kid-onboarding` does. A revocation racing a confirmation can release one batch; revocation's own handling stops the child's use of it.
- **Parent-suggested books and the follow-up books after a rating are not batches here.** `BR-parent-rec-not-forced` sends suggestions straight to the child; whether the follow-up books skip review is `OI-32`.
- **Accepted risk: the batch waits for the parent.** For up to the review window the child sees only #115's acknowledgment. If that is too long for children, the window is one setting.

---

### Rules quiz open decisions

- **Client and team (`OI-2`).** Confirm the two questions and their choices, the six-book maximum, one-pending-batch limit, three age-fit groups and provisional signal weights. The SRS still lists these as TBD.
- **Parent review (#72).** Designed below as `UC-REC-parent-review`: the batch-ready notice, the non-blocking release at `handoffDeadline` and how it reaches stored state, reporting from a pending batch, and the 4a behavior when no books are left. The review window is `BATCH_REVIEW_WINDOW_HOURS`, provisional; its length still has to appear in the published privacy notice.
- **Catalog and consent.** Import the seed through Catalog, with only approved active rows eligible. The families contract must support the consent lock, and the child-deletion design must provide its guard. Catalog/Shelf/REC must settle the concurrent block contract in #109 before enabling the normal flow.
- **Seed coverage (client and team, under `OI-2`).** The source workbook has 134 rows. Across ages 6–11 and the proposed mood/length choices, 17 of 144 combinations have no raw age/mood/length matches and 59 have one to five, before import, status or report exclusions. For 4a, explicitly choose whether the UI recommends **Any**, offers a deliberately narrowed option set for V1, or waits for an expanded seed. The quiz never widens an answered query automatically.

## Working this document with your agent

_Delegate: drafting diagrams from the use case, listing the existing files a class should extend, proposing a test row per extension, checking that every cited identifier exists. Keep human: which details a wrong guess would break, every key decision, and the approval, which is a teammate's review of the pull request. Watch for scope nobody asked for: an admin override, a retry queue, a status field, a notification. Every interaction in the sequence names a use case step._

---

## The questions test (before you open the pull request)

Start a fresh agent session in plan mode with only the use case, the business rules it cites, architecture section 8 and this document, and ask: _List every point you would still have to guess to implement `<UC-ID>` (`UC-REC-kid-onboarding` or `UC-REC-parent-review`). For each, say what you would guess and whether a wrong guess could violate a requirement. Do not write code._ For each item, fix this document or keep the guess with one line saying why a wrong guess breaks no requirement. Paste the list under How it was verified in the pull request, inside a collapsed `<details><summary>Questions test</summary> … </details>` block.
