# Software Requirements Specification

**Project:** BookBuddies  
**Team:** Team 05  
**Client:** Dr. Yang Yang  
**Version:** 0.4

---

## Identifiers

| Space | For | Example |
|---|---|---|
| `FR-<AREA>-<slug>` | Functional requirements outside any use case | `FR-ACCT-consent` |
| `UI-<slug>` | User interface requirements | `UI-child-simple` |
| `SI-<slug>` | Software/system interfaces | `SI-book-dataset` |
| `CI-<slug>` | Communications interfaces | `CI-email-parent` |
| `DI-<slug>` | Data requirements | `DI-pii-segregation` |
| `OE-<slug>` | Operating environment | `OE-web-first` |
| `CO-<slug>` | Design/implementation constraints | `CO-single-application` |
| `AS-<slug>` / `DE-<slug>` | Assumptions/dependencies | `AS-supported-browser` |

Quality identifiers: `USE-` usability; `PER-` performance; `SEC-` security; `SAF-` safety; `AVL-` availability; `ROB-` robustness; `SCA-` scalability; `INT-` interoperability; `MNT-` maintainability. Existing `UC-*`, `BR-*`, `BO-*`, `SM-*`, and `FEAT-*` identifiers are defined in their linked source documents. **All existing SRS requirement IDs are retained; new requirements receive new IDs.**

## Revision History

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-09-17 | 0.1 | Filled in project/team/client identification. | Team 05 |
| 2026-10-02 | 0.2 | Wrote the initial SRS against vision and scope, use cases, business rules, glossary, and open issues; reflected the 2026-09-24 scope reduction. | Team 05 |
| 2026-10-20 | 0.3 | Added COPPA-oriented consent, privacy notice, review, deletion, retention, and security requirements based on the supplied FTC Rule. | Grayson Whittingham, Claude |
| 2026-10-23 | 0.4 | Aligned with use cases v0.11, business rules v0.4, glossary v0.6, vision and scope v0.5, and architecture v0.4: selected technology/authentication, child credentials, sub-parent invitations, reports and per-child exclusions, shelf approval, four-option rating, reflection lifecycle, catalog/admin workflows, and revised privacy/safety boundaries. Recorded unresolved conflicts without deciding them. | Team 05 (documentation update) |

---

## 1. Introduction

### 1.1 The purpose of BookBuddies

BookBuddies is a web-first book discovery and tracking application for elementary-age children (approximately ages 6–11). A child receives recommendations from an onboarding profile and a tagged catalog; keeps a personal shelf; reacts to recommendations; and may rate or write reflections about finished books. A linked parent sets up the child's account, suggests books, reviews the child's shelf and reflections, and can remove or report books. The product is child-driven and parent-monitored. See [vision-and-scope.md](vision-and-scope.md) §§1–2.

### 1.2 The purpose of this document

This SRS is the entry point to what BookBuddies must do and the system qualities it must preserve. Detailed interaction sequences belong to [use-cases.md](use-cases.md); policies and obligations belong to [business-rules.md](business-rules.md); product boundaries belong to [vision-and-scope.md](vision-and-scope.md); architecture choices belong to [architectural-design.md](../../design/architectural-design.md). This document consolidates product perspective, actors, environment, interfaces, cross-cutting functional requirements, data requirements, and quality expectations.

### 1.3 Document conventions

- Requirements use one stable identifier and, where possible, EARS-style wording (“When ..., the system shall ...”). Existing IDs are not renamed or reassigned.
- **TBD / pending confirmation** means a client, team, or legal decision remains open. The official [OPEN-ISSUES.md](OPEN-ISSUES.md) is authoritative for `OI-*` identifiers. A proposed architecture choice does **not** settle a pending client decision.
- **Identifier collision:** [architectural-design.md](../../design/architectural-design.md) §“Open questions raised by this revision” independently uses `OI-20`–`OI-23` for different questions from the ones in OPEN-ISSUES.md. References to official `OI-20`–`OI-23` **here** always mean **COPPA operator, consent method, retention/consent timeout, and child real-name necessity**, respectively. The architecture's distinct questions must be assigned fresh IDs in a separate documentation cleanup.
- **In MVP** means included in vision-and-scope §4.3. **Post-MVP** and **conditional** record requirements without approving their implementation in the current release. Having a detailed use case alone does not establish MVP priority.
- The team's technology decisions are documented here as decisions, not falsely presented as client-imposed constraints. No application code is assumed to exist simply because a design document describes it.
- Material under `docs/external/` is supporting evidence, not a normative source for this SRS.

### 1.4 References

- [Project glossary](project-glossary.md)
- [Vision and scope](vision-and-scope.md)
- [Use cases](use-cases.md)
- [Business rules](business-rules.md)
- [Open issues](OPEN-ISSUES.md)
- [Architecture-of-record](../../design/architectural-design.md)
- [PAR design-of-record](../../design/par.md)
- [Traceability matrix](../traceability.md)
- [FTC COPPA Rule text](../coppa/coppa-full)
- [Easy Approach to Requirements Syntax (EARS)](https://alistairmavin.com/ears/)

As checked for this revision, `docs/coppa/coppa-design-requirements.md` and `docs/coppa/coppa-client-briefing.md` are proposed in [PR #44](https://github.com/videogames21/book_buddies/pull/44), not yet merged to `main`. The FTC text and merged `BR-coppa-*` rules are the current basis for this document. Existing documents referencing these unmerged files need reconciliation when PR #44 is resolved.

---

## 2. Overall Description

### 2.1 Product perspective

BookBuddies is a new, self-contained system. The MVP consists of a responsive child interface, linked parent interface, administration functions, rules-based recommender, local catalog and a single data store. An offline catalog importer seeds and refreshes tagged books; an external email service is needed for consent confirmation and account invitations. There is no school/LMS integration, live book-catalog API requirement, or ebook reader. Social sharing, groups, peer feeds, and ML re-ranking are not part of the approved MVP scope.

### 2.2 User classes and characteristics

| User class | Description | Source / outstanding decision |
|---|---|---|
| Child | Approximately ages 6–11, does not self-register; the parent chooses a login username and receives a generated password. Child-facing profile uses nickname and avatar, not the real name or reading level. | `BR-parent-creates-kid-account`, `BR-kid-anonymous-profile`, `UC-PAR-create-kid-account`. The use case still requires a nickname-field correction. |
| Main Parent | Creates a family account, completes consent, creates children and invites a Sub Parent; manages multiple linked children. | `BR-parent-account-structure`, `UC-PAR-onboarding`. |
| Sub Parent | Completes setup via an email invitation and can participate in linked child oversight and submit binding book reports. | `UC-PAR-create-sub-parent-account`, `BR-parent-report-book`. “Same permissions except creating/deleting accounts” is proposed; precise permissions and limits require client confirmation. |
| System Admin | Manages catalog, reported books, safety flags, possible suspensions, and aggregate statistics. | `UC-ADM-*`, `BR-admin-limited-view`. Seeing identifying details within flagged-content review is **not yet client-approved** (`OI-15`). |
| Teacher | **Not a user class.** | Withdrawn 2026-09-24 (`BR-user-roles`). |

### 2.3 Operating environment

- **OE-web-first:** The MVP shall run as a responsive web application on current desktop and mobile browsers; native apps are deferred. `OI-10` is **resolved** (web first). Exact supported browser versions, devices and minimum viewport sizes are not yet specified; do not mark these open under `OI-10`.
- **OE-hosting:** The selected architecture uses one Next.js application on Vercel and MongoDB Atlas for persistence (`KD-tech-stack`). Who will pay for and maintain the deployment after graduation, and the hosting budget, remain open (`OI-9`).

### 2.4 Design and implementation constraints

- **CO-single-application:** The product shall have one deployable application and one database. The catalog import is an offline script; a scheduled cleanup trigger is not a separate application service (`KD-deployment-shape`).
- **CO-no-ebook:** The system shall not host or display full book contents (`FEAT-ebook-reader`).
- **CO-no-social:** The MVP shall not provide public child profiles, messaging, stranger search, groups or peer feeds (`BR-no-open-discovery`; withdrawn social features in vision and scope).
- **CO-rules-first-recommender:** The MVP recommender shall use local, tagged catalog data and deterministic/rules-based matching. ML re-ranking is post-MVP; the client's preference for AI from the start has not been fully reconciled (`OI-2`).
- **CO-no-reading-level-assessment:** The system shall not test, calculate, assign or infer a child's reading level (`BR-no-reading-level-assessment`).
- **CO-coppa-adjacent:** The design shall build in FTC COPPA Rule requirements for notice, verifiable parental consent, parent rights, purpose limitation, data minimization, retention and reasonable security safeguards (`BR-coppa-*`, `docs/coppa/coppa-full`). Engineering to these requirements does not certify legal compliance (`AS-coppa-adjacent-only`, `OI-20`).
- **CO-no-third-party-sharing:** The MVP shall not publish identifiable children's data, use it for advertising disclosures, or send it to train external AI models. Any other disclosure must follow `BR-coppa-no-third-party-disclosure`, including separate parental permission when required. Service providers operating the system need suitable contractual/security assurances. The scope of disclosure affects permissible consent methods (`OI-21`).
- **CO-technology-stack:** This was listed as TBD in SRS v0.3, but the team selected **TypeScript, Next.js/React, MongoDB Atlas, Vercel and Auth.js database sessions** on 2026-10-05 (`KD-tech-stack`, `KD-auth-sessions`). This is a **team architectural choice**, not an externally imposed constraint. The proposed workaround for Auth.js Credentials with database sessions is security-sensitive and requires validation against the installed library version before implementation.

### 2.5 Assumptions and dependencies

- **AS-parent-account-first:** A parent account shall precede any linked child account, and child creation is parent-controlled (`UC-PAR-onboarding`).
- **AS-email-linking:** Main Parent registration and consent confirmation use email; Sub Parents are invited through email. Children use a parent-selected username and system-generated password.
- **AS-book-data-source / DE-book-dataset:** The system depends on an approved, pre-tagged children's-book seed dataset. Kaggle or GitHub were suggested, but no dataset is approved (`OI-1`).
- **AS-supported-browser:** Users need an internet connection and a supported browser.
- **DE-client-coppa-rules:** The FTC COPPA Rule text is in `docs/coppa/coppa-full`; the covered operator and ultimate responsible party remain unresolved (`OI-20`).
- **DE-email-provider:** An external email delivery service is needed for consent confirmation and invitations; the service, costs and privacy/security review are TBD (`OI-9`, `BR-coppa-no-third-party-disclosure`).
- **AS-seed-catalog-size:** The initial catalog is expected to contain approximately 30–50 books; user/family counts and production volume remain TBD (`OI-12`).

---

## 3. Project Glossary

Link only: [project-glossary.md](project-glossary.md), now v0.6. Group/peer features, Achievement Page, Stretch My Reader, the in-app reading test, and Teacher are listed as **retired**. The Rating entry now defines the team-selected four-option scale; the SRS v0.3 warning that these terms remain live is obsolete.

## 4. Vision and Scope

Link only: [vision-and-scope.md](vision-and-scope.md). Its §4.3 is the MVP scope authority. Its older description of an unresolved rating scale is superseded by the glossary's 2026-10-07 decision and resolved `OI-17`; that source should also be cleaned up separately.

---

## 5. Functional Requirements

### 5.1 Use cases

Detailed use cases are in [use-cases.md](use-cases.md), v0.11. All four areas are now described; the former claim that only the Sub Parent use case is fully specified is obsolete. Specified flows still contain some unresolved decisions.

| Area | Use cases | Scope and pending details |
|---|---|---|
| PAR | `UC-PAR-onboarding`, `UC-PAR-create-sub-parent-account`, `UC-PAR-create-kid-account`, `UC-PAR-suggest-book`, `UC-PAR-view-growth-report`, `UC-PAR-report-book` | Growth recap remains post-MVP unless reconfirmed; Sub Parent role limits need approval. |
| REC | `UC-REC-kid-onboarding`, `UC-REC-recommend-quiz-rules`, `UC-REC-recommend-quiz-ai`, `UC-REC-parent-review`, `UC-REC-kid-review` | AI flow is post-MVP. Recommendation batch approval is **not** the disputed 24-hour parent activity review. |
| SHLF | `UC-SHLF-parent-view-shelf`, `UC-SHLF-kid-view-shelf`, `UC-SHLF-kid-move-book`, `UC-SHLF-kid-remove-book`, `UC-SHLF-kid-rate-book`, `UC-SHLF-kid-add-note`, `UC-SHLF-parent-remove-book`, `UC-SHLF-manual-search` | Manual-search shelf addition requires linked-parent approval; related business rule and parent-side workflow need reconciliation. |
| ADM | `UC-ADM-add-content`, `UC-ADM-block-content`, `UC-ADM-suspend-account`, `UC-ADM-view-recommender-stats`, `UC-ADM-view-usage-stats`, `UC-ADM-flag-review` | Admin child-identity exception, suspension authority, safety detection and escalation are unresolved. |

### 5.2 Non-use-case functional requirements

**Accounts, consent and onboarding**

- **FR-ACCT-parent-first:** The system shall allow child accounts to be created only by an authorized linked parent, not through child self-registration (`BR-parent-creates-kid-account`).
- **FR-ACCT-multi-child:** A Main Parent shall be able to manage more than one child and invite a Sub Parent (`BR-parent-account-structure`).
- **FR-ACCT-child-display:** Child-facing pages shall display only the child's nickname and avatar, not their real name or reading level (`BR-kid-anonymous-profile`). `UC-PAR-create-kid-account` still needs an explicit nickname input and correction of child-facing name visibility.
- **FR-ACCT-credentials:** When a child account is created, the parent shall choose a unique username; the system shall generate an initial password, show it to that parent once and store only a salted hash (`UC-PAR-create-kid-account`, `KD-auth-sessions`). Later password reset/current-password visibility rules remain pending, rather than assumed approved.
- **FR-ACCT-sub-parent-invite:** The system shall email an invitation to the designated Sub Parent and allow the invitee to set up their own username/password before activating access (`UC-PAR-create-sub-parent-account`). The invite expiry, limits and permissions are TBD. A Sub Parent's book report is binding per `BR-parent-report-book`.
- **FR-ACCT-consent:** At parent registration, the system shall show the direct notice, require an explicit non-prechecked acknowledgment, and record notice version, date and method. A checkbox alone does **not** establish verifiable parental consent (`BR-coppa-parental-consent`, `DI-consent-record`).
- **FR-ACCT-consent-confirm:** The system shall not create child profiles or collect child data until the required verifiable parental consent is completed; it shall send confirmation by email when the selected method requires it (`BR-coppa-parental-consent`). **Email-plus is proposed but not finalized** (`OI-21`). It depends on the permitted data-use/disclosure boundary. If consent is not completed within a defined period, the system shall delete contact data held solely to obtain consent and the corresponding unconfirmed account (`OI-22`).
- **FR-DATA-notice:** The online privacy notice shall be linked from the home screen and relevant child-data collection points, and disclose practices, retention, and parent rights (`BR-coppa-notice`, `BR-coppa-retention`).
- **FR-DATA-review:** The system shall allow a verified linked parent to review personal information held about their child, learn its categories, stop future collection/use, and request deletion (`BR-coppa-parent-rights`).
- **FR-ONB-profile:** Parent-led child creation shall collect age/grade and justified identity/account fields. The child's initial reading-profile flow shall collect interests and previously read favorite books (`UC-PAR-create-kid-account`, `UC-REC-kid-onboarding`). Real-name necessity remains under review (`OI-23`).
- **FR-ONB-level-optional:** The parent shall be able to enter an optional reading level or skip it; the system may link to external tools for reference but shall never assess/infer the level (`BR-reading-level-parent-entered`).

**Recommendations, shelf, rating, and reflections**

- **FR-REC-rules:** On a child's recommendation request, the system shall match books from the active tagged catalog using age/grade as the main signal and parent-entered reading level only as an optional difficulty input, and exclude books blocked globally or reported for that child. Exact matching/ranking and batch size remain TBD (`BR-reading-level-proxy`, `BR-parent-report-book`, `OI-2`).
- **FR-REC-every-request:** The system shall allow new recommendation requests repeatedly, not only at initial onboarding (`FEAT-recommendation-quiz`).
- **FR-REC-react:** The child shall be able to accept, defer or decline each recommendation and optionally specify a decline reason (`UC-REC-kid-review`). This pre-reading reaction is distinct from a finished-book rating.
- **FR-REC-parent-suggest:** A parent suggestion with optional personal note shall appear in the child's recommendations, not automatically on the shelf; the child may accept or decline it (`BR-parent-rec-not-forced`).
- **FR-SHLF-categories:** The shelf shall contain **Reading Now, Want to Read, Maybe Later, Finished** (`FEAT-shelf`, current flowchart and shelf use cases).
- **FR-SHLF-parent-remove:** When an authorized parent removes a book from a child's shelf, the system shall create an in-app notice to the child (`BR-parent-shelf-removal`).
- **FR-SEARCH-manual:** The child shall be able to search eligible catalog books by title/author keyword. Globally blocked books and books excluded for that child by a parent report shall not appear (`UC-SHLF-manual-search`, `BR-parent-report-book`).
- **FR-SHLF-search-approval:** When a child requests adding a book found in manual search, the system shall create a pending shelf-add request; only approval by a linked parent may add the book to the child's chosen shelf category (`UC-SHLF-manual-search`). **Pending:** a governing business rule, full parent-side approval flow, expiry rules and decline/retry wording. Do not assume that accepted *recommendations* also require this approval.
- **FR-RATE-rating:** After finishing a book, the child shall be able to choose exactly **Loved it / Liked it / It was okay / Not for me**. Changing a rating replaces that child's prior selection on that book, not a community aggregate (`OI-17` **resolved** 2026-10-07; glossary “Rating”; `UC-SHLF-kid-rate-book`). The use case/vision documents still include stale “not decided” wording and need separate cleanup.
- **FR-NOTE-reflection:** A child may write/replace an optional reflection on a finished book, visible to linked parents, with no private-note option (`BR-notes-visible-to-parent`).
- **FR-NOTE-reflection-delete:** When a child chooses to delete an **unflagged** reflection, the system shall place it in a 24-hour pending-deletion state, permit restoration during that interval, and purge it after expiry. A flagged reflection shall not be self-deletable through that flow (`UC-SHLF-kid-add-note`). This is separate from the unconfirmed 24-hour *parent review* rule.
- **FR-NOTE-flagging:** If a reflection is detected to contain violent or self-harm material, the system shall persist its flag and active parent/admin alerts (`BR-note-safety-flagging`). Detection strategy, false positives, admin access and reporting to authorities remain open (`OI-15`, `OI-18`, `OI-19`); no unspecified escalation process is approved.
- **FR-NOTE-disclosure:** During onboarding, the system shall explain in child-appropriate language that concerning reflection content is flagged and shared with designated responsible adults (`FEAT-kid-reflections`).

**Parent oversight, reporting, and administration**

- **FR-PAR-review:** An authorized linked parent shall be able to see the child's shelf, ratings and reflections (`UC-SHLF-parent-view-shelf`).
- **FR-PAR-review-window:** Whether a parent must confirm review within 24 hours and whether non-confirmation suspends the child remains **TBD** (`BR-24hr-review-window`, `OI-16`). Do not implement or discard this mechanic until decided.
- **FR-PAR-content-removal:** An authorized parent shall be able to remove child-visible flagged content, and separately to report unsuitable catalog books (`BR-parent-content-removal`, `UC-PAR-report-book`).
- **FR-PAR-report-book:** When a Main or Sub Parent reports a book from a pending recommendation batch or the child's shelf, the system shall require a reason and explicit confirmation after a warning that the report is final and false reporting may have consequences. On confirmation it shall store the report, permanently exclude the book **for that child** from recommendations and manual search, remove it from their current batch/shelf, generate a neutral child removal notice when applicable, and place the report in the admin queue (`BR-parent-report-book`, `UC-PAR-report-book`). The report, exclusion, removal and notice shall commit atomically. A Sub Parent's report binds the Main Parent. A later admin decision to discard the report does **not** remove the per-child exclusion. “Permanent” means while the child account remains in service; valid parental deletion rights still apply to child records.
- **FR-ADM-catalog:** An admin shall be able to add individual catalog entries, tag/activate drafts and block inappropriate books globally; offline imports may seed the catalog (`UC-ADM-add-content`, `UC-ADM-block-content`, `KD-catalog-import-offline`). An admin global block differs from a parent's per-child exclusion.
- **FR-ADM-report-review:** The system shall show parent book reports to authorized admins and permit the review decisions documented in `UC-ADM-block-content`, such as global block, dismissal or parent warning as applicable. Dismissal shall not restore a book for a child whose parent excluded it (`BR-parent-report-book`).
- **FR-ADM-flag-review:** The system shall support restricted flagged-content triage and disposition (`UC-ADM-flag-review`). **Proposed only:** a narrowly authorized, audited view of a flagged child's name, age, grade, username and the flagged material (`KD-admin-flag-review`). This exception must **not** be enabled until `OI-15` is resolved with the client. Suspension authority, escalation and dangerous-content retention are also unresolved (`OI-18` and architecture's separately numbered questions).
- **FR-DATA-removal:** On a verified parent's request, the system shall delete the child's personal data so it is no longer retrievable in the normal course of business: profile, interests, answers, shelf, ratings, reflections, associated reports/exclusions, notifications and applicable logs (`BR-coppa-parent-rights`). Any legal preservation exception for safety evidence needs explicit authority and a defined retention policy; do not assume one. Deletion or irreversible de-identification must also address any book-level aggregate originally derived from the child.

**Post-MVP / conditional:** `FR-REC-ml` (ML re-ranking, `FEAT-ai-recommendation`), `FR-BADGE-identity` (`FEAT-reading-identity-badges`, `OI-14`), `FR-RECAP-adult` (qualitative adult recap), `UC-ADM-add-admin`, and `UC-SHLF-view-badges`. `UC-PAR-view-growth-report` is also post-MVP pending client confirmation under vision-and-scope §4.3.

---

## 6. Business Rules

Link only: [business-rules.md](business-rules.md), v0.4. This includes `BR-parent-report-book` and the COPPA rule set, but still leaves the Sub Parent authorization rule and manual-search parental-approval business rule to be reconciled. No new business rule is silently created by this SRS.

---
## 7. Data Requirements

### 7.1 Business domain model

Primary entities are **Family**, **Main Parent account**, **Sub Parent account/invitation**, **Parent consent record**, **Child credentials/session**, **Child identity record**, **Child reading profile**, **Catalog book and tags**, **Recommendation batch/reaction**, **Shelf entry**, **Manual-search shelf request**, **Finished-book rating**, **Reflection**, **Safety flag**, **Parent book report**, **Per-child book exclusion**, **Notification**, and **Admin audit record**. A **Dangerous content entry** is conditional on unresolved access, retention and escalation decisions.

Each child belongs to one family and is reachable only by authorized linked parents (apart from a narrowly approved admin safety exception if `OI-15` is resolved). A child identity store is proposed to separate sensitive identity fields from reading activity and book data (`KD-pii-segregation`). Catalog books have draft/active/blocked states; per-child exclusions are separate from a globally blocked catalog entry. The architecture describes the detailed responsibilities in §5.2; the use cases own their data-field validation tables.

### 7.2 Data dictionary

- **DI-child-stored:** The system shall retain the age and grade needed by the recommender, an optional parent-entered reading level, and justified interests/favorites under an opaque child ID. The current `BR-kid-data-stored` also directs real-name storage, but the necessity and period for that field remain **open** (`OI-23`). `BR-kid-anonymous-profile` still prohibits showing the real name on the child-facing profile.
- **DI-book-tags:** Catalog books shall include available genre, mood, format, themes, length, age fit and reading-level metadata. The final source and approved tag list remain TBD (`OI-1`, `FEAT-book-tagging`).
- **DI-catalog-status:** Every catalog book shall have a state (draft, active, or blocked); an untagged new entry stays draft until the required tags are supplied. A blocked entry shall be excluded from new child recommendations/search, but historical parent shelf views may identify it as blocked (`UC-ADM-add-content`, `UC-ADM-block-content`, `UC-SHLF-parent-view-shelf`).
- **DI-pii-segregation:** Identifying child data shall be separated from ordinary shelf/recommendation data and blocked from general admin read paths. A flagged-content identity exception is **proposed only** (`OI-15`, `KD-admin-flag-review`), not generally granted.
- **DI-child-credentials:** Child usernames shall be unique; passwords shall be stored as salted hashes, not plaintext; independently revocable sessions shall support immediate server-side suspension (`UC-PAR-create-kid-account`, `KD-auth-sessions`).
- **DI-shelf-requests:** A manual-search shelf request shall store the child, catalog book, requested shelf category, status (pending, approved, declined, cancelled or already satisfied), relevant timestamps, and deciding parent where applicable; no shelf entry is created without approval (`UC-SHLF-manual-search`). Request expiry and repeated requests are not fully specified.
- **DI-report-exclusion:** A book report shall record book, child, reporting parent, reason and submission time. A separate per-child exclusion shall prevent the book appearing in new recommendations/search for that child, independent of whether an admin globally blocks or dismisses the reported catalog book (`UC-PAR-report-book`, `BR-parent-report-book`).
- **DI-field-tables:** Precise field types, constraints and authorization rules are defined by the use cases' Associated Information tables until those are reconciled into a single schema; do not invent values for TBD fields.

### 7.3 Reports

- Parents can view a linked child's shelf, finished-book ratings and reflections (`FR-PAR-review`).
- Admins can review parent-reported catalog books, safety flags and aggregate recommender/usage statistics (`UC-ADM-block-content`, `UC-ADM-flag-review`, `UC-ADM-view-recommender-stats`, `UC-ADM-view-usage-stats`). The precise visibility of a flagged child's identity is pending `OI-15`.
- A parent growth report or adult recap remains **post-MVP pending confirmation** (`UC-PAR-view-growth-report`, `BR-recap-qualitative-only`). If it is built, it must be a qualitative snapshot, not a child-facing performance scoreboard.

### 7.4 Data acquisition, integrity, retention, and disposal

- **DI-acquire:** Parents enter family/child account information and consent; children enter reading interests, reactions, shelf requests, ratings and reflections only after applicable parent consent has been verified.
- **DI-integrity:** A child record shall belong to a valid family; the system shall reject unauthorized cross-family access and orphan child records (`BR-parent-account-linked`). Parent reports, exclusions, related shelf/batch removals and necessary notifications shall commit atomically so no report exists without its exclusion.
- **DI-disposal:** Following a verified parent's request, the system shall delete the child's data so it is not retrievable in normal operations (`FR-DATA-removal`). Any legal hold or retention exception must be supported by an approved policy and assessed against COPPA rights rather than invented in code.
- **DI-retention:** The operator shall publish a written retention policy explaining purposes, business need and deletion timeframe, and enforce the policy with automated purge (`BR-coppa-retention`). Child-data duration, the unconfirmed-consent cleanup limit, and any dangerous-content preservation period are **TBD** (`OI-22` for the first two). The architecture's use of `OI-23` for dangerous-content retention conflicts with official `OI-23` (real-name necessity) and must be given its own issue before implementation.
- **DI-consent-record:** Each parent's consent record shall include the parent/family reference, notice version, acknowledgment and verification statuses, timestamps and method, and any separately authorized third-party disclosure (`BR-coppa-parental-consent`, `OI-21`). Recording an unchecked checkbox is not a substitute for verification.
- **DI-minimization:** Each child data field shall have a specific service purpose. Data not reasonably needed shall not be collected or retained; in particular, the child's real name remains under review (`BR-coppa-minimization`, `OI-23`).

---

## 8. External Interface Requirements

### 8.1 User interfaces

- **UI-child-simple:** The child UI shall use large touch targets, minimal reading to navigate and clear button-based recommendation choices (vision and scope §3.2).
- **UI-kid-no-metrics:** The child UI shall not display streaks, book/page counts, reading-level scores or comparisons with other children (`BR-kid-no-metrics`).
- **UI-parent-dashboard:** The parent UI shall support permitted account management, book suggestions, shelf/rating/reflection review, book removal, book reports, and approve/deny decisions for manual-search shelf requests. The latter parent-side workflow still needs a governing rule and complete use case.
- **UI-notifications:** The system shall show in-app child notices for shelf removals and request decisions, and parent/admin active alerts for safety flags. Consent and privacy notices shall be available in the required onboarding/collection paths.
- **UI-admin-restricted:** Admin interfaces shall show catalog management, reports and flagged-content triage without general disclosure of child identifiers. Any flagged-content exception is conditional on explicit client confirmation and audited narrow authorization (`OI-15`).
- Branding, detailed layouts, accessibility criteria, and the exact supported browser/device matrix remain TBD; no numeric target has been accepted by the client.

### 8.2 Hardware interfaces

None. The MVP has no hardware interface.

### 8.3 Software interfaces

- **SI-book-dataset:** An offline TypeScript importer shall load or update local catalog books from an approved tagged dataset; runtime child recommendation and manual search shall not call the external dataset or a live book API (`KD-catalog-import-offline`, `OI-1`).
- **SI-auth-sessions:** Authentication shall follow the selected server-enforced Auth.js/database session design, with password verification and revocable sessions. The planned Credentials-provider/database-session integration needs library-version-specific testing before being treated as an implemented contract (`KD-auth-sessions`).
- **SI-email-provider:** A selected external email provider shall deliver parent consent confirmation and Sub Parent invitation messages. Provider selection, processing scope and data security assurances are TBD (`DE-email-provider`, `BR-coppa-no-third-party-disclosure`).
- **SI-no-lms:** The MVP shall not connect to school systems or learning management systems.

### 8.4 API document

The architecture-of-record §8.2 and [PAR design-of-record](../../design/par.md) propose server actions and the response shape `{ ok: true, data }` or `{ ok: false, error: { code, message } }`. They are designs, not evidence of an implemented API. **The PAR design's `createParentAccount` action predates the newer email-confirmation-gated consent flow** in use-cases v0.11; it must be reconciled before implementation or testing. Other route contracts and their security/failure cases should be finalized as their corresponding use-case areas are designed.

### 8.5 Communications interfaces

- **CI-email-parent:** The system shall use email for Main Parent confirmation/account communication and Sub Parent invitations (`FR-ACCT-consent-confirm`, `FR-ACCT-sub-parent-invite`).
- **CI-in-app-alerts:** Safety flags, parent removals, manual-search approval/denial outcomes and other defined notifications shall persist in-app for their recipients, including when the recipient is offline. Extra email/push alerts and delivery service-level targets remain TBD. “Immediate alert” means prompt event creation/persistence, not a promise an offline parent has read it.

---

## 9. Quality Attributes

Unless an explicit target is specified here, the client has not approved a numeric service level. Quantitative targets should be agreed and tested rather than invented (`OI-11`, `OI-12`).

### 9.1 Usability

- **USE-child-first-run:** The MVP shall be designed so a child in its target age range can request a recommendation without requiring adult assistance; the success criterion must be validated with consented user testing (`OI-13`).
- **USE-parent-light:** Common parent actions such as reviewing a shelf, removing a book and responding to a request should require few steps; the number/threshold remains TBD.

### 9.2 Performance

- **PER-recommendation-latency:** Rules-based recommendations over the seed catalog shall return without unreasonable delay. A measurable latency target and expected concurrent user volume are TBD (`OI-11`, `OI-12`).

### 9.3 Security

- **SEC-pii-boundary:** Child identifying fields shall not be accessible through ordinary admin lists/APIs or general support/debug interfaces. A narrow, audited exception for flagged-content review has been **proposed** (`KD-admin-flag-review`), but shall not be enabled until the client settles `OI-15`. Admins shall never see plaintext passwords; parent “credentials” in older requirements must not be interpreted as readable password secrets.
- **SEC-role-authorization:** Every server action/route shall enforce the current authenticated role and family/child access on the server; an inaccessible UI button alone is not sufficient. Children shall see only their own account data; parents only linked family children.
- **SEC-no-private-notes:** Reflections shall remain visible to the child's linked parent (`BR-notes-visible-to-parent`); no child-only private notes are available in the MVP.
- **SEC-auth:** Passwords shall be hashed with a vetted method and authenticated through a tested mechanism. Auth.js with MongoDB-backed revocable sessions is the selected team design; its Credentials-session integration must be tested against the installed version, not assumed secure by description alone.
- **SEC-session-revocation:** On suspension, the system shall prevent further authenticated access and revoke/disable affected sessions at the server, rather than relying on a UI redirect (`UC-ADM-suspend-account`).
- **SEC-flag-review-audit:** **Only if the client approves `OI-15`'s exception**, each privileged view of a flagged child's identifying details shall log the admin ID, referenced flag and access time without copying the sensitive child content into general audit logs.
- **SEC-coppa-program:** The responsible operator shall maintain a written information security program with assigned responsibility, periodic risk assessment, appropriate safeguards, testing and review, and reasonable written assurances from service providers handling personal information, consistent with the applicable FTC COPPA Rule obligations (`BR-coppa-no-third-party-disclosure`, `docs/coppa/coppa-full`). The operator/coordinator are TBD (`OI-20`).

### 9.4 Safety

- **SAF-flag-delivery:** Detected reflection safety flags and required parent/admin alerts shall be durably saved, and alerts shall remain available after the recipient next signs in if previously offline. An alert shall not exist only as a server log. Exactly which detection signals trigger alerts remains pending (`OI-19`).
- **SAF-child-content:** Newly surfaced recommendations/search results shall come from approved active age-appropriate catalog books, excluding globally blocked books and permanent per-child report exclusions (`UC-ADM-block-content`, `BR-parent-report-book`).
- **SAF-detection-pending:** Release of automated violent/self-harm screening depends on decisions about method, accuracy, false positives, what admins may view, and possible reporting to authorities (`OI-15`, `OI-18`, `OI-19`). Do not present these as finalized implementation requirements.

### 9.5 Availability

An uptime objective has not been approved (`OI-9`, `OI-12`). Email and moderation failures must have explicit retry or safe-failure behavior. A reflection whose safety screening cannot run shall not be silently accepted as screened (`UC-SHLF-kid-add-note`).

### 9.6 Robustness

- **ROB-no-data-loss:** A failed save of a shelf change, rating, reflection or shelf request shall visibly report failure and preserve the input where retry is possible.
- **ROB-atomic-report:** A confirmed parent book report, per-child exclusion, necessary recommendation/shelf removals and child notice shall succeed or fail together (`UC-PAR-report-book`).
- **ROB-time-rules:** Reflection pending-deletion deadlines shall be enforced on data access independently of scheduled purging (`KD-time-rules-on-read`); the separate 24-hour *parent activity review* suspension rule remains contingent on `OI-16` and must not be conflated with reflection deletion.

### 9.7 Scalability, interoperability, maintainability

- **SCA-launch-scale:** The architecture targets a small cohort and an approximately 30–50-book catalog. User count and concurrency targets are TBD (`OI-12`).
- **MNT-handover:** The system shall be documented so a future maintainer can run, deploy and modify it without relying on the original team; who will own hosting/operations remains TBD (`OI-9`).
- Interoperability: No live LMS, school-system, ebook-reader, or outside recommendation-model integration is required for MVP.

---

## 10. Internationalization and Localization

The MVP is planned in English; the client has not asked for additional locales. Confirm before establishing an irreversible localization constraint. Child-facing and parent-facing accessibility targets are likewise not yet quantified.

---

## 11. Other Requirements

- **Legal:** COPPA is an engineering design obligation for the MVP (`CO-coppa-adjacent`). Whether BookBuddies legally qualifies as a covered operator and who owns legal duties during/after the student project require expert review (`AS-coppa-adjacent-only`, `OI-20`). The team should not claim certification or formal compliance merely from this specification.
- **Testing with children:** Real child testers who provide information require the appropriate parent consent first (`BR-coppa-parental-consent`); user recruitment/approval remains pending (`OI-13`). Automated tests should use synthetic, not real, children's data.
- **Security-critical tests before release:** Cross-family access denial, consent gates, child password/session revocation, parent report/exclusion atomicity, catalog global blocks, search requests requiring parent approval, the four-option rating enum, reflection pending deletion/restoration, durable alert persistence, and denial of unapproved admin identity access. Exact test fixtures and acceptance targets belong in the test plan and use cases.
- **Open issues that still block decisions:** `OI-1` dataset; `OI-2` AI scope/matching; `OI-9` hosting/maintainer; `OI-11` success targets; `OI-12` volumes; `OI-13` testing children; `OI-15` admin identity access; `OI-16` 24-hour parent review; `OI-18` authority escalation; `OI-19` flagging method; `OI-20` operator/legal status; `OI-21` consent method; `OI-22` retention and confirmation expiry; `OI-23` whether/how long to store a child's real name. `OI-10` (web-first) and `OI-17` (four-option ratings) are **resolved**, not TBD. The official open-issues file still lists some other historical questions (`OI-6`, `OI-7`, `OI-8`) that need cross-document reconciliation rather than arbitrary closure in this SRS.
- **Cross-document follow-ups (not changes made by this revision):** Correct the duplicate `OI-20`–`OI-23` meanings in the architecture; add child nickname to `UC-PAR-create-kid-account` and fix child-facing name visibility; update the PAR design's signup/consent contract; write the parent approval flow and governing business rule for manual-search shelf requests; fix stale rating-scale language in use cases and vision-and-scope; define Sub Parent privileges; reconcile the dangerous-content retention period and admin flag-review exception with the client; reconcile the handling of ratings/reflections when an admin globally blocks a catalog book. These remain explicit work items, not silently resolved choices.
