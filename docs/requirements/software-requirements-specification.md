# Software Requirements Specification

**Project:** BookBuddies
**Team:** Team 05
**Client:** Dr. Yang Yang
**Version:** 0.2

---

## Identifiers

| Space | For | Example |
|---|---|---|
| `FR-<AREA>-<slug>` | Functional requirements outside any use case | `FR-SAVE-autosave-active` |
| `UI-<slug>` | User interface requirements | `UI-spa-views` |
| `SI-<slug>` | Software and system interfaces | `SI-llm-proxy-only` |
| `CI-<slug>` | Communications interfaces | `CI-email-notifications` |
| `DI-<slug>` | Data requirements | `DI-persist-graph` |
| `OE-<slug>` | Operating environment | `OE-supported-browsers` |
| `CO-<slug>` | Design and implementation constraints | `CO-single-application` |
| `AS-<slug>` / `DE-<slug>` | Assumptions and dependencies | `AS-supported-browser`, `DE-llm-service` |

Quality attributes get one identifier space per attribute: `USE-` usability, `PER-` performance, `SEC-` security, `SAF-` safety, `AVL-` availability, `ROB-` robustness, `SCA-` scalability, `INT-` interoperability, `MNT-` maintainability.

Requirements cited from elsewhere keep their own identifiers: `UC-*` from [use-cases.md](use-cases.md), `BR-*` from [business-rules.md](business-rules.md), `BO-*`, `SM-*`, `FEAT-*` from [vision-and-scope.md](vision-and-scope.md).

## Revision History

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-09-17 | 0.1 | Filled in project/team/client identification (content is scheduled for week 4 per the team's own process) | Team 05 |
| 2026-10-02 | 0.2 | Filled in every section from vision-and-scope v0.4, use-cases v0.4, business-rules v0.2, the glossary and OPEN-ISSUES. Drops the teacher role, groups, peer feed, in-app reading test and Stretch My Reader per the 2026-09-24 meeting. Anything not decided by the client or team is marked TBD and linked to an open issue | Team 05 |

---

## 1. Introduction

### 1.1 The purpose of BookBuddies

BookBuddies is a web-first book discovery and tracking app for elementary-age children (roughly ages 6-11). A child gets book recommendations built from an onboarding profile, keeps a personal shelf of what they are reading or want to read, rates books and writes optional reflections. A linked parent account manages the child's account, can suggest titles, and can review and remove shelf content. The product is kid-powered and adult-monitored. See [vision-and-scope.md](vision-and-scope.md) sections 1 and 2 for the business case.

### 1.2 The purpose of this document

This SRS is the single entry point for what BookBuddies must do. It links to the glossary, vision and scope, use cases and business rules instead of restating them, and it holds everything those documents do not: product perspective, user classes, environment, constraints, non-use-case functional requirements, data, interface and quality requirements. Its readers are the development team, the client (Dr. Yang Yang) and anyone testing the product.

### 1.3 Document conventions

- Requirements use EARS phrasing ("When ..., the system shall ...") and one identifier each, from the table above. Identifiers are never renumbered or repointed.
- **TBD** means the client or team has not decided yet. Every TBD cites an `OI-*` in [OPEN-ISSUES.md](OPEN-ISSUES.md) and must not be built against until resolved.
- Requirements in scope for the MVP follow section 4.3 of the vision and scope. Items marked **(post-MVP)** are recorded so they are not lost, not scheduled.
- Material under `docs/external/` is not a source for this document. Where a requirement depends on it, it is reached through business-rules.md or vision-and-scope.md.

### 1.4 References

- [Project glossary](project-glossary.md)
- [Vision and scope](vision-and-scope.md)
- [Use cases](use-cases.md)
- [Business rules](business-rules.md)
- [Open issues](OPEN-ISSUES.md)
- [Traceability matrix](../traceability.md)
- [The Easy Approach to Requirements Syntax (EARS)](https://alistairmavin.com/ears/)

---

## 2. Overall Description

### 2.1 Product perspective

BookBuddies is a new, self-contained product with no predecessor to replace and no live integration with a school system or LMS (vision-and-scope 1.2, 4.1). It consists of a child-facing experience, a parent-facing experience, a lightweight rules-based recommendation capability and one data store. Its only external input is a pre-tagged children's-book dataset used to seed the catalog (`AS-book-data-source`, `OI-1`). It is not an ebook reader (`FEAT-ebook-reader`).

### 2.2 User classes and characteristics

| User class | Description | Source |
|---|---|---|
| Child | Ages about 6-11, nickname and avatar only, short touch-first sessions, cannot self-register (`BR-parent-creates-kid-account`, `BR-kid-anonymous-profile`) | vision 3.1 |
| Parent (primary) | Creates the family account, then child accounts; may add a secondary parent; may manage several children (`BR-parent-account-structure`) | vision 3.1 |
| Parent (secondary / "Sub Parent") | Same access to the child as the primary parent except creating and deleting accounts | `UC-PAR-create-sub-parent-account` |
| System admin | Operates the system, receives safety alerts. What an admin may see about a child is in conflict (`OI-15`, `BR-admin-limited-view`) | vision 3.1 |
| Teacher | **Not a user class.** Removed from scope 2026-09-24 (`BR-user-roles`) | vision 3.1 |

### 2.3 Operating environment

- **OE-web-first:** The system shall be delivered as a web application usable on current desktop and mobile browsers. Native mobile apps are later work (vision 3.2). Exact supported browsers and screen sizes are TBD (`OI-10`).
- **OE-hosting:** Hosting, hosting budget and post-graduation maintainer are TBD (`OI-9`).

### 2.4 Design and implementation constraints

- **CO-single-application:** The product shall be one deployable application backed by one data store; no integration with school systems in the MVP (vision 4.1).
- **CO-no-ebook:** The system shall not host or display book contents (`FEAT-ebook-reader`).
- **CO-no-social:** The system shall not provide messaging, public child profiles, stranger search, groups or peer feeds in the MVP (`BR-no-open-discovery`; groups and peer sharing deferred per business-rules 2.3).
- **CO-rules-first-recommender:** The MVP recommender shall be rules-based; ML re-ranking is post-MVP (`FEAT-ai-recommendation`, `RI-scope-creep-ai`).
- **CO-no-reading-level-assessment:** The system shall not assess, estimate or infer a child's reading level (`BR-no-reading-level-assessment`).
- **CO-coppa-adjacent:** The design shall follow COPPA-adjacent practice from the start; the client has yet to supply the rules link (`AS-coppa-adjacent-only`, `BR-coppa-parental-consent`).
- **CO-technology-stack:** Language, framework, database and auth approach are TBD and are a human decision, not derived from external notes (`OI-9`).

### 2.5 Assumptions and dependencies

- **AS-parent-account-first:** A parent account exists before any child account (vision 2.7).
- **AS-email-linking:** Parent accounts are created and linked by email (vision 2.7).
- **AS-book-data-source / DE-book-dataset:** The seed catalog comes from a pre-tagged children's-book dataset (Kaggle or GitHub); none has been approved (`OI-1`). Without it there is nothing to recommend.
- **AS-supported-browser:** Users have a current browser and internet access.
- **DE-client-coppa-rules:** The client will provide the COPPA rules link.
- **AS-seed-catalog-size:** The launch catalog is small, about 30-50 books (`OI-12`); production volume is TBD.

---

## 3. Project Glossary

Link only: [project-glossary.md](project-glossary.md).

Note: the glossary (v0.4) still defines Reading Group, Buddy Picks, Stretch My Reader, Achievement Page and the in-app reading test as live. Those were cut or withdrawn on 2026-09-24 and the glossary needs its own update pass.

## 4. Vision and Scope

Link only: [vision-and-scope.md](vision-and-scope.md).

---

## 5. Functional Requirements

### 5.1 Use cases

Link only: [use-cases.md](use-cases.md).

Planned use cases by area (from the use-case list; only `UC-PAR-create-sub-parent-account` is fully specified so far):

| Area | Features | Use cases |
|---|---|---|
| PAR | `FEAT-parent-account-linking`, `FEAT-parent-suggest-book`, `FEAT-onboarding-profile`, `FEAT-reading-level-input`, `FEAT-parent-review-dashboard` | onboarding, create-second-parent-account, create-kid-account, suggest-book, view-growth-report |
| REC | `FEAT-recommendation-quiz`, `FEAT-onboarding-profile` | kid-onboarding, recommend-quiz-rules, parent-review, kid-review |
| SHLF | `FEAT-shelf`, `FEAT-ratings`, `FEAT-kid-reflections` | parent/kid-view-shelf, kid-move-book, kid-remove-book, kid-rate-book, kid-add-note, parent-remove-book |
| ADM | `FEAT-admin-pii-segregation`, `FEAT-book-tagging` | suspend-account, add-content, block-content, view-recommender-stats, view-usage-stats |

### 5.2 Non-use-case functional requirements

- **FR-ACCT-parent-first:** The system shall allow a child account to be created only by a logged-in parent (`BR-parent-creates-kid-account`, `BR-parent-account-linked`).
- **FR-ACCT-multi-child:** The system shall let one parent account manage multiple child accounts and let a secondary parent be added (`BR-parent-account-structure`).
- **FR-ACCT-child-display:** The system shall show a child only a nickname and character avatar (`BR-kid-anonymous-profile`).
- **FR-ACCT-consent:** When a parent creates an account, the system shall record parental consent before the account becomes active (`BR-coppa-parental-consent`; wording TBD pending the COPPA link).
- **FR-ONB-profile:** When a child account is created, the system shall collect age/grade, reading interests and favorite books already read, and an optional reading level (`FEAT-onboarding-profile`).
- **FR-ONB-level-optional:** The system shall accept a parent-entered reading level or let the parent skip it, and where the parent is unsure may show referral links to external tools for reference only (`BR-reading-level-parent-entered`).
- **FR-REC-rules:** When a child requests a recommendation, the system shall return books from the tagged catalog matched to the child's profile, using age/grade as the primary signal and reading level only as a difficulty input when present (`BR-reading-level-proxy`). The exact matching rules and number of results are TBD (`OI-2`).
- **FR-REC-every-request:** The system shall run recommendations on every request, not only at onboarding (`FEAT-recommendation-quiz`). Button options rather than free text; final UI TBD.
- **FR-REC-react:** The system shall let a child react to each recommended book by accepting it, deferring it, or declining it, with an optional reason for declining.
- **FR-REC-parent-suggest:** When a parent suggests a book with an optional note, the system shall add it to the child's recommendation list, not the shelf, and the child may accept or decline it (`BR-parent-rec-not-forced`).
- **FR-SHLF-categories:** The system shall organise a child's shelf as Reading Now, Want to Read, Maybe Later and Finished (`FEAT-shelf`, latest flowchart; confirm with client).
- **FR-SHLF-parent-remove:** When a parent removes a book from the shelf, the system shall show the child an in-app notice (`BR-parent-shelf-removal`).
- **FR-RATE-rating:** The system shall let a child rate a finished book. The scale (stars/thumbs vs. a four-option scale) is TBD (`OI-17`).
- **FR-NOTE-reflection:** The system shall let a child write an optional reflection after finishing a book, visible to the parent, with no private option (`BR-notes-visible-to-parent`).
- **FR-NOTE-flagging:** When a reflection contains violent or self-harm content, the system shall immediately alert the parent in-app and the system admin (`BR-note-safety-flagging`). What the admin sees, and any report to authorities, are TBD (`OI-15`, `OI-18`).
- **FR-NOTE-disclosure:** During onboarding, the system shall tell the child that this kind of content is reported (`FEAT-kid-reflections`).
- **FR-SEARCH-manual:** The system shall let a child search the catalog by keyword (`FEAT-manual-search`; confirm still planned).
- **FR-PAR-review:** The system shall let a parent view the child's shelf and reflections (`FEAT-parent-review-dashboard`).
- **FR-PAR-review-window:** Whether the system shall require a parent to confirm review within 24 hours, suspending the child's account otherwise, is TBD (`BR-24hr-review-window`, `OI-16`). Do not build or drop this until answered.
- **FR-PAR-content-removal:** The system shall let a parent remove flagged content from their child's account and report abuse or self-harm signals (`BR-parent-content-removal`).
- **FR-ADM-catalog:** The system shall let an admin add and block catalog content (ADM use cases).
- **FR-DATA-removal:** On a parent's request, the system shall remove a child's data (client constraint in vision 3.1 / glossary; retention rules TBD, see 7.4).

Post-MVP: **FR-REC-ml** (ML re-ranking, `FEAT-ai-recommendation`), **FR-BADGE-identity** (`FEAT-reading-identity-badges`, `OI-14`), **FR-RECAP-adult** (`FEAT-recap-adult`, `BR-recap-qualitative-only`), `UC-ADM-add-admin`, `UC-SHLF-view-badges`.

---

## 6. Business Rules

Link only: [business-rules.md](business-rules.md).

---

## 7. Data Requirements

### 7.1 Business domain model

Main entities: **Family/Parent account** (primary, secondary), **Child profile** (linked to exactly one family), **Book** (catalog entry with tags), **Shelf entry** (child, book, category), **Recommendation** (child, book, source: rules or parent suggestion, child's reaction), **Rating**, **Reflection**, **Safety flag**, **Notification** (in-app). A parent account has one or more children; a child belongs to one parent account. A diagram is TBD.

### 7.2 Data dictionary

- **DI-child-stored:** The system shall store for each child the real name, age, grade, and reading level only if provided (`BR-kid-data-stored`). Only nickname and avatar are displayed (`BR-kid-anonymous-profile`).
- **DI-book-tags:** Each catalog book shall carry genre, mood, format, themes, length, age fit and reading level where the source dataset provides them (`FEAT-book-tagging`). The final tag set is TBD (`OI-1`).
- **DI-pii-segregation:** Child-identifying data shall be separated from any data visible to the admin role. The exact admin-visible set is TBD (`OI-15`, `BR-admin-limited-view`, `RI-pii-boundary-leak`).
- **DI-field-tables:** Field-level types and validation live in the use cases' Associated Information tables and will be consolidated here once more use cases are written.

### 7.3 Reports

- Parent view of a child's shelf and reflections (`FR-PAR-review`).
- Admin recommender and usage statistics (`UC-ADM-view-recommender-stats`, `UC-ADM-view-usage-stats`); contents TBD.
- Growth report for a parent (`UC-PAR-view-growth-report`); must stay qualitative if it is the recap (`BR-recap-qualitative-only`, open flag).

### 7.4 Data acquisition, integrity, retention, and disposal

- **DI-acquire:** Child data is entered by the parent at account creation and by the child through use of the app.
- **DI-integrity:** Every child record shall reference an existing parent account; the system shall not allow orphan children (`BR-parent-account-linked`).
- **DI-disposal:** The system shall delete a child's data when a parent requests it. Retention periods and law-enforcement retention for real names (`BR-kid-data-stored`) are TBD pending the COPPA rules.

---

## 8. External Interface Requirements

### 8.1 User interfaces

- **UI-child-simple:** The child interface shall use large tap targets, minimal reading to navigate, and button options instead of free text for recommendation input (vision 3.2).
- **UI-kid-no-metrics:** The child interface shall not show streaks, book or page counts, the child's reading level, or comparisons with other children (`BR-kid-no-metrics`; badge display open).
- **UI-parent-dashboard:** The parent interface shall provide account management, suggest-a-book, shelf and reflection review, and remove-book actions.
- **UI-notifications:** The system shall show in-app notices for book removal (to the child) and safety flags (to the parent).
- Layout, branding and accessibility target are TBD.

### 8.2 Hardware interfaces

None. The product has no hardware interface.

### 8.3 Software interfaces

- **SI-book-dataset:** The system shall import its seed catalog from an approved pre-tagged book dataset; this is a one-time or periodic load, not a live integration (`AS-book-data-source`, `OI-1`).
- **SI-no-lms:** No integration with school systems in the MVP.
- Authentication provider and any other third-party service are TBD (`CO-technology-stack`).

### 8.4 API document

TBD. To be produced once the stack and use cases are settled.

### 8.5 Communications interfaces

- **CI-email-parent:** The system shall use email to create and link parent accounts (`AS-email-linking`).
- **CI-in-app-alerts:** Safety flags and removal notices are delivered in-app. Whether the admin and parent also receive email or push alerts is TBD.

---

## 9. Quality Attributes

Targets are TBD unless stated; the client has not given numbers (`OI-11`, `OI-12`).

### 9.1 Usability

- **USE-child-first-run:** A child should complete a recommendation request without adult help (target to confirm in testing).
- **USE-parent-light:** Common parent actions (review shelf, remove book) should take few steps, since parents have limited time (vision 3.1).

### 9.2 Performance

- **PER-recommendation-latency:** Recommendations shall return quickly for a catalog of about 30-50 books. Numeric target TBD.

### 9.3 Security

- **SEC-pii-boundary:** Child-identifying data shall not be reachable through any admin-visible table, API, support or debug tool (`RI-pii-boundary-leak`, `OI-15`).
- **SEC-role-authorization:** The system shall enforce role permissions on the server (child, parent, admin); a child shall only see their own data.
- **SEC-no-private-notes:** Reflections are always parent-visible (`BR-notes-visible-to-parent`).
- **SEC-auth:** Parent authentication shall use a vetted mechanism rather than ad hoc password handling (mechanism TBD).

### 9.4 Safety

- **SAF-flag-delivery:** A safety flag shall reach the parent and admin immediately as an active alert, not only as a log entry.
- **SAF-child-content:** Catalog content shown to a child shall be age-appropriate; admin can block content (`UC-ADM-block-content`).

### 9.5 Availability

TBD. A small-cohort product; no uptime target given (`OI-9`, `OI-12`).

### 9.6 Robustness

- **ROB-no-data-loss:** A failed save of a shelf change, rating or reflection shall not silently lose the child's input.
- If the 24-hour review rule is adopted, suspension must be server-enforced, not a UI reminder (`RI-review-window-unenforced`).

### 9.7 Scalability, interoperability, maintainability

- **SCA-launch-scale:** Sized for a small launch cohort; volume TBD (`OI-12`).
- **MNT-handover:** The system shall be maintainable by someone other than the original team; the maintainer is unknown (`OI-9`).
- Interoperability: none required in the MVP.

---

## 10. Internationalization and Localization

Not required. The product is English-language for the MVP; no other locale has been requested by the client (confirm).

---

## 11. Other Requirements

- **Legal:** COPPA-adjacent design from the start (`CO-coppa-adjacent`). Formal compliance or certification would need legal review the team cannot provide (`AS-coppa-adjacent-only`).
- **Testing with children:** Consent process for real child testers is TBD (`OI-13`).
- **Open conflicts to close before building:** `OI-15` (admin PII), `OI-16` (24-hour review), `OI-17` (rating mechanism), `OI-18` (reporting to authorities), `OI-1` (dataset).
