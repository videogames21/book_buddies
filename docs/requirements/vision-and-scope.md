# Vision and Scope
**Project:** BookBuddies
**Team:** 5
**Client:** Yang Yang
**Version:** 0.9

---

## Identifiers in this document

| Space | Shape | Example |
|---|---|---|
| Business objective | `BO-<slug>` | `BO-grading-time` |
| Success metric | `SM-<slug>` | `SM-submission-rate` |
| Risk | `RI-<slug>` | `RI-cloud-cost` |
| Assumption or dependency | `AS-<slug>` | `AS-client-maintains-stack` |
| Feature | `FEAT-<slug>` | `FEAT-performance-tracking` |

## Revision History

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-09-13 | 0.1 | Initial draft from the client brief and first client meeting | Team 05 |
| 2026-09-13 | 0.2 | Filled in Background, Business Requirements, Stakeholder Profiles, and Scope sections from the 2026-09-10 client interview and Dr. Yang's 2026-09-12 written follow-up | Team 05 |
| 2026-09-17 | 0.3 | Reconciled the MVP scope table against [OPEN-ISSUES.md](OPEN-ISSUES.md): corrected four features that were listed as both in and out of scope, added `FEAT-ebook-reader` to section 4.2 so it has a definition before section 4.3 excludes it, and updated stale `OI-*` citations | Team 05 |
| 2026-09-25 | 0.4 | Applied the 2026-09-24 client meeting and follow-up flowchart: withdrew `FEAT-peer-feed`, `FEAT-groups`, `FEAT-group-sharing-controls`, `FEAT-stretch-my-reader`, `FEAT-reading-level-baseline`, `FEAT-teacher-flagging`; added `FEAT-onboarding-profile`, `FEAT-kid-reflections`, `FEAT-parent-suggest-book`, `FEAT-reading-level-input`; updated the shelf categories, MVP scope, vision statement, to-be flow, risks, assumptions, and stakeholder table; opened `OI-15` through `OI-18` for new contradictions this round surfaced | Tam Nguyen |
| 2026-10-20 | 0.5 | Replaced the "client will send the COPPA rules link" wording in `AS-coppa-adjacent-only` with the FTC COPPA Rule text the client supplied (`docs/coppa/coppa-full`). | Grayson Whittingham, Claude |
| 2026-10-25 | 0.6 | Cleanup of stale references, no scope change: recorded `OI-17` (four-option rating) and `OI-10` (web first) as resolved; pointed the Profiles notes reference at `docs/external/bookbuddies-profile-notes.md`; replaced the §4.1 context diagram with a link to the architecture's context; updated §3.2 for the Kaggle/GitHub dataset and the open 24-hour rule; replaced the stale `BR-admin-no-pii` citation | Team 05 (cleanup with Claude) |
| 2026-10-26 | 0.7 | Pointed the 2026-09-24 references at `docs/external/client-interview-2026-09-24.md`; recorded groups and peer sharing as removed until further notice, and the team's position on admin visibility (`OI-15`) | Team 05 (cleanup with Claude) |
| 2026-10-26 | 0.8 | Added `FEAT-consent-privacy`, `FEAT-parent-book-report`, `FEAT-admin-catalog` and `FEAT-flag-review` to §4.2 and to the MVP scope in §4.3, so the COPPA rights, parent reports, catalog management and flag review each have a feature | Team 05 (cleanup with Claude) |
| 2026-10-29 | 0.9 | Applied the client's 2026-10-28 answers (`docs/external/client-answers-10-28-2026.md`): withdrew `FEAT-kid-reflections` (children write no free text) and added `FEAT-parent-note`, `FEAT-kid-dashboard` and `FEAT-weekly-checkin`; the 24-hour parent review is dropped (`OI-16`), so `RI-review-window-unenforced` and `SM-review-compliance` are retired and `BO-parent-oversight-efficiency` is reworded; added the V1 success measures `SM-day30-retention`, `SM-weekly-active-families`, `SM-checkin-rating` and `SM-active-rating` (`OI-11`, partly answered); the seed catalog is the client's curated 134-book spreadsheet, not a Kaggle or GitHub dataset (`OI-1`); the child's real name is no longer stored (`OI-23`); flagging covers parent notes only, with a word list and human review (`OI-18`, `OI-19`); parents confirm finished books; the current version is a limited prototype built with a broader release in mind; updated the to-be flow, risks, assumptions, stakeholders, features and MVP scope to match | Team 05 (with Claude) |

---

## 1. Introduction

### 1.1 Background

The client, Dr. Yang, brought the team an existing concept for **BookBuddies**, a book discovery and tracking app for elementary-age kids (roughly ages 6–11). The concept was presented to the team via slides and a working Shiny app demo before requirements work began. The motivating problem is not a shortage of age-appropriate books — it is that nothing today matches a specific child to books they will actually enjoy, tracks what they have read, or gets better at recommending as it learns their taste. BookBuddies is meant to be kid-powered (the child drives what they read next) but adult-monitored (a linked parent account retains oversight and safety controls).

### 1.2 Current Process Flows (As-Is Process Flows)

BookBuddies is a green-field product — there is no existing BookBuddies system to replace. The "as-is" process is the informal, tool-less way a child finds a book to read today:

```mermaid
flowchart TD
  subgraph Child
    A[Wants a new book] --> B[Ask a parent or teacher for a suggestion]
    B --> C[Browse a library or bookstore shelf by cover]
    C --> E[Read it, or abandon it]
  end
  subgraph Parent/Teacher
    D[Recommend a title based on their own knowledge of the child] --> B
  end
  E --> F[Nothing records the reaction, reading level, or preference]
```

A parent or teacher suggests titles from their own limited knowledge of the child's interests, or the child browses a shelf and picks by cover. No tool tracks what the child has read, liked, or is ready for next, so each recommendation starts from scratch rather than building on the last one.

**Current tools:** word of mouth from parents and teachers; browsing a physical library or bookstore shelf; in some schools, a reading-level test administered by the school itself (see below). None of these are BookBuddies-adjacent software — there is nothing to migrate from.

**Pain points:**
- Recommendations are capped by what the parent or teacher happens to know about the child, not what the child would actually enjoy.
- A formal reading-level baseline often does not exist until school testing catches up — the client noted some schools do not test until 2nd or 3rd grade — so books in the meantime may be pitched at the wrong level.
- Nothing is tracked between one book and the next, so there is no way to see whether a child's taste or level is changing over time.

### 1.3 References

- Client interview notes, 2026-09-10 — `docs/external/client-interview-2026-09-10.md`
- Team napkin assessment, undated — `docs/napkin-round-0.md`
- Dr. Yang's follow-up design notes ("BookBuddies Profiles"), 2026-09-12 — seed catalog tagging domains, recommender staging, adult- and kid-facing profile scope, and gamification badge concepts — `docs/external/bookbuddies-profile-notes.md`.
- Client meeting notes, 2026-09-24, plus Dr. Yang's follow-up flowchart (PPTX + PNG) — notes in `docs/external/client-interview-2026-09-24.md`; the flowchart is not yet in the repo. Drops the teacher role, in-app reading test, peer feed/groups, and Stretch My Reader from the 2026-09-10/09-12 material; this revision reflects those cuts. Two internal contradictions from this round were open: `OI-15` (what the admin sees) is still to be confirmed, and `OI-16` (the 24-hour review) was answered on 2026-10-28.
- Client answers to the team's debrief, 2026-10-28 — `docs/external/client-answers-10-28-2026.md`. Removes free text from the child side, drops the 24-hour review and the child's real name, adds the parent note, the weekly check-in and the dashboards, and fixes the seed catalog. Supporting evidence; the requirements documents cite it.
- Original concept slide deck — Dr. Yang, not yet added to the repo
- Shiny app demo link — Dr. Yang, not yet added to the repo

---

## 2. Business Requirements

### 2.1 Business Opportunity or Problem Statement

Elementary-age kids struggle to find books they're excited to read — not because age-appropriate books don't exist, but because nothing matches a specific child's taste, mood, and reading level the way a great librarian or a well-read parent might, and nothing improves as it learns more about that child. Parents and teachers can only point kids toward grade-appropriate titles, which is a blunt instrument. Dr. Yang wants BookBuddies to close that gap: a kid-facing app that recommends books a child will actually enjoy, tracks what they've read on a personal shelf, and lets a parent suggest specific titles the child can accept or pass on — all while giving parents the oversight a product for this age group requires. *(Updated 2026-09-25: the original phrasing here described "a light social layer, peer picks, small reading groups" — cut from scope 2026-09-24; see section 2.4 and `FEAT-peer-feed`/`FEAT-groups` in 4.2.)*

### 2.2 Business Objectives

The client has not yet given the team target numbers for these. The objectives below are draft candidates pending client confirmation. The criteria behind recommendation relevance also remain unresolved (see `OI-2`).

- `BO-book-engagement` (DRAFT): Increase the number of books a child finishes reading per month, relative to before using the app, by a target percentage TBD with the client.
- `BO-recommendation-relevance` (DRAFT): Increase the share of quiz/AI-suggested books a child rates positively (e.g., a "Loved it" or "Liked it" rating) to a target percentage TBD with the client.
- `BO-parent-oversight-efficiency` (DRAFT): Reduce the time a parent spends reviewing a child's activity and recommendations, to a target TBD with the client. *Reworded 2026-10-29: the 24-hour review/suspension rule this objective once assumed was dropped by the client (`OI-16`).*
- `BO-longitudinal-personalization` **(new 2026-10-29)**: Learn from a child's choices, ratings and shelf activity over time, linked by an internal child ID and not by a name, so recommendations become more relevant. The client calls this the unique contribution of BookBuddies (client answers 2026-10-28, overall comment 4 and Q14).

### 2.3 Success Metrics

The first four V1 measures below carry targets from the client's 2026-10-28 answers (Q14); the others are still drafts. The client says other success metrics may stay open, provided the system captures what is needed to define them later (`OI-11`).

- `SM-quiz-usage` (traces to `BO-recommendation-relevance`): Share of active child accounts that request a new recommendation quiz at least once a week. Baseline: N/A (new product). Target: TBD.
- `SM-shelf-activity` (traces to `BO-book-engagement`): Share of active child accounts that add at least one book to their shelf within their first two weeks. Baseline: N/A. Target: TBD.
- `SM-review-compliance` **(RETIRED 2026-10-29)**: It counted parents who completed the 24-hour review check, which the client dropped (`OI-16`). Kept so the slug is not reused.
- `SM-day30-retention` (traces to `BO-book-engagement`; **new 2026-10-29**): Share of families who return within 30 days of sign-up. Baseline: N/A. Target: 25% or more (client answers 2026-10-28, Q14).
- `SM-weekly-active-families` (traces to `BO-book-engagement`; **new 2026-10-29**): Share of families with at least one meaningful action in a week: a rating, a shelf save or a “not for me” response. Baseline: N/A. Target: none set.
- `SM-checkin-rating` (traces to `BO-recommendation-relevance`; **new 2026-10-29**): Share of weekly check-in notifications that lead to a rating within 7 days (`FR-NOT-weekly-reminder`). Baseline: N/A. Target: 30% or more.
- `SM-active-rating` (traces to `BO-recommendation-relevance`; **new 2026-10-29**): Share of active families who rated at least one book in the past 30 days. Baseline: N/A. Target: 30% or more.

### 2.4 Vision Statement

| | |
|---|---|
| **For** | elementary-age kids (roughly 6–11) |
| **Who** | want to find books they'll actually enjoy, not just books that are age-appropriate |
| **The** _BookBuddies_ | is a kid-facing app with linked, parent-managed accounts |
| **That** | recommends books through an onboarding profile and quiz (interests, age/grade, and an optional reading level), tracks what a child reads on a personal shelf, and lets parents suggest titles the child can accept or pass on |
| **Unlike** | relying on a parent's or teacher's personal knowledge to suggest books, with nothing tracked or improved over time |
| **Our product** | centers recommendations on what the individual kid enjoys, not just their grade level, while giving parents the safety and review controls this age group requires |

### 2.5 Proposed Process Flows (To-Be Process Flows)

```mermaid
flowchart TD
  subgraph Child
    A[Onboarding: age/grade, interests, favorite books, optional reading level] --> B[Get recommendations: rules-based, from profile + parent suggestions]
    B --> C{React to each pick}
    C -- Yes --> D[Add to shelf: Reading Now]
    C -- Maybe later --> E[Add to shelf: Maybe Later]
    C -- Not for me --> F[Optional reason from a fixed list]
    D --> G[Move book to Finished]
    H[Rate: loved it / liked it / it was okay / not for me] --> L[Feeds recommender; 3 follow-up books shown]
  end
  subgraph Parent
    M[Create parent account first, then child account, with an optional short note] --> N[Suggest a title + personal note]
    N --> B
    M --> O[View child's shelf and ratings]
    O --> P[Remove a shelf book if needed]
    P --> Q[Child sees in-app pop-up: book removed]
    R[Weekly check-in: has your child finished this book?] --> S{Confirm the finish?}
    S -- Not finished yet --> T[Book returns to its earlier category; child sees a notice]
    S -- Confirmed --> U[Optional note for the recommender]
    U --> V{Note matches the word list?}
    V -- Yes --> W[Flag for human review by an authorized admin]
  end
  G --> R
  S -- Confirmed --> H
```

The onboarding profile plus rules-based recommendation (new) replaces the ad hoc adult suggestion from the as-is flow, directly addressing the "recommendations capped by what the adult knows" pain point. The shelf, ratings and the parent's notes (new) replace the "nothing is tracked" pain point, and the child's choices and ratings, the parent's context and the shelf history together feed the recommender over time, linked by an internal child ID (client answers 2026-10-28, overall comment 3).

**What stays manual:** a parent still reviews the child's shelf and ratings and can remove a book, and confirms that a child really finished a book before the child can rate it; the child is notified when a book is removed or a finish is not confirmed. A child writes no free text; only the parent may add an optional short note. **What is no longer in this flow:** the in-app reading-level test, the picture-based quiz's peer-picks component, achievement pages, and Stretch My Reader — all cut in the 2026-09-24 meeting or the follow-up flowchart (see `docs/external/client-interview-2026-09-24.md`).

**Resolved 2026-10-28:** the 24-hour review-and-confirm cycle with account suspension is dropped (`OI-16`), because it was meant for reviewing a child's free-text notes, which no longer exist. The client wants periodic engagement feedback instead: a weekly parent check-in, a parent dashboard and a child dashboard.

### 2.6 Risks

- `RI-pii-boundary-leak`: A child's identifiable information (age, grade and username; the client confirmed on 2026-10-28 that the system stores no real name) could reach the system admin, or another party, through a support or debug tool, if PII is not segregated from admin-visible tables/APIs at the data layer. Given the product handles children's accounts, this is a COPPA-adjacent exposure, not just a bug. (Probability 0.4, Impact 9). Mitigation: segregate PII from admin-visible tables/APIs from the first schema design, not retrofitted later. *On 2026-10-28 the client agreed the admin sees no child details, with the flagged-note exception still to confirm, and allowed child-level usage data by internal child ID (`OI-15`). The 2026-09-24 notes had disagreed on whether the admin sees PII at all. The "social boundary" half of this risk (peer visibility between children) is now moot; peer-to-peer sharing and groups were cut the same meeting — see `FEAT-peer-feed` and `FEAT-groups` in section 4.2.*
- `RI-review-window-unenforced` **(WITHDRAWN 2026-10-28)**: It concerned a server-enforced 24-hour parental review with suspension. The client dropped that rule (`OI-16`). Retained here, marked withdrawn, per this document's identifier convention.
- `RI-parent-note-sensitive-content` **(new 2026-10-29)**: A parent may accidentally put personal or sensitive information in the optional note, so the note becomes a store of identifying content that the recommender reads and an admin may have to review. Mitigation: a 250-character limit, a prompt not to include such information, a word-list flag with human review by an authorized admin, no outside service, and a record of every admin view (`BR-parent-note`, `BR-note-safety-flagging`). The client will use testing to see what parents actually enter before seeking legal advice (Q4). Probability and impact are not yet rated.
- `RI-content-tagging-quality`: If the seed catalog is not tagged consistently for genre, mood, and reading level, the recommendation quiz will feel random to a child regardless of how the matching logic is written. This risk is reduced as of 2026-10-28: the catalog starts from the client's curated, hand-tagged 134-book seed, which also serves as a reference set for checking later automated tagging (`OI-1` resolved). It returns when the catalog grows through Open Library. (Probability 0.3, Impact 6).
- `RI-scope-creep-ai`: The "AI-powered" language from the original concept deck could pull the team into building comment/rating sentiment analysis before the core recommendation loop and safety layer are solid, risking a December milestone that doesn't ship a working loop at all. (Probability 0.4, Impact 7). Mitigation: lock the MVP feature list (section 4.3) with the client and defer AI-driven analysis explicitly. *The 2026-09-24 meeting reaffirms rules-first, ML later, which supports this mitigation.*
- `RI-empty-social-layer` **(WITHDRAWN 2026-09-24)**: No longer applicable — peer picks and reading groups were cut from scope entirely in the 2026-09-24 meeting ("too complicated for now"). Retained here, marked withdrawn, per this document's identifier convention.

### 2.7 Business Assumptions and Dependencies

- `AS-book-data-source`: The seed catalog is the client's curated `BookBuddies_Seed_Catalog.xlsx` (134 tagged books), imported once into the BookBuddies database. On 2026-10-28 the client said not to use the Kaggle or GitHub datasets (`OI-1` resolved). Later expansion through Open Library should not need a rebuild.
- `AS-coppa-adjacent-only`: The client wants the system built to COPPA's requirements as a design discipline. As of 2026-09-24 the client describes this more strongly ("build in from the start"), and she has since supplied the FTC COPPA Rule text (`docs/coppa/coppa-full`). The team has turned it into design requirements (`docs/coppa/coppa-design-requirements.md`, `BR-coppa-*`). The main consequences for scope: the parent account and verified consent come before any child data is collected, the MVP shares no child data with third parties, and data retention and deletion need a stated policy. If the client instead wants formal compliance/certification, or if the project turns out to be a covered operator (`OI-20`), the project needs legal review the team is not positioned to provide.
- `AS-email-linking`: Parent accounts are created and linked via email, not phone number, and this is acceptable for the client's expected user base.
- `AS-teacher-role-deferred` **(SUPERSEDED 2026-09-24 — now a confirmed cut, not a deferral)**: This assumption originally read "teachers remain a stretch goal." The 2026-09-24 meeting removed the teacher role from scope entirely ("simpler, cleaner, easier to build"), not just from the MVP. Retaining the slug per this document's identifier convention; treat teacher functionality as out of the project, not merely postponed, unless the client reopens it.
- `AS-limited-prototype` **(new 2026-10-29)**: The current version is a limited prototype for a few dozen families and a few real child and parent testers, built with a broader public release in mind. The long-term operating and maintaining unit is not yet decided (`OI-9`). The client asked for the team's view of what hosting, storage, security, monitoring, maintenance and outside services a public release would need; the answer is owed to the client and is not a requirement (client answers 2026-10-28, Q1, Q2, Q12).
- `AS-parent-account-first` **(new, resolves `OI-8`)**: A parent account always exists before a child account is created; a child cannot self-register. Confirmed 2026-09-24. A secondary parent (e.g., a second guardian) can be added to an existing parent account, and one parent account can manage multiple children.

---

## 3. Stakeholder Profiles and User Descriptions

### 3.1 Stakeholder Profiles

| Stakeholder | Major value or benefit from this product | Attitude | Major features of interest | Constraints | End user? |
|---|---|---|---|---|---|
| Child (6–11) | Personalized book discovery, without a social layer to navigate | Likely enthusiastic, but with a short attention span | Recommendations, shelf, ratings, own dashboard | Reading level, any screen-time rules a parent sets, needs a simple/large-tap-target UI | Yes |
| Parent | Confidence a child is reading well-matched books, without approving every choice | Supportive if oversight is easy; skeptical if the review burden is heavy | Suggest titles, view shelf and ratings, confirm finished books, add an optional note, remove a book, weekly check-in and dashboard | Limited time to review activity; no required review cadence (`OI-16`, dropped) | Yes |
| Client (Dr. Yang) | Sees the original concept validated with real usage | Supportive; project sponsor and vision owner | Rules-based then AI recommendations, gamification/badges | Availability for recurring syncs; cadence not yet set | No, unless testing |
| Teacher **(REMOVED 2026-09-24)** | Was a potential classroom reading-engagement tool | N/A — role cut from scope entirely, not deferred | None — no teacher-facing features remain planned | Not implemented; not planned for a future phase either unless the client reopens this | No |
| System admin / future maintainer | Keeps the system running after the team graduates | Neutral | PII segregation, deployment simplicity, reviewing flagged parent notes, looking up one child's usage data by internal ID | The client agreed on 2026-10-28 that the admin sees no child details and only what is necessary; the flagged-note exception is still to confirm (`OI-15`); identity of the post-graduation maintainer is unknown | No |

### 3.2 User Environment

Children are expected to use the app largely at home (evenings and weekends), in short, touch-first sessions of roughly 5–15 minutes — the client's note that the discovery quiz is picture-based (not text-heavy) points to a UI built around large tap targets and minimal reliance on reading to navigate the app itself. Parents check in periodically, likely from a phone in short gaps between other tasks; there is no required check-in cadence now that the 24-hour review is dropped (`OI-16`), only a weekly check-in notification. There is no existing software this project integrates with today; the one external dependency is the client's curated seed catalog (`OI-1` resolved) imported up front rather than used as a live integration.

_**Resolved (`OI-10`):** the client directed web first, mobile later (2026-09-24). The MVP is a mobile-responsive web app._

### 3.3 Alternatives and Competition

| Alternative | Strengths | Weaknesses for this client |
|---|---|---|
| Status quo — parent/teacher word of mouth and library browsing | Free, uses human judgment, no setup required | No personalization to the individual child's taste; nothing tracked; does not improve over time |
| Goodreads or similar adult-oriented reading trackers | Established rating and tracking model, existing social feed | Built for adults — no reading-level matching, no child-appropriate parental controls, UI and complexity aimed at grown readers |
| School reading-level testing | Produces an official reading level | The client noted this often doesn't start until 2nd or 3rd grade; it measures a level, it doesn't recommend books |

---

## 4. Scope and Limitations

### 4.1 Product Perspective

BookBuddies is a self-contained product: a child-facing app, a parent-facing review dashboard, admin tools, and a lightweight recommendation engine, all backed by one database. Its external dependencies in the MVP are the curated seed catalog, imported once, and an email service for parent account emails; there is no live integration with a school system or LMS in this phase.

The context diagram is kept in one place, section 3 of the [architecture-of-record](../../design/architectural-design.md#3-context-and-scope).

### 4.2 Major Features and Scope

_The features below were revised 2026-09-25 to reflect the 2026-09-24 client meeting and Dr. Yang's follow-up flowchart, which cut several 2026-09-10/09-12 features outright rather than deferring them. Cut features are kept below and marked **WITHDRAWN**, per this document's identifier convention — never delete a slug once cited._

- `FEAT-onboarding-profile` **(new 2026-09-25)**: Build a child's starting reader profile at account creation from age/grade, reading interests, favorite books already read, and an optional reading level — the input set the recommender and parent-suggestion features both draw from.
- `FEAT-recommendation-quiz`: Give a child book recommendations from their profile, run every time they want a new suggestion, not only at onboarding.
- `FEAT-ai-recommendation`: Refine recommendations over time using kids' saving/rating behavior. *The client accepted rule-based recommendation for V1 on 2026-10-28 (Q7) and asked what adding AI later would need; that outline is owed to the client (`OI-2`).* Rolls out in stages: **(1)** a rules engine filters the tagged seed catalog and returns the top matches — reaffirmed 2026-09-24 as "rule-based first, ML/AI added in a later phase"; **(2)** an ML model re-ranks a rules-narrowed candidate set using what "similar" kids (by behavior only — never age, location, or other demographics) saved or rated; **(3)** the model finds non-obvious matches, still enforcing safety/age-appropriateness filtering. The client also floated exploring collaborative filtering (Netflix/Facebook-style) once user volume allows. *(Stage 1 is the team's realistic MVP target; see `RI-scope-creep-ai`.)*
- `FEAT-book-tagging`: Tag every seed-catalog book across genre, mood, format, themes, length, age fit, and reading level. As of 2026-10-28 the source is the client's curated, hand-tagged `BookBuddies_Seed_Catalog.xlsx` (134 books), not a Kaggle or GitHub dataset (`OI-1` resolved). The catalog keeps an internal book ID, ISBN and Open Library IDs for matching, a Status field that controls which books can be recommended, and series name and number, so it can later grow through Open Library without a rebuild.
- `FEAT-kid-reflections` **(WITHDRAWN 2026-10-28)**: Let a child write an optional post-reading reflection, visible to the parent and flagged for violence or self-harm. The client removed free text from the child side so children cannot enter identifying or sensitive information; child responses are structured choices only (`BR-child-structured-responses`, `OI-28`). Retained here, marked withdrawn, per this document's identifier convention. Its safety-flagging purpose now applies to the parent note (`FEAT-parent-note`).
- `FEAT-parent-note` **(new 2026-10-29)**: Let a parent add an optional free-text note of at most 250 characters about the child's reading interests, at child setup and after confirming a finished book. It feeds the recommender and is never shown to the child. An internal word list flags a concerning note for human review by an authorized admin, with no automatic action and no outside reporting (`BR-parent-note`, `BR-note-safety-flagging`; `UC-PAR-create-kid-account`, `UC-SHLF-par-finish-book`, `UC-ADM-flag-review`).
- `FEAT-kid-dashboard` **(new 2026-10-29)**: Give a child a dashboard, opened from the shelf, with parent-approved recommended books, a radar chart of current reading interests and their shelf activity and history, with no numbers and no badges yet (`UC-SHLF-kid-dashboard`; client answers 2026-10-28, Q10). Whether it complies with the no-metrics rule is `OI-31`.
- `FEAT-weekly-checkin` **(new 2026-10-29)**: Send the parent a weekly check-in asking whether the child has finished a book, opening the parent's confirmation; after the child rates it, show 3 books to read next (`FR-NOT-weekly-reminder`, `UC-SHLF-par-finish-book`, `UC-SHLF-kid-rate-book`). The client calls it a push notification; the channel, the day and the trigger shelf are `OI-30`.
- `FEAT-parent-suggest-book` **(new 2026-09-25)**: Let a parent suggest a specific title, with an optional personal note, that is added to the child's recommendation list (not forced onto the shelf); the child can accept, defer, or decline it like any other recommendation.
- `FEAT-adult-influence-notes` **(status unclear — possibly folded into `FEAT-parent-suggest-book` or `FEAT-parent-note`, confirm with client)**: Original description — let a parent add a private note about a child (e.g., a growth theme) that quietly biases recommendations without the note ever being shown to the child. The 2026-09-24 meeting instead describes child-authored reflections visible *to* the parent (the reverse direction) and parent-suggested titles; it's unclear whether this original parent-authored, hidden-from-child note concept still exists separately. The 2026-10-28 optional parent note (`FEAT-parent-note`) is now a parent-authored note that feeds the recommender and is never shown to the child, so it may cover this feature.
- `FEAT-group-sharing-controls` **(WITHDRAWN 2026-09-24)**: Required adult approval for every member added to a reading group. Moot — reading groups were cut entirely.
- `FEAT-recap-adult`: Give a parent a weekly dashboard of the child's reading journey, changing interests and activity over time (`UC-PAR-view-growth-report`). It began as an optional qualitative recap, not a count or streak. The client asked for the weekly parent dashboard as an engagement feature on 2026-10-28 (Q10); it is in the MVP (team decision 2026-10-29), and what it may show, given `BR-recap-qualitative-only`, is `OI-31`.
- `FEAT-reading-identity-badges`: Give a child identity-based badges (e.g., "Mystery Fan") reflecting reading taste and exploration — never a count, level, or comparison to other kids. 2026-09-24 adds that logged reading hours behind any badge would need parent approval, to prevent gaming the system. Badge design remains unfinalized (`OI-14`); notably, the 2026-09-25 flowchart shows no badges anywhere.
- `FEAT-achievement-pages` **(WITHDRAWN)**: Originally a Duolingo-style page showing weekly/monthly books, genres, and reading-level progress. Already withdrawn per 2026-09-12 notes (child never sees their reading level) — see `OI-6`; the 2026-09-24 meeting does not revive it. Retired in favor of `FEAT-reading-identity-badges` and `FEAT-recap-adult`.
- `FEAT-shelf`: Let a child archive books they're interested in. A book moved to Finished waits for a linked parent to confirm the finish before the child can rate it, and a confirmed finish stays with the book (`UC-SHLF-par-finish-book`; team decision 2026-10-29). **Categories have changed twice:** 2026-09-10 said want-to-read / read / recommend; 2026-09-24 said want to read / reading / recommended to friends / don't want to read; the 2026-09-25 flowchart shows **Reading Now / Want to Read / Maybe Later / Finished**, with no "recommend to friends" category (consistent with peer sharing being cut). Treating the flowchart, as the newest artifact, as current.
- `FEAT-peer-feed` **(WITHDRAWN 2026-09-24)**: Showed a child what friends and classmates were reading. Cut — "peer-to-peer social sharing dropped: too complicated for now."
- `FEAT-manual-search`: Let a child search the catalog by keyword. Not depicted in the 2026-09-25 flowchart. A book found this way reaches the child's shelf only after a linked parent approves the request (`UC-SHLF-manual-search`).
- `FEAT-ratings`: Let a child rate a book after finishing it, on four options: Loved it / Liked it / It was okay / Not for me. The 2026-09-24 notes said "stars or thumbs"; the team adopted the 2026-09-25 flowchart's scale on 2026-10-07 (`OI-17`, resolved). The original "aggregate community rating" is dropped along with the rest of the peer/social layer. Since 2026-10-29 a child can rate a book only after a parent confirms the finish, and right after a rating the child sees 3 books to read next (`OI-32`).
- `FEAT-groups` **(WITHDRAWN 2026-09-24)**: Let kids form or join reading groups of 2–20 members. Cut along with peer-to-peer sharing.
- `FEAT-stretch-my-reader` **(WITHDRAWN 2026-09-24)**: Offered opt-in prompts toward higher-reading-level books. Client's own note: "No stretch my reader option." Absent from the flowchart too.
- `FEAT-reading-level-baseline` **(WITHDRAWN 2026-09-24, replaced by `FEAT-reading-level-input`)**: Was an in-app reading test at account creation. 2026-09-24: "No in-app reading test; kids asked to find their level externally if needed."
- `FEAT-reading-level-input` **(new 2026-09-25, replaces `FEAT-reading-level-baseline`)**: Let a parent optionally enter a child's reading level (Lexile, AR, or similar) at onboarding, or skip it. Age and grade — not reading level — are the primary recommendation signal; if reading level is given, it's used to match difficulty, and the flowchart suggests pointing an unsure parent to an external tool (e.g., AR Bookfinder, Scholastic Book Wizard) rather than the app assessing it.
- `FEAT-parent-account-linking`: Link a parent account to one or more child accounts. 2026-09-24 confirms the parent always creates the account first and a child cannot self-register (resolves `OI-8`); a secondary parent/guardian can be added to an account, and one parent can manage multiple children.
- `FEAT-parent-review-dashboard`: Let a parent view a child's shelf and ratings, and remove a book from the shelf (the child gets an in-app pop-up when this happens). **The 24-hour review-and-confirm/suspension mechanic from 2026-09-10 was dropped by the client on 2026-10-28 (`OI-16` resolved).** The parent now sees the shelf and ratings, confirms finished books and gets the weekly check-in and dashboard.
- `FEAT-admin-pii-segregation` **(team position set 2026-10-26; client to confirm, `OI-15`)**: Was "admin sees zero PII" as of 2026-09-10 (`OI-7`, since replaced by `OI-15`; the rule is now `BR-admin-limited-view`). The client's own 2026-09-24 notes give two different answers in the same meeting: one line says admin has "access to personal data, user credentials," another says admin sees only "parent credentials and number of child accounts, not child details." See `OI-15`. The client agreed on 2026-10-28 (Q5) that the admin sees no child details and only what is necessary, and allowed child-level usage data by internal child ID, looked up by an authorized admin with every lookup audit-logged (`UC-ADM-view-usage-stats`). The system stores no child real name (`OI-23`). The team's position (2026-10-26, `KD-admin-flag-review`): the admin sees no other child details except in flagged-content review, where every view is recorded.
- `FEAT-teacher-flagging` **(WITHDRAWN 2026-09-24 — full removal, not a deferral)**: Previously a stretch goal letting a teacher flag content. The teacher role itself was removed from scope entirely 2026-09-24, so this has no remaining role to attach to.
- `FEAT-consent-privacy` **(new 2026-10-26)**: Give parents the privacy controls the COPPA Rule requires, built in from the start as the client asked: notice and verifiable parental consent before anything is collected from a child, a privacy notice linked wherever a child's information is collected, and the parent's rights to review and export their child's data, stop further collection, delete the child's data, and delete the child's account (`BR-coppa-*`; `UC-PAR-onboarding`, `UC-PAR-review-child-data`, `UC-PAR-revoke-consent`, `UC-PAR-delete-child-data`, `UC-PAR-delete-kid-account`). The client accepted parent consent plus email confirmation, a consent record and revocation for V1, kept configurable, and development placeholders of 12 months of inactivity and 14 days to confirm consent, also configurable (client answers 2026-10-28, Q9, Q13).
- `FEAT-parent-book-report` **(new 2026-10-26)**: Let a parent report a book as unsuitable for their child. The report is final, removes the book from that child's recommendations, search and shelf for good, and goes to the system admin, who may block the book for everyone, and who may warn, then suspend, a parent who keeps sending false reports (`BR-parent-report-book`, confirmed by the client 2026-10-13; `UC-PAR-report-book`, `UC-ADM-block-content`, `UC-ADM-suspend-parent-account`).
- `FEAT-admin-catalog` **(new 2026-10-26)**: Let the system admin keep the catalog safe and current: add single books, correct a book's details and tags, block a book for every child, and unblock one blocked in error, on top of the bulk import of the curated seed catalog (`UC-ADM-add-content`, `UC-ADM-edit-content`, `UC-ADM-block-content`, `UC-ADM-unblock-content`). Tagging itself is `FEAT-book-tagging`.
- `FEAT-flag-review` **(new 2026-10-26)**: Let the system admin review parent notes flagged by the internal word list, see the flagged child's nickname, internal child ID, age, grade and username there and nowhere else, unflag them or suspend the account, and reinstate a suspended account. Admin authority to suspend was confirmed by the team on 2026-10-26; the client is, in practice, the admin. What the admin may see still needs the client's confirmation (`OI-15`), and for V1 nothing is reported outside the system (`OI-18`) (`UC-ADM-flag-review`, `UC-ADM-suspend-account`, `UC-ADM-reinstate-account`).
- `FEAT-ebook-reader`: Not part of the product. The client concept brief is explicit that BookBuddies is not an ebook reader (the brief's "recommendation, tracking, and social sharing only" predates the 2026-09-24 cut of social sharing) — a child reads the book itself elsewhere (library, bookstore, home). Listed here, and excluded in section 4.3, so the boundary is on the record rather than assumed.

### 4.3 MVP Scope

_A 2026-09-17 revision (v0.3) reconciled an earlier drafting error where four features appeared in both the in-scope and out-of-scope lists below. That reconciliation is superseded by this revision's larger scope changes from the 2026-09-24 client meeting — several of those same four features (`FEAT-groups`, `FEAT-reading-level-baseline`) are now withdrawn outright rather than merely unresolved. The lists below reflect the current, post-2026-09-24 scope._

_The client described this MVP as "bare-bones: working recommendation flow + basic parent and kid profiles," web-first._

**In scope for the MVP:** `FEAT-onboarding-profile`, `FEAT-recommendation-quiz`, `FEAT-shelf`, `FEAT-ratings`, `FEAT-parent-note`, `FEAT-kid-dashboard`, `FEAT-weekly-checkin`, `FEAT-parent-suggest-book`, `FEAT-manual-search`, `FEAT-reading-level-input`, `FEAT-parent-account-linking`, `FEAT-parent-review-dashboard`, `FEAT-admin-pii-segregation`, `FEAT-book-tagging`, `FEAT-consent-privacy`, `FEAT-parent-book-report`, `FEAT-admin-catalog`, `FEAT-flag-review`, `FEAT-recap-adult`

_Three of these MVP features carry an open question that should be closed before they're built, not after (see section 4.2 for detail): `FEAT-admin-pii-segregation` (`OI-15`, whether the client confirms the flagged-note exception), `FEAT-kid-dashboard` (`OI-31`, whether it complies with the no-metrics rule) and `FEAT-weekly-checkin` (`OI-30`, how and when it is delivered). `FEAT-parent-review-dashboard` is settled now that the 24-hour review is dropped (`OI-16`), and `FEAT-ratings` was settled on 2026-10-07 (`OI-17`). `FEAT-book-tagging` is in MVP scope because the client's curated seed catalog removes most of the manual-tagging burden (`OI-1` resolved)._

**Explicitly out of scope for the MVP:**
- `FEAT-ai-recommendation` (deferred to a later release): Rules-based only for the MVP; ML re-ranking is an explicit later phase per both the client and the team's own risk mitigation (`RI-scope-creep-ai`).
- `FEAT-ebook-reader` (confirmed out of scope, not deferred): the client concept brief rules this out entirely — see the entry in section 4.2.
- `FEAT-groups`, `FEAT-peer-feed`, `FEAT-group-sharing-controls` (removed until further notice): peer-to-peer sharing and reading groups were cut 2026-09-24, and the team confirmed on 2026-10-26 that they are out of the product, not on a later-phase roadmap, unless the client reopens them.
- `FEAT-stretch-my-reader` (confirmed out): "No stretch my reader option" (2026-09-24).
- `FEAT-reading-level-baseline` (confirmed out, superseded by `FEAT-reading-level-input`): no in-app reading test (2026-09-24).
- `FEAT-teacher-flagging` (confirmed out, not deferred): the teacher role was removed from scope entirely (2026-09-24), not deferred to a later phase.
- `FEAT-achievement-pages`: withdrawn since 2026-09-12; not revived.
- `FEAT-reading-identity-badges`: not clearly reaffirmed 2026-09-24 and absent from the flowchart — treating as out of the MVP pending client confirmation (`OI-14`). The child dashboard leaves badges off until the list is settled.
- `FEAT-kid-reflections` (withdrawn 2026-10-28): children write no free text; see `FEAT-parent-note`.

### 4.4 Deployment Considerations

_Not yet written._
