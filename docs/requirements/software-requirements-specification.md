# Software Requirements Specification

**Project:** BookBuddies  
**Team:** Team 05  
**Client:** Dr. Yang Yang  
**Version:** 0.9

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
| 2026-10-25 | 0.5 | Cleanup of stale references: the architecture's duplicate open-issue numbers are now `OI-24`–`OI-27`; the COPPA files are merged (PR #44); `OI-6`, `OI-7` and `OI-8` are resolved; the rating-scale cleanup in other documents is done. No requirement changed. | Team 05 (cleanup with Claude) |
| 2026-10-26 | 0.6 | Recorded team positions: only the Main Parent creates child accounts, after consent; the flagged-content review exception is the team's position pending `OI-15` (`FR-ADM-flag-review`, `SEC-pii-boundary`, `SEC-flag-review-audit`, `DI-pii-segregation`, `UI-admin-restricted`). From the 2026-09-24 notes: ratings and reflections feed the rule-based MVP (`FR-REC-rules`), and notifications are in-app only (`CI-in-app-alerts`). A block removes shelf entries (`DI-catalog-status`). | Team 05 (cleanup with Claude) |
| 2026-10-26 | 0.7 | Added `SEC-signin-throttling` (previously stated only in the architecture); listed the new use cases in §5.1 and cited them from `FR-DATA-review`, `FR-DATA-removal`, `FR-ADM-catalog` and `FR-SHLF-search-approval`; the admin may suspend and reinstate accounts and is, in practice, the client; the admin sees parents' and Sub Parents' names, usernames and emails, never passwords (`SEC-pii-boundary`). | Team 05 (cleanup with Claude) |
| 2026-10-26 | 0.8 | Added `FR-ADM-audit-log`; `FR-ADM-catalog` covers editing books; `FR-ADM-report-review` points repeated false reports to parent-account suspension; listed `UC-ADM-edit-content`, `UC-ADM-suspend-parent-account` and `UC-ADM-view-audit-log` in §5.1. | Team 05 (cleanup with Claude) |
| 2026-10-29 | 0.9 | Added `FR-NOT-weekly-reminder`: a weekly parent notification asking whether the child has finished a book that is not yet on the Finished shelf (client answers 2026-10-28, Q5 and Q14; channel and trigger shelf are `OI-30`). `FR-DATA-removal` now lists the derived interest profile, shelf history, the parent note and usage records, and no longer lists reflections (matches `BR-kid-data-stored` in business rules v0.8). Also applied the rest of the client's 2026-10-28 answers (`docs/external/client-answers-10-28-2026.md`), aligned with use cases v0.14 and business rules v0.8: children give structured responses only and write no free text (`FR-CHILD-structured`; `FR-NOTE-reflection`, `FR-NOTE-reflection-delete`, `FR-NOTE-disclosure`, `FR-PAR-review-window` and `SEC-no-private-notes` retired); the optional parent note and its word-list flagging for human review (`FR-NOTE-parent-note`, `FR-NOTE-flagging`); parent-confirmed finishes (`FR-SHLF-finish-confirm`); the child and parent dashboards, follow-up books after a rating and the admin's child lookup by internal child ID (`FR-SHLF-dashboard`, `FR-PAR-dashboard`, `FR-REC-post-rating`, `FR-ADM-child-lookup`, `FR-ADM-v1-measures`); no child real name, an internal child ID, an inventory of stored child data, usage records and the curated seed catalog (`DI-child-stored`, `DI-child-id`, `DI-parent-note`, `DI-usage-records`, `DI-finish-confirmation`, `DI-book-id`, `SI-book-dataset`); configurable consent and retention; resolved `OI-1`, `OI-12`, `OI-13`, `OI-16`, `OI-23`, `OI-24`, `OI-28`; added `OI-29` to `OI-32` to the blocking list. | Team 05 (with Claude) |

---

## 1. Introduction

### 1.1 The purpose of BookBuddies

BookBuddies is a web-first book discovery and tracking application for elementary-age children (approximately ages 6–11). A child receives recommendations from an onboarding profile and a tagged catalog; keeps a personal shelf; reacts to recommendations; and rates a book once a parent confirms the child finished it. A child responds only through structured choices, never free text (`BR-child-structured-responses`). A linked parent sets up the child's account, may add an optional short note about the child's reading interests, suggests books, confirms finished books, reviews the child's shelf and ratings, and can remove or report books. The product is child-participating and parent-monitored. See [vision-and-scope.md](vision-and-scope.md) §§1–2.

### 1.2 The purpose of this document

This SRS is the entry point to what BookBuddies must do and the system qualities it must preserve. Detailed interaction sequences belong to [use-cases.md](use-cases.md); policies and obligations belong to [business-rules.md](business-rules.md); product boundaries belong to [vision-and-scope.md](vision-and-scope.md); architecture choices belong to [architectural-design.md](../../design/architectural-design.md). This document consolidates product perspective, actors, environment, interfaces, cross-cutting functional requirements, data requirements, and quality expectations.

### 1.3 Document conventions

- Requirements use one stable identifier and, where possible, EARS-style wording (“When ..., the system shall ...”). Existing IDs are not renamed or reassigned.
- **TBD / pending confirmation** means a client, team, or legal decision remains open. The official [OPEN-ISSUES.md](OPEN-ISSUES.md) is authoritative for `OI-*` identifiers. A proposed architecture choice does **not** settle a pending client decision.
- **Identifier collision (resolved 2026-10-25):** [architectural-design.md](../../design/architectural-design.md) v0.4 used `OI-20`–`OI-23` for questions different from the ones in OPEN-ISSUES.md. Those questions are now `OI-24` (flagged reflections kept on a block), `OI-25` (Sub Parent permissions), `OI-26` (child password reset) and `OI-27` (dangerous content retention). `OI-20`–`OI-23` always mean **COPPA operator, consent method, retention/consent timeout, and child real-name necessity**, respectively.
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
- [Client answers, 2026-10-28](../external/client-answers-10-28-2026.md) (supporting evidence, not normative)
- [FTC COPPA Rule text](../coppa/coppa-full)
- [Easy Approach to Requirements Syntax (EARS)](https://alistairmavin.com/ears/)

- [COPPA design requirements](../coppa/coppa-design-requirements.md) and [COPPA client briefing](../coppa/coppa-client-briefing.md), merged to `main` in [PR #44](https://github.com/videogames21/book_buddies/pull/44). The briefing was sent to the client, who replied on 2026-10-28 (`docs/external/client-answers-10-28-2026.md`).

The FTC text and the `BR-coppa-*` rules are the basis for this document's COPPA requirements.

---

## 2. Overall Description

### 2.1 Product perspective

BookBuddies is a new, self-contained system. The MVP consists of a responsive child interface, linked parent interface, administration functions, rules-based recommender, local catalog and a single data store. An offline catalog importer seeds and refreshes tagged books; an external email service is needed for consent confirmation and account invitations. There is no school/LMS integration, live book-catalog API requirement, or ebook reader. Social sharing, groups, peer feeds, and ML re-ranking are not part of the approved MVP scope. The current version is a limited prototype for a few dozen families, built so that a later public release, a larger catalog, longitudinal child data and parent notifications do not need a rebuild (client answers 2026-10-28, overall comments and Q1, Q11, Q12).

### 2.2 User classes and characteristics

| User class | Description | Source / outstanding decision |
|---|---|---|
| Child | Approximately ages 6–11, does not self-register; the parent chooses a login username and receives a generated password. Child-facing profile uses nickname and avatar. The system holds no real name for the child and shows no reading level; an internal child ID links the child's data. A child responds only through structured choices. | `BR-parent-creates-kid-account`, `BR-kid-anonymous-profile`, `BR-kid-data-stored`, `BR-child-structured-responses`, `UC-PAR-create-kid-account`. |
| Main Parent | Creates a family account, completes consent, creates children and invites a Sub Parent; manages multiple linked children; may add an optional note about a child's reading interests and confirms finished books. | `BR-parent-account-structure`, `UC-PAR-onboarding`. |
| Sub Parent | Completes setup via an email invitation and can participate in linked child oversight, confirm finished books and submit binding book reports. | `UC-PAR-create-sub-parent-account`, `BR-parent-report-book`. “Same permissions except creating/deleting accounts” is proposed; precise permissions and limits require client confirmation. |
| System Admin | Manages catalog, reported books, flagged parent notes, suspensions and reinstatements, aggregate statistics and, by internal child ID, one child's usage data. The client is, in practice, the system admin (team decision 2026-10-26). | `UC-ADM-*`, `BR-admin-limited-view`. Sees parents' and Sub Parents' names, usernames and emails, never passwords. Seeing a flagged child's nickname, internal child ID, age, grade and username within flagged-content review, and nowhere else, is the team's position (2026-10-26, `KD-admin-flag-review`); the client has not yet confirmed it (`OI-15`). |
| Teacher | **Not a user class.** | Withdrawn 2026-09-24 (`BR-user-roles`). |

### 2.3 Operating environment

- **OE-web-first:** The MVP shall run as a responsive web application on current desktop and mobile browsers; native apps are deferred. `OI-10` is **resolved** (web first). Exact supported browser versions, devices and minimum viewport sizes are not yet specified; do not mark these open under `OI-10`.
- **OE-hosting:** The selected architecture uses one Next.js application on Vercel and MongoDB Atlas for persistence (`KD-tech-stack`). Who will pay for and maintain the deployment after graduation, and the hosting budget, remain open (`OI-9`).

### 2.4 Design and implementation constraints

- **CO-single-application:** The product shall have one deployable application and one database. The catalog import is an offline script; a scheduled cleanup trigger is not a separate application service (`KD-deployment-shape`).
- **CO-no-ebook:** The system shall not host or display full book contents (`FEAT-ebook-reader`).
- **CO-no-social:** The MVP shall not provide public child profiles, messaging, stranger search, groups or peer feeds (`BR-no-open-discovery`; withdrawn social features in vision and scope).
- **CO-rules-first-recommender:** The MVP recommender shall use local, tagged catalog data and deterministic/rules-based matching. ML re-ranking is post-MVP. The client accepted rule-based recommendation for V1 and AI later (2026-10-28, Q7), and asked what AI would need (outside services, infrastructure, storage, cost); no outside AI service sees child data in V1 (`OI-2`, `BR-coppa-no-third-party-disclosure`).
- **CO-no-reading-level-assessment:** The system shall not test, calculate, assign or infer a child's reading level (`BR-no-reading-level-assessment`).
- **CO-coppa-adjacent:** The design shall build in FTC COPPA Rule requirements for notice, verifiable parental consent, parent rights, purpose limitation, data minimization, retention and reasonable security safeguards (`BR-coppa-*`, `docs/coppa/coppa-full`). Engineering to these requirements does not certify legal compliance (`AS-coppa-adjacent-only`, `OI-20`).
- **CO-no-third-party-sharing:** The MVP shall not publish identifiable children's data, use it for advertising disclosures, or send it to train external AI models. Any other disclosure must follow `BR-coppa-no-third-party-disclosure`, including separate parental permission when required. Service providers operating the system need suitable contractual/security assurances. The scope of disclosure affects permissible consent methods (`OI-21`).
- **CO-technology-stack:** This was listed as TBD in SRS v0.3, but the team selected **TypeScript, Next.js/React, MongoDB Atlas, Vercel and Auth.js database sessions** on 2026-10-05 (`KD-tech-stack`, `KD-auth-sessions`). This is a **team architectural choice**, not an externally imposed constraint. The proposed workaround for Auth.js Credentials with database sessions is security-sensitive and requires validation against the installed library version before implementation.

### 2.5 Assumptions and dependencies

- **AS-parent-account-first:** A parent account shall precede any linked child account, and child creation is parent-controlled (`UC-PAR-onboarding`).
- **AS-email-linking:** Main Parent registration and consent confirmation use email; Sub Parents are invited through email. Children use a parent-selected username and system-generated password.
- **AS-book-data-source / DE-book-dataset:** The system depends on the client's curated seed catalog, `BookBuddies_Seed_Catalog.xlsx` (134 tagged books). The Kaggle and GitHub datasets are not used (client answers 2026-10-28, Q11; `OI-1` resolved). The approved tag lists are taken from the spreadsheet.
- **AS-supported-browser:** Users need an internet connection and a supported browser.
- **DE-client-coppa-rules:** The FTC COPPA Rule text is in `docs/coppa/coppa-full`; the covered operator and ultimate responsible party remain unresolved (`OI-20`).
- **DE-email-provider:** An external email delivery service is needed for consent confirmation and invitations; the service, costs and privacy/security review are TBD (`OI-9`, `BR-coppa-no-third-party-disclosure`).
- **AS-seed-catalog-size:** The initial catalog is the 134-book curated seed. The client expects a few dozen families in the first year and asks that the design not prevent later scaling (client answers 2026-10-28, Q12; `OI-12` resolved).
- **AS-pilot-testing:** A few real children and their parents test the prototype with the parent present, after written parent permission. The separate feedback form collects no names, and usage data uses an internal test/child ID (client answers 2026-10-28, Q2; `OI-13` resolved).

---

## 3. Project Glossary

Link only: [project-glossary.md](project-glossary.md), now v0.11. Group/peer features, Achievement Page, Stretch My Reader, the in-app reading test, and Teacher are listed as **retired**; so are child reflections and the 24-hour review. The Rating entry now defines the team-selected four-option scale; the SRS v0.3 warning that these terms remain live is obsolete.

## 4. Vision and Scope

Link only: [vision-and-scope.md](vision-and-scope.md). Its §4.3 is the MVP scope authority. Its rating-scale entry follows the glossary's 2026-10-07 decision and resolved `OI-17`.

---

## 5. Functional Requirements

### 5.1 Use cases

Detailed use cases are in [use-cases.md](use-cases.md), v0.14. All four areas are now described; the former claim that only the Sub Parent use case is fully specified is obsolete. Specified flows still contain some unresolved decisions.

| Area | Use cases | Scope and pending details |
|---|---|---|
| PAR | `UC-PAR-onboarding`, `UC-PAR-create-sub-parent-account`, `UC-PAR-create-kid-account`, `UC-PAR-suggest-book`, `UC-PAR-view-growth-report`, `UC-PAR-report-book`, `UC-PAR-review-child-data`, `UC-PAR-delete-child-data`, `UC-PAR-revoke-consent`, `UC-PAR-delete-kid-account`, `UC-PAR-approve-shelf-request` | The client asked for a weekly parent dashboard (`UC-PAR-view-growth-report`, 2026-10-28, Q10); it is in the MVP (team decision 2026-10-29), and what it may show is `OI-31`. Sub Parent role limits need approval (`OI-25`); whether manual search keeps its approval step needs the client. |
| REC | `UC-REC-kid-onboarding`, `UC-REC-recommend-quiz-rules`, `UC-REC-recommend-quiz-ai`, `UC-REC-parent-review`, `UC-REC-kid-review` | AI flow is post-MVP. The 24-hour parent review is dropped (`OI-16` resolved); an unopened batch is released to the child unchanged, and whether the follow-up books after a rating skip parent review is `OI-32`. |
| SHLF | `UC-SHLF-parent-view-shelf`, `UC-SHLF-kid-view-shelf`, `UC-SHLF-kid-dashboard`, `UC-SHLF-kid-move-book`, `UC-SHLF-kid-remove-book`, `UC-SHLF-kid-rate-book`, `UC-SHLF-par-finish-book`, `UC-SHLF-parent-remove-book`, `UC-SHLF-manual-search` | `UC-SHLF-kid-add-note` was removed (children write no free text). Manual-search shelf addition requires linked-parent approval; related business rule and parent-side workflow need reconciliation. Whether the child dashboard complies with `BR-kid-no-metrics` is `OI-31`. |
| ADM | `UC-ADM-add-content`, `UC-ADM-edit-content`, `UC-ADM-block-content`, `UC-ADM-unblock-content`, `UC-ADM-suspend-account`, `UC-ADM-suspend-parent-account`, `UC-ADM-reinstate-account`, `UC-ADM-view-recommender-stats`, `UC-ADM-view-usage-stats`, `UC-ADM-view-audit-log`, `UC-ADM-flag-review` | The admin's authority to suspend is settled (2026-10-26). Client confirmation of the child-identity exception (`OI-15`) is still open. For V1, flagged parent notes use an internal word list with human review and no outside reporting (`OI-18`, `OI-19`, answered for V1). |

### 5.2 Non-use-case functional requirements

**Accounts, consent and onboarding**

- **FR-ACCT-parent-first:** The system shall allow child accounts to be created only by the family's Main Parent, after parental consent is confirmed, and never through child self-registration (`BR-parent-creates-kid-account`, `FR-ACCT-consent-confirm`). A Sub Parent cannot create child accounts (`UC-PAR-create-kid-account`, `OI-25`).
- **FR-ACCT-multi-child:** A Main Parent shall be able to manage more than one child and invite a Sub Parent (`BR-parent-account-structure`).
- **FR-ACCT-child-display:** Child-facing pages shall display only the child's nickname and avatar, not their real name or reading level (`BR-kid-anonymous-profile`). The parent enters the nickname when creating the child account (`UC-PAR-create-kid-account`). The system holds no real name for the child; the nickname is the profile name and an internal child ID links the child's data (`BR-kid-data-stored`, `DI-child-id`).
- **FR-ACCT-credentials:** When a child account is created, the parent shall choose a unique username; the system shall generate an initial password, show it to that parent once and store only a salted hash (`UC-PAR-create-kid-account`, `KD-auth-sessions`). Later password reset/current-password visibility rules remain pending, rather than assumed approved.
- **FR-ACCT-sub-parent-invite:** The system shall email an invitation to the designated Sub Parent and allow the invitee to set up their own username/password before activating access (`UC-PAR-create-sub-parent-account`). The invite expiry, limits and permissions are TBD. A Sub Parent's book report is binding per `BR-parent-report-book`.
- **FR-ACCT-consent:** At parent registration, the system shall show the direct notice, require an explicit non-prechecked acknowledgment, and record notice version, date and method. A checkbox alone does **not** establish verifiable parental consent (`BR-coppa-parental-consent`, `DI-consent-record`).
- **FR-ACCT-consent-confirm:** The system shall not create child profiles or collect child data until the required verifiable parental consent is completed; it shall send confirmation by email when the selected method requires it (`BR-coppa-parental-consent`). **Parent consent plus email confirmation, a consent record and revocation is accepted for V1** (`OI-21`, client answers 2026-10-28, Q13). It depends on the permitted data-use/disclosure boundary, and the method shall stay configurable because testing and legal review may change it. If consent is not completed within a configurable period (placeholder 14 days), the system shall delete contact data held solely to obtain consent and the corresponding unconfirmed account (`OI-22`, Q9).
- **FR-DATA-notice:** The online privacy notice shall be linked from the home screen and relevant child-data collection points, and disclose practices, retention, and parent rights (`BR-coppa-notice`, `BR-coppa-retention`).
- **FR-DATA-review:** The system shall allow a verified linked parent to review personal information held about their child, learn its categories, stop future collection/use, and request deletion (`BR-coppa-parent-rights`; `UC-PAR-review-child-data`, `UC-PAR-revoke-consent`, `UC-PAR-delete-child-data`, `UC-PAR-delete-kid-account`). The parent shall be able to download a copy of the data (`UC-PAR-review-child-data`).
- **FR-ONB-profile:** Parent-led child creation shall collect a nickname, age, grade and the other justified account fields, give the child an internal child ID, and never ask for the child's real or legal name (`OI-23` resolved). It may also collect the optional parent note (`FR-NOTE-parent-note`). The child's initial reading-profile flow shall collect interests and previously read favorite books (`UC-PAR-create-kid-account`, `UC-REC-kid-onboarding`). Whether age and grade stay as stored fields is `OI-29`.
- **FR-ONB-level-optional:** The parent shall be able to enter an optional reading level or skip it; the system may link to external tools for reference but shall never assess/infer the level (`BR-reading-level-parent-entered`).

**Recommendations, shelf, rating, and parent notes**

- **FR-REC-rules:** On a child's recommendation request, the system shall match books from the active tagged catalog using age/grade as the main signal and parent-entered reading level only as an optional difficulty input, and exclude books blocked globally or reported for that child. Per the 2026-09-24 notes and the client's 2026-10-28 answers (overall comment 3, Q7), the rule-based MVP also learns from the child's choices and ratings, the parent's optional note and the shelf history over time, all under the internal child ID, with rating weight kept low at first (`client-interview-2026-09-24.md`). Exact matching/ranking, how ratings, decline reasons and parent notes enter the rules, and batch size remain TBD (`BR-reading-level-proxy`, `BR-parent-report-book`, `OI-2`).
- **FR-REC-every-request:** The system shall allow new recommendation requests repeatedly, not only at initial onboarding (`FEAT-recommendation-quiz`).
- **FR-REC-react:** The child shall be able to accept, defer or decline each recommendation and optionally choose a decline reason from a fixed list, never free text (`UC-REC-kid-review`, `BR-child-structured-responses`). This pre-reading reaction is distinct from a finished-book rating.
- **FR-REC-parent-suggest:** A parent suggestion with optional personal note shall appear in the child's recommendations, not automatically on the shelf; the child may accept or decline it (`BR-parent-rec-not-forced`).
- **FR-SHLF-categories:** The shelf shall contain **Reading Now, Want to Read, Maybe Later, Finished** (`FEAT-shelf`, current flowchart and shelf use cases).
- **FR-SHLF-parent-remove:** When an authorized parent removes a book from a child's shelf, the system shall create an in-app notice to the child (`BR-parent-shelf-removal`).
- **FR-SEARCH-manual:** The child shall be able to search eligible catalog books by title/author keyword. Globally blocked books and books excluded for that child by a parent report shall not appear (`UC-SHLF-manual-search`, `BR-parent-report-book`).
- **FR-SHLF-search-approval:** When a child requests adding a book found in manual search, the system shall create a pending shelf-add request; only approval by a linked parent may add the book to the child's chosen shelf category (`UC-SHLF-manual-search`). The parent-side flow is `UC-PAR-approve-shelf-request`. **Pending:** a governing business rule, client confirmation that approval is wanted at all (the 2026-09-24 notes say "no parent approval step for kid book selections"), expiry rules and decline/retry wording. Do not assume that accepted *recommendations* also require this approval.
- **FR-RATE-rating:** After finishing a book, the child shall be able to choose exactly **Loved it / Liked it / It was okay / Not for me**. Changing a rating replaces that child's prior selection on that book, not a community aggregate. A child can rate a book only after a parent has confirmed the finish (`FR-SHLF-finish-confirm`) (`OI-17` **resolved** 2026-10-07; glossary “Rating”; `UC-SHLF-kid-rate-book`). The client's Q14 wording “taps their stars” is read as this scale (team decision 2026-10-29).
- **FR-REC-post-rating:** Right after a child rates a book, the system shall show 3 books the child might like next, based on the rating (`UC-SHLF-kid-rate-book`; client answers 2026-10-28, Q14). Whether these skip the parent's batch review is `OI-32`.
- **FR-SHLF-finish-confirm:** When a child moves a book to Finished, the system shall hold it as awaiting a linked parent's confirmation, shown grayed out without the confirmed-finished icon. The parent confirms, or says “not finished yet” and the book returns to its previous category with a notice to the child. Only a confirmed finish lets the child rate the book, and a confirmation stays with the book wherever the child later moves it (`UC-SHLF-par-finish-book`, `UC-SHLF-kid-move-book`; team decision 2026-10-29). The confirmation, the optional parent note, any flag and any admin alert are one save.
- **FR-SHLF-dashboard:** A child shall be able to open a dashboard from the shelf showing parent-approved recommended books, a radar chart of current reading interests and their shelf activity and history, with no numbers, scale marks or comparisons (`UC-SHLF-kid-dashboard`; client answers 2026-10-28, Q10). Whether it complies with `BR-kid-no-metrics` is `OI-31`; badges stay off it until `OI-14` is settled.
- **FR-CHILD-structured:** The child-facing product shall take no free text. A child responds only through predefined choices: Yes/Maybe/No on a recommendation, a “Not for Me” reason from a fixed list, a rating from the four-option scale, and other predefined options (`BR-child-structured-responses`; client answers 2026-10-28, overall comment 2 and Q8).
- **FR-NOTE-reflection:** *Retired 2026-10-28.* Children no longer write reflections (`BR-child-structured-responses`); the identifier is not reused. `SEC-no-private-notes` and `BR-notes-visible-to-parent` retired with it.
- **FR-NOTE-reflection-delete:** *Retired 2026-10-28.* There are no child reflections to delete, so there is no 24-hour pending-deletion state (`UC-SHLF-kid-add-note` was removed).
- **FR-NOTE-parent-note:** A parent may add an optional free-text note of at most 250 characters about the child's reading interests, when creating the child's profile and after confirming a finished book, and may edit it later. It is shown with the prompt not to include personal, identifying, sensitive or confidential information, is visible to the parent, feeds the recommender and is never shown to the child (`BR-parent-note`; `UC-PAR-create-kid-account`, `UC-SHLF-par-finish-book`). Where a parent edits or deletes the creation-time note is not yet specified.
- **FR-NOTE-flagging:** When a parent note matches the internal word list, the system shall save the note with a flag and issue an in-app alert, carrying no note content, so an authorized admin can review it. It shall take no automatic action and send nothing to an outside service or party (`BR-note-safety-flagging`; `UC-PAR-create-kid-account` step 5.1, `UC-SHLF-par-finish-book` step 8). Each flag is stored with its detection method and version and the admin's decision, so a better detector can be added later without reshaping the data. A stronger detector and any reporting outside wait for what testing shows and for legal advice (`OI-18`, `OI-19`).
- **FR-NOTE-disclosure:** *Retired 2026-10-28.* It told the child that concerning reflections are reported. Children write no free text, so there is nothing to disclose to them.

**Parent oversight, reporting, and administration**

- **FR-PAR-review:** An authorized linked parent shall be able to see the child's shelf and ratings (`UC-SHLF-parent-view-shelf`).
- **FR-PAR-dashboard:** A parent shall be able to see a weekly dashboard of the child's reading journey, changing interests and activity over time, built from the child's data under the internal child ID (`UC-PAR-view-growth-report`; client answers 2026-10-28, Q10). It is an engagement feature and is in the MVP (team decision 2026-10-29). What it may show, given `BR-recap-qualitative-only`, is `OI-31`.
- **FR-PAR-review-window:** *Retired 2026-10-28.* The client dropped the 24-hour parent review, which was meant for reviewing a child's free-text notes; no account is suspended for a missed review (`OI-16` resolved, `BR-24hr-review-window` retired). The weekly engagement features replace it (`FR-NOT-weekly-reminder`, `FR-PAR-dashboard`).
- **FR-PAR-content-removal:** An authorized parent shall be able to remove child-visible flagged content, and separately to report unsuitable catalog books (`BR-parent-content-removal`, `UC-PAR-report-book`).
- **FR-PAR-report-book:** When a Main or Sub Parent reports a book from a pending recommendation batch or the child's shelf, the system shall require a reason and explicit confirmation after a warning that the report is final and false reporting may have consequences. On confirmation it shall store the report, permanently exclude the book **for that child** from recommendations and manual search, remove it from their current batch/shelf, generate a neutral child removal notice when applicable, and place the report in the admin queue (`BR-parent-report-book`, `UC-PAR-report-book`). The report, exclusion, removal and notice shall commit atomically. A Sub Parent's report binds the Main Parent. A later admin decision to discard the report does **not** remove the per-child exclusion. “Permanent” means while the child account remains in service; valid parental deletion rights still apply to child records.
- **FR-ADM-catalog:** An admin shall be able to add individual catalog entries, edit a book's details and tags (`UC-ADM-edit-content`; a book becomes active once its required tags are present), block inappropriate books globally, and unblock a book blocked in error; offline imports may seed the catalog (`UC-ADM-add-content`, `UC-ADM-block-content`, `UC-ADM-unblock-content`, `KD-catalog-import-offline`). An unblock never restores the shelf entries the block removed. An admin global block differs from a parent's per-child exclusion. Each book has an internal book ID that every other record uses; the ISBN and Open Library ID are only for matching to outside records, and the series name and number are stored (client answers 2026-10-28, Q11).
- **FR-ADM-report-review:** The system shall show parent book reports to authorized admins and permit the review decisions documented in `UC-ADM-block-content`, such as global block, dismissal or parent warning as applicable. Dismissal shall not restore a book for a child whose parent excluded it (`BR-parent-report-book`). A parent who keeps sending false reports may be warned and then have their own account suspended (`UC-ADM-suspend-parent-account`); the family's children keep their accounts.
- **FR-ADM-audit-log:** An admin shall be able to search and read the append-only audit log by date range, action type, actor and account reference (`UC-ADM-view-audit-log`). The log holds IDs only, never child-identifying fields or parent note text, so it is not a route to child details (`SEC-pii-boundary`).
- **FR-ADM-flag-review:** The system shall support restricted flagged-content triage and disposition (`UC-ADM-flag-review`). **Team position (2026-10-26), for the client to confirm (`OI-15`):** inside `UC-ADM-flag-review` only, the admin has a narrowly authorized, audited view of the flagged parent note and the flagged child's nickname, internal child ID, age, grade and username (no real name is held) (`KD-admin-flag-review`, `BR-admin-limited-view` exception). No other admin path shows child identifiers. The admin may suspend an account from here and reinstate it later (`UC-ADM-reinstate-account`; team decision 2026-10-26). For V1 there is no report to anyone outside the system (`OI-18`); dangerous-content retention is unresolved (`OI-27`).
- **FR-ADM-child-lookup:** An authorized admin shall be able to look up one child's usage data by internal child ID (reading interests, recommendation responses and decline reasons, shelf activity and ratings, with dates), never with a name or other identifying detail. Each lookup is recorded in the audit log before the data is shown, and a child whose data was deleted or whose consent was revoked shows the same “no data” message as an unknown ID (`UC-ADM-view-usage-stats`, `BR-admin-limited-view`; client answers 2026-10-28, Q5 and Q14).
- **FR-ADM-v1-measures:** The usage statistics shall report the client's V1 engagement measures from aggregate or de-identified data: day-30 retention (target 25% or more) and weekly active families (a rating, shelf save or “not for me” response in the week). Notification measures (the share of weekly check-ins that lead to a rating within 7 days, and of active families rating at least one book in 30 days; targets 30% or more) are in `UC-ADM-view-recommender-stats`. Other success metrics may stay open, provided the system captures what is needed to define them later (`UC-ADM-view-usage-stats`, `OI-11`; client answers 2026-10-28, Q14).
- **FR-DATA-removal:** On a verified parent's request, the system shall delete the child's personal data so it is no longer retrievable in the normal course of business: profile, interests, the derived interest profile, answers, shelf and shelf history, ratings, the parent note, associated reports/exclusions, notifications, usage records and applicable logs (`BR-coppa-parent-rights`). Any legal preservation exception for safety evidence needs explicit authority and a defined retention policy; do not assume one. Deletion or irreversible de-identification must also address any book-level aggregate originally derived from the child. The parent's flows are `UC-PAR-delete-child-data` (reading data, account kept) and `UC-PAR-delete-kid-account` (everything).

**Notifications**

- **FR-NOT-weekly-reminder:** If a child has at least one book that is not on their Finished shelf, the system shall send the child's linked parent a notification every week asking whether the child has finished it. The notification names the child by nickname and the book. As specified today, a parent can confirm only a book the child has moved to Finished: when one is awaiting, the check-in opens the parent's confirmation (`UC-SHLF-par-finish-book`) and, once confirmed, the child can rate it (`UC-SHLF-kid-rate-book`); when none is awaiting, it opens the parent dashboard (`UC-PAR-view-growth-report`). The client's example asks about a book in Reading Now and says “tap to let them rate it”, which this does not yet do (`OI-30`). A child with no such book generates no reminder. The reminder goes to the parent only, never the child (client answers 2026-10-28, Q5 and Q14). Delivery follows `CI-in-app-alerts`; whether it is also pushed, the day and time, and which shelves count are `OI-30`.

**Post-MVP / conditional:** `FR-REC-ml` (ML re-ranking, `FEAT-ai-recommendation`), `FR-BADGE-identity` (`FEAT-reading-identity-badges`, `OI-14`), `FR-RECAP-adult` (qualitative adult recap), `UC-ADM-add-admin`, and `UC-SHLF-view-badges`. `UC-PAR-view-growth-report` is in the MVP, because the client asked for a weekly parent dashboard on 2026-10-28 (Q10); what it may show is `OI-31`.

---

## 6. Business Rules

Link only: [business-rules.md](business-rules.md), v0.8. This includes `BR-parent-report-book`, the COPPA rule set, `BR-child-structured-responses` and `BR-parent-note`, but still leaves the Sub Parent authorization rule and manual-search parental-approval business rule to be reconciled. No new business rule is silently created by this SRS.

---
## 7. Data Requirements

### 7.1 Business domain model

Primary entities are **Family**, **Main Parent account**, **Sub Parent account/invitation**, **Parent consent record**, **Child credentials/session**, **Child identity record** (age, grade and reading level; no name), **Child reading profile**, **Interest profile**, **Catalog book and tags**, **Recommendation batch/reaction**, **Shelf entry**, **Manual-search shelf request**, **Finished-book rating**, **Finish confirmation**, **Parent note**, **Shelf history entry**, **Usage record**, **Safety flag** (on a parent note), **Parent book report**, **Per-child book exclusion**, **Notification**, and **Admin audit record**. A **Dangerous content entry** is conditional on unresolved access, retention and escalation decisions.

Each child belongs to one family and is reachable only by authorized linked parents (apart from a narrowly approved admin safety exception if `OI-15` is resolved, and the admin's lookup of usage data by internal child ID, which carries no identifying fields). A child identity store is proposed to separate sensitive identity fields from reading activity and book data (`KD-pii-segregation`). Catalog books have draft/active/blocked states; per-child exclusions are separate from a globally blocked catalog entry. The architecture describes the detailed responsibilities in §5.2; the use cases own their data-field validation tables.

### 7.2 Data dictionary

- **DI-child-stored:** The system shall retain about a child only the items in the inventory of `BR-kid-data-stored`, each for its stated purpose: nickname and avatar, internal child ID, username and password hash, age and grade, an optional parent-entered reading level, reading interests and favorite books, the derived interest profile, recommendation batches and reactions, shelf entries and history, ratings, the parent note, shelf requests, reports and exclusions, and usage records. The child's real or legal name is not stored (`OI-23` resolved). Whether age and grade stay is `OI-29`.
- **DI-child-id:** Every child shall have an opaque, system-generated internal child ID, unique and never reused. The child's longitudinal data is stored under it and never under a name, so the data can be linked over time without identifying the child (`UC-PAR-create-kid-account`; client answers 2026-10-28, overall comment 4, Q3 and Q14).
- **DI-parent-note:** A parent note shall hold the text (at most 250 characters), the child it is about, the book it was written after if any, a flag (none, flagged, check not run), and the time of each save. It is visible to the parent, readable by the recommender, and readable by the admin only if flagged, in flagged-content review (`BR-parent-note`).
- **DI-finish-confirmation:** A shelf entry shall carry a finish status (none, awaiting, confirmed), the previous category it came from, and, once confirmed, the confirming parent and time. Once confirmed it stays confirmed, including after the book leaves the shelf (`UC-SHLF-par-finish-book`).
- **DI-usage-records:** The system shall record sign-in and meaningful actions with times, under the internal child ID, for the V1 engagement measures and the admin's child lookup (`FR-ADM-child-lookup`, `FR-ADM-v1-measures`). Per-child session length is not stored until a purpose and a retention period are set, and sign-in and session records shall keep no IP address or device identifier beyond what security needs (`BR-kid-data-stored`).
- **DI-book-id:** Every catalog book shall have an opaque internal book ID that all other records use. The ISBN and Open Library ID are optional and only for matching to outside records, and the series name and number are optional (`UC-ADM-add-content`).
- **DI-book-tags:** Catalog books shall include available genre, mood, format, themes, length, age fit and reading-level metadata. The source is the client's curated seed catalog (`OI-1` resolved), and the approved tag lists are still to be extracted from it (`FEAT-book-tagging`). The spreadsheet's “Kid Testing Reaction” column is test-profile data, not catalog data.
- **DI-catalog-status:** Every catalog book shall have a state (draft, active, or blocked); an untagged new entry stays draft until the required tags are supplied. The spreadsheet's Status field controls which books can be recommended; how its values map to draft, active and blocked is still to be set. A blocked entry shall be excluded from child recommendations and search, and blocking removes it from every shelf but keeps its ratings, finish confirmations and finish notes, so an unblock loses only the shelf entries (`UC-ADM-add-content`, `UC-ADM-block-content`). `OI-24` is moot, since children write no reflections.
- **DI-pii-segregation:** Identifying child data shall be separated from ordinary shelf/recommendation data and blocked from general admin read paths. The one exception is flagged-content review (`KD-admin-flag-review`; team position, client to confirm, `OI-15`); it is not a general grant. A child's usage data under the internal child ID is not identifying data, and the admin reaches it only through the audited lookup (`FR-ADM-child-lookup`).
- **DI-child-credentials:** Child usernames shall be unique; passwords shall be stored as salted hashes, not plaintext; independently revocable sessions shall support immediate server-side suspension (`UC-PAR-create-kid-account`, `KD-auth-sessions`).
- **DI-shelf-requests:** A manual-search shelf request shall store the child, catalog book, requested shelf category, status (pending, approved, declined, cancelled or already satisfied), relevant timestamps, and deciding parent where applicable; no shelf entry is created without approval (`UC-SHLF-manual-search`). Request expiry and repeated requests are not fully specified.
- **DI-report-exclusion:** A book report shall record book, child, reporting parent, reason and submission time. A separate per-child exclusion shall prevent the book appearing in new recommendations/search for that child, independent of whether an admin globally blocks or dismisses the reported catalog book (`UC-PAR-report-book`, `BR-parent-report-book`).
- **DI-field-tables:** Precise field types, constraints and authorization rules are defined by the use cases' Associated Information tables until those are reconciled into a single schema; do not invent values for TBD fields.

### 7.3 Reports

- Parents can view a linked child's shelf and finished-book ratings (`FR-PAR-review`) and the weekly dashboard (`FR-PAR-dashboard`).
- Admins can review parent-reported catalog books, flagged parent notes, aggregate recommender/usage statistics and, by internal child ID, one child's usage data (`UC-ADM-block-content`, `UC-ADM-flag-review`, `UC-ADM-view-recommender-stats`, `UC-ADM-view-usage-stats`). A flagged child's nickname, internal child ID, age, grade and username are visible only in flagged-content review (team position, client to confirm, `OI-15`).
- The parent's weekly dashboard (`UC-PAR-view-growth-report`) is requested by the client (2026-10-28, Q10) and is in the MVP; what it may show is open (`OI-31`, `BR-recap-qualitative-only`). It is never a child-facing performance scoreboard. The child's own dashboard is `UC-SHLF-kid-dashboard`.

### 7.4 Data acquisition, integrity, retention, and disposal

- **DI-acquire:** Parents enter family/child account information, consent, reading interests, the optional parent note and finish confirmations; children make structured choices only (reactions, decline reasons, shelf requests, ratings), and only after applicable parent consent has been verified. Nobody enters a child's real name.
- **DI-integrity:** A child record shall belong to a valid family; the system shall reject unauthorized cross-family access and orphan child records (`BR-parent-account-linked`). Parent reports, exclusions, related shelf/batch removals and necessary notifications shall commit atomically so no report exists without its exclusion.
- **DI-disposal:** Following a verified parent's request, the system shall delete the child's data so it is not retrievable in normal operations (`FR-DATA-removal`). Any legal hold or retention exception must be supported by an approved policy and assessed against COPPA rights rather than invented in code.
- **DI-retention:** The operator shall publish a written retention policy explaining purposes, business need and deletion timeframe, and enforce the policy with automated purge (`BR-coppa-retention`). The client accepted development placeholders on 2026-10-28 (Q9): 12 months of inactivity before a child's data is deleted, and 14 days to confirm consent before an unconfirmed account is removed. Both shall be configurable, not hardcoded, and may later differ by type of data after testing and legal review; the final values are still `OI-22`. Any dangerous-content preservation period is **TBD** (`OI-27`).
- **DI-consent-record:** Each parent's consent record shall include the parent/family reference, notice version, acknowledgment and verification statuses, timestamps and method, and any separately authorized third-party disclosure (`BR-coppa-parental-consent`, `OI-21`). Recording an unchecked checkbox is not a substitute for verification.
- **DI-minimization:** Each child data field shall have a specific service purpose. Data not reasonably needed shall not be collected or retained; in particular, the child's real name is not stored (`OI-23` resolved), and age and grade await client confirmation (`BR-coppa-minimization`, `OI-29`).

---

## 8. External Interface Requirements

### 8.1 User interfaces

- **UI-child-simple:** The child UI shall use large touch targets, minimal reading to navigate and clear button-based recommendation choices (vision and scope §3.2).
- **UI-kid-no-metrics:** The child UI shall not display streaks, book/page counts, reading-level scores or comparisons with other children (`BR-kid-no-metrics`). The child dashboard (`UC-SHLF-kid-dashboard`) is written to show no numbers, but whether it complies is `OI-31`.
- **UI-parent-dashboard:** The parent UI shall support permitted account management, book suggestions, shelf and rating review, finish confirmation, the optional child note, the weekly dashboard, book removal, book reports, and approve/deny decisions for manual-search shelf requests. The latter parent-side workflow still needs a governing rule and complete use case.
- **UI-notifications:** The system shall show in-app child notices for shelf removals and request decisions, an admin alert, with no note content, for a flagged parent note, and the weekly parent check-in (`FR-NOT-weekly-reminder`). Consent and privacy notices shall be available in the required onboarding/collection paths.
- **UI-admin-restricted:** Admin interfaces shall show catalog management, reports and flagged-content triage without general disclosure of child identifiers. The flagged-content review screen is the one exception, with audited narrow authorization (`FR-ADM-flag-review`; client to confirm, `OI-15`). The child lookup shows usage data under the internal child ID and nothing identifying (`FR-ADM-child-lookup`).
- Branding, detailed layouts, accessibility criteria, and the exact supported browser/device matrix remain TBD; no numeric target has been accepted by the client.

### 8.2 Hardware interfaces

None. The MVP has no hardware interface.

### 8.3 Software interfaces

- **SI-book-dataset:** An offline TypeScript importer shall load or update local catalog books from the client's curated seed catalog (`BookBuddies_Seed_Catalog.xlsx`, 134 books; the Kaggle and GitHub datasets are not used, `OI-1` resolved). It assigns an internal book ID, keeps ISBN and Open Library IDs for external matching, uses the Status field to control which books can be recommended, and stores series name and number. The catalog structure shall allow later expansion through Open Library, and a verified seed can serve as a reference set for automated tagging, without rebuilding the system. Runtime child recommendation and manual search shall not call the external dataset or a live book API (`KD-catalog-import-offline`; client answers 2026-10-28, Q11).
- **SI-auth-sessions:** Authentication shall follow the selected server-enforced Auth.js/database session design, with password verification and revocable sessions. The planned Credentials-provider/database-session integration needs library-version-specific testing before being treated as an implemented contract (`KD-auth-sessions`).
- **SI-email-provider:** A selected external email provider shall deliver parent consent confirmation and Sub Parent invitation messages. Provider selection, processing scope and data security assurances are TBD (`DE-email-provider`, `BR-coppa-no-third-party-disclosure`).
- **SI-no-lms:** The MVP shall not connect to school systems or learning management systems.

### 8.4 API document

The architecture-of-record §8.2 and [PAR design-of-record](../../design/par.md) propose server actions and the response shape `{ ok: true, data }` or `{ ok: false, error: { code, message } }`. They are designs, not evidence of an implemented API. **The PAR design's `createParentAccount` action predates the newer email-confirmation-gated consent flow** in use-cases v0.11; it must be reconciled before implementation or testing. Other route contracts and their security/failure cases should be finalized as their corresponding use-case areas are designed.

### 8.5 Communications interfaces

- **CI-email-parent:** The system shall use email for Main Parent confirmation/account communication and Sub Parent invitations (`FR-ACCT-consent-confirm`, `FR-ACCT-sub-parent-invite`).
- **CI-in-app-alerts:** Safety flags, parent removals, manual-search approval/denial outcomes and other defined notifications shall persist in-app for their recipients, including when the recipient is offline. Per the 2026-09-24 notes, notifications in the web app are in-app only, with no SMS or push; mobile push is deferred to a mobile phase (`client-interview-2026-09-24.md`). Email is used only for account messages (`CI-email-parent`). The weekly parent check-in is in-app for now; the client's wish for a push notification is `OI-30`. Delivery service-level targets remain TBD. “Immediate alert” means prompt event creation/persistence, not a promise an offline parent has read it.

---

## 9. Quality Attributes

Unless an explicit target is specified here, the client has not approved a numeric service level. Quantitative targets should be agreed and tested rather than invented (`OI-11`, `OI-12`).

### 9.1 Usability

- **USE-child-first-run:** The MVP shall be designed so a child in its target age range can request a recommendation without requiring adult assistance; the success criterion must be validated with consented user testing (`OI-13`).
- **USE-parent-light:** Common parent actions such as reviewing a shelf, removing a book and responding to a request should require few steps; the number/threshold remains TBD.

### 9.2 Performance

- **PER-recommendation-latency:** Rules-based recommendations over the seed catalog shall return without unreasonable delay. A measurable latency target and expected concurrent user volume are TBD (`OI-11`, `OI-12`).

### 9.3 Security

- **SEC-pii-boundary:** Child identifying fields shall not be accessible through ordinary admin lists/APIs or general support/debug interfaces. The one exception is a narrow, audited view in flagged-content review (`KD-admin-flag-review`), the team's position until the client settles `OI-15`. The admin's lookup of one child's usage data by internal child ID shows no identifying field and is audited (`FR-ADM-child-lookup`). Admins may see parents' and Sub Parents' names, usernames and emails (`BR-admin-limited-view`), and shall never see any password, in plaintext or hashed form; parent “credentials” in older requirements means those three fields only (team decision 2026-10-26).
- **SEC-role-authorization:** Every server action/route shall enforce the current authenticated role and family/child access on the server; an inaccessible UI button alone is not sufficient. Children shall see only their own account data; parents only linked family children.
- **SEC-no-private-notes:** *Retired 2026-10-28.* Children write no free text (`BR-child-structured-responses`), so there are no child notes. The parent's note is visible to the parent and never to the child (`BR-parent-note`).
- **SEC-auth:** Passwords shall be hashed with a vetted method and authenticated through a tested mechanism. Auth.js with MongoDB-backed revocable sessions is the selected team design; its Credentials-session integration must be tested against the installed version, not assumed secure by description alone.
- **SEC-signin-throttling:** The system shall count failed password attempts per account, for parents, Sub Parents, children and admins alike, and slow further attempts on that account after repeated failures, so a password cannot be guessed by trying many in a row. Re-entering a password to confirm a sensitive action (`UC-PAR-review-child-data`, `UC-PAR-delete-child-data`, `UC-PAR-revoke-consent`, `UC-PAR-delete-kid-account`) counts as an attempt. Every refused attempt is logged as a security event without the password or username (architecture §8.1, §8.2.7). The failure threshold, the delay and whether an account is ever locked are TBD; a lockout must not let anyone lock a child out on purpose.
- **SEC-session-revocation:** On suspension, the system shall prevent further authenticated access and revoke/disable affected sessions at the server, rather than relying on a UI redirect (`UC-ADM-suspend-account`).
- **SEC-flag-review-audit:** For the flagged-content review exception (`FR-ADM-flag-review`), each privileged view of a flagged child's identifying details shall log the admin ID, referenced flag and access time without copying the sensitive child content into general audit logs.
- **SEC-coppa-program:** The responsible operator shall maintain a written information security program with assigned responsibility, periodic risk assessment, appropriate safeguards, testing and review, and reasonable written assurances from service providers handling personal information, consistent with the applicable FTC COPPA Rule obligations (`BR-coppa-no-third-party-disclosure`, `docs/coppa/coppa-full`). The operator/coordinator are TBD (`OI-20`).

### 9.4 Safety

- **SAF-flag-delivery:** A flag on a parent note and its admin alert (which carries no note content) shall be durably saved together, and the alert shall remain available after the admin next signs in if previously offline. An alert shall not exist only as a server log. Exactly which words trigger flags remains pending (`OI-19`).
- **SAF-child-content:** Newly surfaced recommendations/search results shall come from approved active age-appropriate catalog books, excluding globally blocked books and permanent per-child report exclusions (`UC-ADM-block-content`, `BR-parent-report-book`).
- **SAF-detection-pending:** V1 screens parent notes with an internal word list and human review by an authorized admin, with no outside service and no automatic action (client answers 2026-10-28, Q4 and Q6). The word list and flag categories are not yet written. Any stronger detector, and any reporting to authorities or other outside parties, wait for what testing shows and for legal advice (`OI-18`, `OI-19`); do not present them as finalized implementation requirements.

### 9.5 Availability

An uptime objective has not been approved (`OI-9`, `OI-12`). Email and moderation failures must have explicit retry or safe-failure behavior. A parent note whose word-list check cannot run is saved unflagged with the check recorded as not run, so an admin can re-run it; it is never silently treated as screened (`UC-PAR-create-kid-account` 5b, `UC-SHLF-par-finish-book` 7a; team proposal, client to confirm).

### 9.6 Robustness

- **ROB-no-data-loss:** A failed save of a shelf change, rating, finish confirmation, parent note or shelf request shall visibly report failure and preserve the input where retry is possible.
- **ROB-atomic-report:** A confirmed parent book report, per-child exclusion, necessary recommendation/shelf removals and child notice shall succeed or fail together (`UC-PAR-report-book`).
- **ROB-atomic-finish:** A parent's finish confirmation, the optional note, any flag and any admin alert shall succeed or fail together, so a note is never saved without its flag and alert (`UC-SHLF-par-finish-book`).
- **ROB-time-rules:** Time-limited states, such as the consent-confirmation period and the retention deadlines, shall be enforced on data access independently of scheduled purging (`KD-time-rules-on-read`). Reflection pending deletion and the 24-hour parent review no longer exist.

### 9.7 Scalability, interoperability, maintainability

- **SCA-launch-scale:** The architecture targets a few dozen families in the first year and the 134-book curated seed catalog, without choices that unnecessarily prevent later scaling to thousands of titles, more families, longitudinal data and parent notifications (client answers 2026-10-28, Q1, Q11, Q12; `OI-12` resolved). Concurrency targets are TBD.
- **MNT-handover:** The system shall be documented so a future maintainer can run, deploy and modify it without relying on the original team; who will own hosting/operations remains TBD (`OI-9`).
- Interoperability: No live LMS, school-system, ebook-reader, or outside recommendation-model integration is required for MVP.

---

## 10. Internationalization and Localization

The MVP is planned in English; the client has not asked for additional locales. Confirm before establishing an irreversible localization constraint. Child-facing and parent-facing accessibility targets are likewise not yet quantified.

---

## 11. Other Requirements

- **Legal:** COPPA is an engineering design obligation for the MVP (`CO-coppa-adjacent`). Whether BookBuddies legally qualifies as a covered operator and who owns legal duties during/after the student project require expert review (`AS-coppa-adjacent-only`, `OI-20`). The team should not claim certification or formal compliance merely from this specification.
- **Testing with children:** Real child testers who provide information require the appropriate parent consent first (`BR-coppa-parental-consent`); the client plans a few real children and parents to test with the parent present, after written parent permission; the separate feedback form collects no names and usage data uses an internal test/child ID (client answers 2026-10-28, Q2; `OI-13` resolved). Automated tests should use synthetic, not real, children's data.
- **Security-critical tests before release:** Cross-family access denial, consent gates, child password/session revocation, parent report/exclusion atomicity, catalog global blocks, search requests requiring parent approval, the four-option rating enum, a rating refused until a parent confirms the finish, the parent note never reaching a child screen, durable flag and alert persistence, the admin's child lookup being audited and free of identifying fields, and denial of unapproved admin identity access. Exact test fixtures and acceptance targets belong in the test plan and use cases.
- **Open issues that still block decisions:** `OI-2` AI scope/matching (V1 is rule-based; the team owes the client an outline of what AI needs); `OI-9` hosting/maintainer; `OI-11` success targets (partly answered); `OI-14` badges; `OI-15` admin identity access (to confirm); `OI-18` outside reporting (none in V1); `OI-19` flagging method (word list in V1); `OI-20` operator/legal status; `OI-21` consent method (accepted for V1, configurable); `OI-22` retention and confirmation expiry (configurable placeholders); `OI-25` Sub Parent permissions; `OI-26` child password reset; `OI-27` dangerous-content retention; `OI-29` whether age and grade stay; `OI-30` weekly reminder delivery and trigger; `OI-31` child dashboard and parent dashboard against the no-metrics rules; `OI-32` follow-up books after a rating. `OI-1` (seed catalog), `OI-6` (reading level never shown to the child), `OI-7` (replaced by `OI-15`), `OI-8` (parent account first), `OI-10` (web-first), `OI-12` (a few dozen families), `OI-13` (testing children), `OI-16` (24-hour review dropped), `OI-17` (four-option ratings), `OI-23` (no child real name), `OI-24` (moot) and `OI-28` (no child free text) are **resolved**, not TBD.
- **Cross-document follow-ups (not changes made by this revision):** Update the PAR design's signup/consent contract, and its child identity record and form, which still store a real name (`OI-23`); write the parent approval flow and governing business rule for manual-search shelf requests; define Sub Parent privileges (`OI-25`); confirm the dangerous-content retention period (`OI-27`) and the admin flag-review exception (`OI-15`) with the client. These remain explicit work items, not silently resolved choices.
