# Use Cases

**Project:** Book Buddies\
**Team:** Team 5\
**Client:** Yang Yang, Research Scientist IBR/Knight D Research\
**Version:** 0.16

---

## Identifiers

_Use cases are identified as `UC-<AREA>-<slug>`, where the area code groups related functionality and the slug is coined from the goal: `UC-RUB-create-rubric`, `UC-WAR-manage-activities`, `UC-STU-invite-students`._

_Pick your own area codes from your project's feature areas, three or four letters each, and list them at the top of the Use Case List. Areas correspond to the `FEAT-*` entries in your [vision and scope](vision-and-scope.md), which is where use cases come from._

_**Never renumber, rename, or repoint an identifier.** Moving a use case between areas would change its identifier, so put it in the right area the first time, and if you get it wrong, leave it. An identifier is an address, not a description._

_Within one use case, `PRE-1`, `POST-1`, and the step numbers are local and may be renumbered freely, because nothing outside the use case cites them._

## Revision History

| Date           | Version | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Author                          |
|----------------|---------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------|
| _[2026-09-13]_ | 0.1     | File setup and ready for feature list                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | _Grayson Whittingham_           |
| _[2026-09-17]_ | 0.2     | Added Area Codes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | _Grayson Whittingham_           |
| _[2026-09-17]_ | 0.3     | Added Scope and First Use Case                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | _Grayson Whittingham_           |
| _[2026-09-27]_ | 0.4     | Added Feature List                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | _Grayson Whittingham_           |
| _[2026-10-01]_ | 0.5     | Replaced temporary feature dump with the Use Case List table, cross-referenced to `FEAT-*`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | _Grayson Whittingham_, _Claude_ |
| _[2026-10-04]_ | 0.6     | Wrote the `REC` area use cases: kid-onboarding, recommend-quiz-rules, recommend-quiz-ai (post-MVP), parent-review, kid-review; recommender mode is mutually exclusive between the rules and AI flows                                                                                                                                                                                                                                                                                                                                                                               | _Claude_                        |
| _[2026-10-04]_ | 0.7     | Wrote the `SHLF` area use cases: parent-view-shelf, kid-view-shelf, kid-move-book, kid-remove-book, kid-rate-book, kid-add-note, parent-remove-book. Rating scale and reflection-visibility conflicts are left as open issues, not decided                                                                                                                                                                                                                                                                                                                                         | _Claude_                        |
| _[2026-10-04]_ | 0.8     | Reflection deletion (24-hour pending window, restore, unflagged only) and kept ratings and reflections on shelf removal; wrote the `ADM` area use cases (add-content with custom tags, block-content, suspend-account, view-recommender-stats, view-usage-stats); wrote `UC-SHLF-manual-search` (keyword search, parent approval before a shelf add)                                                                                                                                                                                                                               | _Claude_                        |
| _[2026-10-06]_ | 0.9     | Parent confirm-or-deny step in `UC-SHLF-manual-search`; folded the Sub Parent's account setup (username and password) into `UC-PAR-create-sub-parent-account` instead of a separate use case; added a Parent-entered username and a system-generated password, shown with a note, to `UC-PAR-create-kid-account`; wrote `UC-ADM-flag-review` (admin reviews flagged reviews and notes, the one exception to `BR-admin-limited-view`)                                                                                                                                               | _Grayson Whittingham_, _Claude_ |
| _[2026-10-13]_ | 0.10    | Wrote `UC-PAR-report-book` (parent reports a book from a recommendation batch or the shelf; report screen with a reason and a false-report warning; final, per-child exclusion; child notice with no reason; Sub Parent reports bind the Main Parent) and `BR-parent-report-book`; `UC-ADM-block-content` now has a list of reported books with confirmed block, discard, or warn-parent actions, and a block deletes ratings and reflections after warning the admin; Sub Parent pop-up warns the Main Parent; linked from `UC-REC-parent-review` and `UC-SHLF-parent-view-shelf` | _Grayson Whittingham_, _Claude_ |
| _[2026-10-20]_ | 0.11    | Rewrote `UC-PAR-onboarding` consent steps from the FTC COPPA Rule text: consent notice content, confirmation email, no child collection until confirmed, unconfirmed-account cleanup, consent record field                                                                                                                                                                                                                                                                                                                                                              | _Grayson Whittingham_, _Claude_ |
| _[2026-10-25]_ | 0.12    | Cleanup of stale references, no flow changed: rewrote §1.1 Purpose without groups; corrected the `FEAT-*` mapping in the Use Case List; replaced `BR-admin-no-pii` with `BR-admin-limited-view` and removed citations of undefined rules (`BR-no-behavioral-analytics`, `BR-flagging-disclosure`); applied the four-option rating scale (`OI-17` resolved); removed "not yet filed" notes for `OI-15`–`OI-19`; marked `UC-PAR-view-growth-report` post-MVP per vision-and-scope §4.3 | _Claude_                        |
| _[2026-10-26]_ | 0.13    | Applied team decisions and source-backed fixes: `UC-PAR-create-kid-account` is Main Parent only (Sub Parents cannot create accounts), requires confirmed consent, and adds a nickname so the child never sees their real name; onboarding POST-4 and the 1a cross-reference (now extension 8a) agree; per-child exclusions are applied in the rules quiz, manual search and parent suggestions; a block now removes shelf entries in both shelf views and copies flagged reflections to the dangerous content list (`OI-24`); decline reasons follow the glossary; ratings and reflections feed the rule-based MVP per the 2026-09-24 notes; parent removal keeps ratings and reflections; flag review covers reflections only and is the recorded exception to `BR-admin-limited-view` (team position, `OI-15`); suspension notices are in-app only; the reflection disclosure notes `OI-18`; catalog status includes draft | _Claude_                        |
| _[2026-10-26]_ | 0.14    | Added `UC-PAR-review-child-data`, `UC-PAR-delete-child-data`, `UC-PAR-revoke-consent`, `UC-PAR-delete-kid-account`, `UC-PAR-approve-shelf-request`, `UC-ADM-unblock-content` and `UC-ADM-reinstate-account`; the admin may suspend accounts (team decision: the client is, in practice, the admin); the admin sees parents' and Sub Parents' names, usernames and emails, never passwords; mapped the new `FEAT-consent-privacy`, `FEAT-parent-book-report`, `FEAT-admin-catalog` and `FEAT-flag-review` | _Claude_                        |
| _[2026-10-26]_ | 0.15    | Added `UC-ADM-edit-content`, `UC-ADM-suspend-parent-account` and `UC-ADM-view-audit-log`; `UC-ADM-reinstate-account` now covers parent accounts; repeated false reports point to the parent-account suspension | _Claude_                        |
| _[2026-10-28]_ | 0.16    | `UC-PAR-create-kid-account`: wrote the team-agreed validation values (nickname length, age range, grade list, reading-level formats, username format, generated-password format) into the data table and 4h, adopting the proposals in `design/par.md`, Open questions. The avatar set is still to be added from the team's Figma file | _Claude_ |

---

## 1. Introduction

### 1.1 Purpose

BookBuddies lets kids get book recommendations based on their profile, a short quiz, and suggestions from their parents, and keep track of what they read on a personal shelf. Parents create and manage the family's accounts, suggest books, review their child's recommendations, shelf, ratings and reflections, remove and report books, approve books a child finds through search, and can have their child's data deleted. System admins manage the book catalog, review reported books and flagged reflections, and check statistics on the recommender and on accounts.

### 1.2 Scope

After deliberation the client has cut any social aspects of the app. As such the only features being covered are the ones that fit into Parent, Shelf, Recommend, and Admin.


---

## 2. Use Case Template

_[The field definitions. Every use case below uses exactly these fields, in this order.]_

**UC ID and Name.** _The identifier plus a concise name stating the value this use case provides to a user. Begin with an action verb, followed by an object: "Create a rubric", not "Rubric creation" and not "Rubric management", which is a feature, not a goal._

**Created By** and **Date Created.** _Who wrote it, and when._

**Primary and Secondary Actors.** _An actor is a person or other entity outside the system that interacts with it. The primary actor initiates this use case; secondary actors participate in completing it. Actors usually correspond to the user classes you identified in the vision and scope._

**Trigger.** _The business event, system event, or user action that starts the use case. The trigger tells the system to begin testing the preconditions._

**Description.** _A brief statement of the reason for and the outcome of this use case._

**Preconditions.** _What must already be true before this use case can start. **The system must be able to test each precondition**, which is what separates a precondition from a hope. Label them `PRE-1`, `PRE-2`. Example: PRE-1. The user's identity has been authenticated._

**Postconditions.** _The state of the system at successful conclusion. Label them `POST-1`, `POST-2`. Example: POST-1. The price of the item in the database has been updated with the new value._

**Main Success Scenario.** _The actor's actions and the system's responses under normal, expected conditions, as a numbered list that alternates between the two and ends by accomplishing the goal in the name. Write "The system validates..." not "The system will validate..."; use cases are written in the present tense._

**Extensions.** _Where the real work is. Two kinds, both numbered relative to the step they branch from:_

- _**Alternative flows**, other ways the use case can still succeed. Number them `4a`, `4b` for branches from step 4, with their own sub-steps `4a1`, `4a2`. Say where the flow branches off and, if it does, where it rejoins._
- _**Exceptions**, anticipated error conditions and how the system responds. Numbered the same way._

_**A use case with no extensions is not finished.** For every step, ask: what if the input is invalid, the thing is not found, the user cancels, the user is not allowed, or the external system is down? An agent building from a flow with no failure paths will invent the error handling, and you will not find out until a demo._

**Priority.** _Relative priority of implementing this. Use the same scheme across all your use cases._

**Frequency of Use.** _Roughly how often this is performed, per an appropriate unit of time. An early indicator of load, concurrency, and transaction volume, and it is the field that tells your architecture which use cases matter._

**Business Rules.** _The `BR-*` identifiers that govern this use case. **Identifiers only, never the rule's text**, so the rule has one home in [business-rules.md](business-rules.md) and cannot go stale here._

**Associated Information.** _Everything a developer needs that is not a step: the data fields and their validation rules, quality attributes that apply, display and sort strategies, and what happens if execution fails for a systemic reason such as a network timeout. If the use case makes a durable change, say whether a failure rolls it back, completes it, or leaves it partially done._

_Data fields are specified as a table:_

| Property name | Data type | Validation rule             | Security or access concerns | Glossary reference |
|---------------|-----------|-----------------------------|-----------------------------|--------------------|
| _[field]_     | _[type]_  | _[required, format, range]_ | _[who may see or set it]_   | _[term]_           |

**Related Use Cases.** _Other use cases this one invokes or is invoked by, by identifier and name._

**Assumptions.** _Anything assumed about this use case or how it executes._

**Open Issues.** _What you do not know yet. Mirror it into [OPEN-ISSUES.md](OPEN-ISSUES.md) so it is visible in one place._

---

## 3. Use Case List

| Area code | Feature area                                                                                                                                           | Use cases                                                                                                                                                                                                         |
|-----------|--------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `PAR`     | Parent — account linking, oversight and privacy rights (`FEAT-parent-account-linking`, `FEAT-parent-review-dashboard`, `FEAT-parent-suggest-book`, `FEAT-parent-book-report`, `FEAT-consent-privacy`, `FEAT-manual-search`, `FEAT-recap-adult`) | `UC-PAR-onboarding`, `UC-PAR-create-sub-parent-account`, `UC-PAR-create-kid-account`, `UC-PAR-suggest-book`, `UC-PAR-view-growth-report`, `UC-PAR-report-book`, `UC-PAR-review-child-data`, `UC-PAR-delete-child-data`, `UC-PAR-revoke-consent`, `UC-PAR-delete-kid-account`, `UC-PAR-approve-shelf-request` |
| `SHLF`    | Shelf — tracking and rating what a child has read (`FEAT-shelf`, `FEAT-ratings`, `FEAT-kid-reflections`, `FEAT-manual-search`)                         | `UC-SHLF-parent-view-shelf`, `UC-SHLF-kid-view-shelf`, `UC-SHLF-kid-move-book`, `UC-SHLF-kid-remove-book`, `UC-SHLF-kid-rate-book`, `UC-SHLF-kid-add-note`, `UC-SHLF-parent-remove-book`, `UC-SHLF-manual-search` |
| `REC`     | Recommend — quiz and (later) AI-assisted recommendations (`FEAT-onboarding-profile`, `FEAT-reading-level-input`, `FEAT-recommendation-quiz`, `FEAT-ai-recommendation`) | `UC-REC-kid-onboarding`, `UC-REC-recommend-quiz-rules`, `UC-REC-recommend-quiz-ai`, `UC-REC-parent-review`, `UC-REC-kid-review`                                                                                   |
| `ADM`     | Admin — PII-segregated content and system oversight (`FEAT-admin-pii-segregation`, `FEAT-admin-catalog`, `FEAT-book-tagging`, `FEAT-flag-review`, `FEAT-parent-book-report`) | `UC-ADM-suspend-account`, `UC-ADM-suspend-parent-account`, `UC-ADM-reinstate-account`, `UC-ADM-add-content`, `UC-ADM-edit-content`, `UC-ADM-block-content`, `UC-ADM-unblock-content`, `UC-ADM-view-recommender-stats`, `UC-ADM-view-usage-stats`, `UC-ADM-view-audit-log`, `UC-ADM-flag-review` |

Notes on the table above:

- `UC-PAR-create-sub-parent-account` is the identifier already specified in section 4 below; it replaces an earlier, inconsistent name for the same use case (`UC-PAR-create-second-parent-account`) that appeared in a draft version of this list. Per the identifier rule in this document, the already-specified name wins and is never renamed.
- `UC-PAR-suggest-book` corresponds to `FEAT-parent-suggest-book`, which is in the MVP (`vision-and-scope.md` §4.3). `UC-PAR-view-growth-report` corresponds to `FEAT-recap-adult`, which §4.3 places out of the MVP pending client confirmation. No use case implements `FEAT-adult-influence-notes`, whose status is unclear in §4.2.
- The `REC` use cases form two alternative flows that converge on the same downstream steps: `UC-REC-recommend-quiz-rules` → `UC-REC-parent-review` → `UC-REC-kid-review`, and `UC-REC-recommend-quiz-ai` → `UC-REC-parent-review` → `UC-REC-kid-review`. `FEAT-ai-recommendation` (and therefore `UC-REC-recommend-quiz-ai`) is explicitly out of scope for the MVP per §4.3 — carry that priority into the detailed use case.
- `UC-ADM-add-content` and `UC-ADM-block-content` depend on `FEAT-book-tagging`, which `vision-and-scope.md` v0.4 moved into MVP scope; building them is still blocked until the seed-catalog source and tag lists are settled (`OI-1`).

---

## 4. Use Cases

## [PAR] Parent Feature Area

### UC-PAR-onboarding: Create a Parent Account

**UC ID and Name:** `UC-PAR-onboarding`: Create a Parent Account\
**Created By:** _Claude_\
**Date Created:** _2026-10-01_\
**Primary Actor:** A Parent\
**Secondary Actors:** none\
**Trigger:** The parent taps "Sign Up" / "Create Account" from the landing screen.\
**Description:** A parent creates the Main Parent account that every linked child account will hang off of. This is the first use case in the system for any new family, since `BR-parent-account-linked` requires every child account to be linked to a parent account, and `BR-parent-creates-kid-account` requires the parent (never the child) to be the one who creates it.

**Preconditions:**

- PRE-1. No existing parent account is registered under the email address the user supplies.

**Postconditions:**

- POST-1. A new Main Parent account exists, linked to the supplied email.
- POST-2. The parent is logged in.
- POST-3. Parental consent has been recorded and confirmed by the Parent through the emailed link, per `BR-coppa-parental-consent`.
- POST-4. At least one child account exists, linked to the new parent account. The system carries the Parent directly into `UC-PAR-create-kid-account`, and onboarding is not complete until a child account exists; if the Parent leaves first, the account is kept and the Parent is routed back on the next login (extension 8a).

**Main Success Scenario:**

1. The Parent taps "Create Account."
2. The system displays a sign-up form requesting name, email, and password, together with the direct consent notice and a link to the online privacy notice, per `BR-coppa-notice`. The consent notice states what will be collected from the child and how it is used, that nothing is collected without the Parent's consent, and that no information is shared with third parties.
3. The Parent enters their name, email, and password, acknowledges the consent notice, and submits the form.
4. The system validates the email format and checks that it is not already registered.
5. The system creates the Main Parent account in an "awaiting confirmation" state, records the consent acknowledgment (date, method, and notice version), sends a confirmation email that restates what was consented to and how to revoke it, and logs the Parent in.
6. The system holds the Parent on a "check your email" screen. No child account can be created and no child information can be collected until the Parent confirms through the link in the email.
7. The Parent opens the link; the system marks the consent confirmed.
8. The system immediately invokes `UC-PAR-create-kid-account`, since a parent account cannot exist without at least one linked child.
9. Use case ends once `UC-PAR-create-kid-account` completes successfully.

**Extensions:**

- 3a. The Parent cancels before submitting. Use case ends; no account is created.
- 3b. The Parent does not acknowledge the consent notice. The system blocks submission and keeps the form open; no account is created until consent is given, per `BR-coppa-parental-consent`.
- 4a. The email is already registered to an existing account. The system displays an error and offers a sign-in or password-reset link instead; returns to step 3.
- 4b. The email is not a valid email format. The system displays an inline validation error; returns to step 3.
- 4c. The password does not meet the minimum strength policy. The system displays an inline validation error; returns to step 3.
- 5a. The system fails to persist the new account (e.g., database timeout). The system displays an error and does not log the parent in; no partial account record is left behind.
- 6a. The Parent has not confirmed within the time limit (TBD, `OI-22`). The system deletes the Parent's name and email, which were held only to obtain consent, and the unconfirmed account; a later sign-up starts again at step 1.
- 6b. The Parent did not receive the email and asks for it again. The system sends a new confirmation email and invalidates the earlier link; returns to step 6.
- 8a. The Parent abandons the flow during `UC-PAR-create-kid-account` (e.g., closes the app, navigates away) before a child account is created. The system keeps the Main Parent account but does not treat onboarding as finished — on the Parent's next login, the system routes them straight back into `UC-PAR-create-kid-account` before allowing access to anything else, rather than restarting this use case.

**Priority:** High — nothing else in the `PAR` area can happen without a parent account.\
**Frequency of Use:** Once per family, at signup; rare after that.\
**Business Rules:** `BR-parent-account-linked`, `BR-parent-creates-kid-account`, `BR-parent-account-structure`, `BR-coppa-parental-consent`

**Associated Information:**

| Property name          | Data type | Validation rule                                             | Security or access concerns                                                                                                                      | Glossary reference |
|------------------------|-----------|-------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|--------------------|
| Parent name            | string    | required                                                    | Visible to the parent, any linked sub parent, and the system admin; the admin sees a parent's name, username and email, never a password or a child's details (`BR-admin-limited-view`) | —                  |
| Email                  | string    | required; valid email format; unique across parent accounts | Used for login, account recovery and account emails; visible to the system admin (`BR-admin-limited-view`)                                       | —                  |
| Password               | string    | required; meets a minimum strength policy (exact rule TBD)  | Stored hashed; never visible to anyone, including admin                                                                                          | —                  |
| Consent acknowledgment | boolean   | required; must be explicitly acknowledged, not pre-checked  | Recorded as part of the account for compliance purposes, per `BR-coppa-parental-consent`                                                         | —                  |
| Consent record         | structure | acknowledgment date, method (email-plus), notice version, confirmation date | Kept for as long as the child account exists; visible to the parent; never visible to the admin beyond the fact that consent exists (`DI-consent-record`) | —                  |

If account creation fails partway (step 5a), the operation rolls back completely — no row is written for the account, so a retry with the same email does not collide with a half-created record.

**Related Use Cases:** `UC-PAR-create-kid-account` (invoked immediately, in step 8 once the Parent has confirmed consent, as a mandatory continuation of this use case — not optional)\
**Assumptions:** none beyond what's listed in Open Issues.\
**Open Issues:**
- `OI-8` is resolved — `business-rules.md` §2.1 `BR-parent-creates-kid-account` and `BR-parent-account-structure`, and `vision-and-scope.md` §2.7 `AS-parent-account-first`, all confirm (2026-09-24/2026-10-01) that a parent account always exists before any child account, a child cannot self-register, and one parent account can manage multiple children. This use case's parent-first ordering is the client-confirmed design, not an assumption.
- `business-rules.md` v0.2 replaced the 2026-09-10 "admin sees zero PII" rule (once cited as `BR-admin-no-pii`) with `BR-admin-limited-view`; every use case now cites the current identifier.
- The consent steps now follow the FTC COPPA Rule text in `docs/coppa/coppa-full` (`BR-coppa-parental-consent`, `BR-coppa-notice`). The rule text is the document the client supplied. Still open: the consent method is not formally chosen (`OI-21`; email-plus is assumed, and holds only while the system shares no child data with third parties), and the confirmation time limit is TBD (`OI-22`). The wording of the consent notice itself still needs a review before launch.

---

### UC-PAR-create-sub-parent-account: A Parent Creates A Sub Parent Account

**UC ID and Name:** `UC-PAR-create-sub-parent-account`: A Parent Creates A Sub Parent Account\
**Created By:** _Grayson Whittingham_; extensions, business rules, and associated information added by _Claude_\
**Date Created:** _2026-09-25_\
**Primary Actor:** A Parent (the Main Parent)\
**Secondary Actors:** A Sub Parent (invited; completes their own account by choosing a username and password)\
**Trigger:** The parent taps "Add Sub Parent" on account management.\
**Description:** A parent invites a second adult as a sub parent, and the sub parent finishes creating their account by choosing a username and password, so they can help manage the children's reading listed under the Main Parent Account.

**Preconditions:**

- PRE-1. The Parent is logged into the system.
- PRE-2. The Parent is the Main Parent on the account.

**Postconditions:**

- POST-1. A Sub Parent account record is created and linked to the Main Parent's family.
- POST-2. An invitation has been sent to the Sub Parent's email.
- POST-3. If the Sub Parent completes setup, their account is active with their chosen username and password, and they can log in.

**Main Success Scenario:**

1. The Parent taps "Add Sub Parent Account."
2. The Parent enters the name and email of the Sub Parent.
3. The Parent taps confirm on a pop-up notifying them that the Sub Parent will have the same access to the child as they do, except for creating and deleting accounts, and that any book the Sub Parent reports (`UC-PAR-report-book`) is final and binds the Main Parent as if they had reported it.
4. The system creates the Sub Parent account record and sends an invitation to the supplied email.
5. The Sub Parent opens the invitation link.
6. The Sub Parent enters a username and a password, and confirms the password.
7. The Sub Parent submits the form.
8. The system saves the username and password, marks the account active, and tells the Sub Parent they can log in. Use case ends.

**Extensions:**

- 1a. The Parent is a Sub Parent, not the Main Parent (PRE-2 fails). The system does not display the "Add Sub Parent Account" option, or blocks the action with an explanation if attempted directly.
- 2a. The Parent cancels before confirming. Use case ends; no Sub Parent account is created.
- 2b. The email entered is not a valid email format. The system displays an inline validation error; returns to step 2.
- 2c. The email is already associated with an existing Main Parent account on a different family. The system displays an error and does not proceed — a person cannot be a Main Parent on one family and a Sub Parent on another (assumption; not yet confirmed with the client).
- 4a. The invitation email fails to send. The system notifies the Parent that the account was created but the invite needs to be resent, and offers a retry.
- 5a. The invitation link is expired or already used. The system tells the Sub Parent the link is no longer valid and does not show the form; the Main Parent may resend the invitation (expiry period TBD).
- 6a. The username is already taken. The system displays an inline error; returns to step 6.
- 6b. The username does not meet the format rules (TBD). The system displays an inline error; returns to step 6.
- 6c. The password does not meet the strength rules (TBD). The system displays an inline error; returns to step 6.
- 6d. The password and its confirmation do not match. The system displays an inline error; returns to step 6.
- 6e. The Sub Parent leaves before submitting. No username or password is saved, and the account stays in the "invited, not yet set up" state; the invitation link remains usable until it expires.
- 8a. Saving the credentials fails. The system shows an error, the account stays "invited, not yet set up", and the Sub Parent may retry.

**Priority:** Medium\
**Frequency of Use:** Occasional; mostly when an account is first created.\
**Business Rules:** None currently defined in `business-rules.md` specifically govern sub parent accounts or their exact permissions relative to the Main Parent — see Open Issues.

**Associated Information:**

| Property name       | Data type | Validation rule                                                   | Security or access concerns                                                                                                              | Glossary reference |
|---------------------|-----------|-------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------|--------------------|
| Sub Parent name     | string    | required                                                          | Visible to the Main Parent, the Sub Parent, and the system admin (`BR-admin-limited-view`)                                                     | —                  |
| Sub Parent email    | string    | required; valid email format; not already a Main Parent elsewhere | Used to deliver the setup invitation and account emails; visible to the system admin (`BR-admin-limited-view`)                           | —                  |
| Sub Parent username | string    | required; unique; format rules TBD                                | Chosen by the Sub Parent; visible to the Main Parent and the system admin (`BR-admin-limited-view`)                                      | —                  |
| Sub Parent password | string    | required; strength rules TBD; must match confirmation             | Never displayed or logged; stored only as a salted hash                                                                                  | —                  |

If the account record is created but the invite email fails (4a), the account record is not rolled back — it persists in an "invited, not yet set up" state so the Parent can resend rather than starting over.

**Related Use Cases:** `UC-PAR-report-book` (a Sub Parent may report a book; the pop-up in step 3 warns the Main Parent that the report binds them).\
**Assumptions:** Assumes one email can be a Sub Parent on only one family at a time (see 2c); not yet confirmed with the client.\
**Open Issues:** No `BR-*` rule in `business-rules.md` currently scopes what a Sub Parent can and cannot do, or whether there is a limit on the number of Sub Parents per family — worth raising with the client and filing as a new entry in `OPEN-ISSUES.md`.

---

### UC-PAR-create-kid-account: Create a Linked Child Account

**UC ID and Name:** `UC-PAR-create-kid-account`: Create a Linked Child Account\
**Created By:** _Claude_\
**Date Created:** _2026-10-01_\
**Primary Actor:** The Main Parent (a Sub Parent cannot create accounts; see extension 1b)\
**Secondary Actors:** none\
**Trigger:** Either (a) immediately and automatically, as a mandatory continuation of `UC-PAR-onboarding` for the family's first child; or (b) the Main Parent taps "Add a Child" from the account dashboard, for any additional child.\
**Description:** The Main Parent creates a linked child profile, entering the child's name, a nickname, age, grade, a username, and an optional reading level so the recommender has what it needs from the first use. The system generates the child's password and shows it to the parent to pass on to the child. The child sees only their nickname and avatar, never their real name (`BR-kid-anonymous-profile`). This corresponds to `FEAT-onboarding-profile` in `vision-and-scope.md` §4.2.

**Preconditions:**

- PRE-1. The Parent is logged in.
- PRE-2. The Parent is the family's Main Parent, and the account is in good standing (not suspended under `BR-24hr-review-window`). *`business-rules.md` §2.2 itself now flags this rule as needing reconfirmation with the client — see the Open Issues note below.*
- PRE-3. The family's parental consent is confirmed (`UC-PAR-onboarding` step 7, `BR-coppa-parental-consent`, `FR-ACCT-consent-confirm`).

**Postconditions:**

- POST-1. A child profile exists, linked to the Parent's account.
- POST-2. The child profile includes the child's name, nickname, age, grade, and avatar; it includes a reading level only if the Parent chose to enter one.
- POST-3. The child has login credentials: the username the Parent entered and a system-generated password.
- POST-4. The Parent has been shown the credentials with a note to tell the child to log in with them.

**Main Success Scenario:**

1. The Parent arrives at this use case either straight from `UC-PAR-onboarding` (first child) or by tapping "Add a Child" from the account dashboard (additional child).
2. The system displays a form requesting the child's name, a nickname, age, grade, a username, an optional reading level, and an avatar/character selection.
3. The Parent enters the child's name, the nickname the child will be shown as, age, grade, and the username the child will log in with; optionally enters the child's reading level using a scale they already know (e.g., Lexile, AR/ATOS, DRA, Guided Reading Level, or a grade-level range), or skips it; and selects an avatar.
4. The system validates the entered values.
5. The system creates the child profile, linked to the Parent's account, with the entered name, nickname, age, grade, username, and (if given) reading level available to the recommender.
6. The system generates a password for the child's account.
7. The system displays the username and generated password to the Parent with a note: "Tell your child to log in with these credentials."
8. The Parent acknowledges the note. Use case ends.

**Extensions:**

- 1a. The Parent cancels before completing the form. If this is the family's first child (arrived via `UC-PAR-onboarding`), the use case ends without a profile, which triggers `UC-PAR-onboarding`'s extension 8a on the Parent's next login. If this is an additional child (arrived via "Add a Child"), the use case simply ends with no new profile created.
- 1b. The Parent is a Sub Parent (PRE-2 fails). The system does not display "Add a Child", and blocks the action with an explanation if it is attempted directly.
- 1c. The family's consent is not yet confirmed (PRE-3 fails). The system does not show the form and returns the Parent to the "check your email" screen of `UC-PAR-onboarding` step 6.
- 4a. The child's name is empty. The system displays an inline validation error; returns to step 3.
- 4i. The nickname is empty, or is the same as the child's name. The system displays an inline validation error; returns to step 3. (The second check is a team proposal, so the nickname does not reveal the real name.)
- 4b. The age entered is outside the product's target age band (roughly 6–11, per `vision-and-scope.md` §2.4). The system warns the Parent but does not necessarily block the entry (see Open Issues — whether a sibling outside the target band should be allowed is unconfirmed).
- 4c. The grade entered is not a recognized school grade. The system displays an inline validation error; returns to step 3.
- 4f. The username is empty. The system displays an inline validation error; returns to step 3.
- 4g. The username is already taken. The system displays an inline error; returns to step 3.
- 4h. The username does not meet the format rules (see the data table). The system displays an inline error; returns to step 3.
- 4d. The Parent enters a reading level that does not match one of the accepted scales. The system displays an inline validation error and shows the accepted scales/formats; returns to step 3. Skipping the field entirely is not an error, per `BR-reading-level-parent-entered`.
- 4e. The Parent is unsure of the child's reading level. The system may offer referral links to an external resource (e.g., AR Bookfinder, Scholastic Book Wizard) for the Parent's own reference; the system itself never assesses or estimates the level, per `BR-no-reading-level-assessment`.
- 5a. The system fails to persist the child profile (e.g., database timeout). The system displays an error; no partial child record is left behind.
- 6a. The system fails to generate or save the password. The system displays an error; no child profile or credentials are left behind, and the Parent may retry from step 5.
- 7a. The Parent leaves the credentials screen before acknowledging the note. The account already exists. Whether the Parent can view the password again, or must reset it, is TBD (see Open Issues).

**Priority:** High — a family cannot use any `SHLF` or `REC` feature without a child profile, and per `UC-PAR-onboarding` a parent account cannot exist without one either.\
**Frequency of Use:** Once per family immediately after onboarding (first child), with occasional repeats for additional children.\
**Business Rules:** `BR-parent-account-linked`, `BR-parent-creates-kid-account`, `BR-parent-account-structure`, `BR-kid-data-stored`, `BR-kid-anonymous-profile`, `BR-coppa-parental-consent`, `BR-no-reading-level-assessment`, `BR-reading-level-parent-entered`, `BR-admin-limited-view`

**Associated Information:**

| Property name | Data type                                                                                | Validation rule                                                                                                                                                                           | Security or access concerns                                                                                                                                                                                                    | Glossary reference                                 |
|---------------|------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------|
| Child's name  | string                                                                                   | required, per `BR-kid-data-stored`                                                                                                                                                        | PII, stored for law-enforcement reporting purposes per `BR-kid-data-stored` (`OI-23`); visible to the parent; never shown to the child (`BR-kid-anonymous-profile`); the system admin sees it only in flagged-content review (`UC-ADM-flag-review`, `OI-15`) | —                                                  |
| Nickname      | string                                                                                   | required; 1–20 characters after trimming; must differ from the child's name, ignoring letter case and surrounding spaces (team proposal)                                                                                                  | Shown to the child and the parent; the only name on child-facing screens (`BR-kid-anonymous-profile`)                                                                                                                         | Kid-Facing Profile                                 |
| Age           | integer                                                                                  | required, per `BR-kid-data-stored`; a whole number 3–17 is accepted, and the form warns outside 6–11 without blocking (team decision 2026-10-28; see 4b and Open Issues)                                                                                                  | Visible to the parent; used by the recommender as the primary signal (`BR-reading-level-proxy`); never visible to the system admin (`BR-admin-limited-view`)                                                                   | —                                                  |
| Grade         | string/enum: K, 1–12                                                                  | required, per `BR-kid-data-stored`; one of K, 1, 2, … 12 (team decision 2026-10-28)                                                                                                                     | Visible to the parent; used by the recommender alongside age (`BR-reading-level-proxy`); never visible to the system admin (`BR-admin-limited-view`)                                                                           | —                                                  |
| Reading level | string/number, one of Lexile, AR/ATOS, DRA, Guided Reading Level, or a grade-level range | optional, per `BR-kid-data-stored`; manually entered by the parent, or skipped — never assessed by the system, per `BR-no-reading-level-assessment` and `BR-reading-level-parent-entered`. Accepted formats (team decision 2026-10-28): Lexile, a whole number with an optional `BR` prefix and `L` suffix (`650L`, `BR200L`); AR/ATOS, a decimal 0.0–13.0 with at most one decimal place; DRA, `A`–`Z` or a whole number 1–80; Guided Reading Level, one letter `A`–`Z`; grade-level range, two grades from the grade list, the first not after the second (`2–3`). Stored as the scale and the value entered, never converted | Visible to the parent; used by the recommender if given, otherwise age/grade stand in (`BR-reading-level-proxy`); never visible to the system admin (`BR-admin-limited-view`)                                                  | Lexile (Lexile Framework), Accelerated Reader (AR) |
| Username      | string                                                                                   | required; unique across every account that signs in with a username, ignoring letter case; 3–20 characters, letters, digits and underscores only, stored lowercase (team decision 2026-10-28)                                                                                                                                                        | Entered by the Parent; visible to the Parent and the child; never visible to the system admin (`BR-admin-limited-view`)                                                                                                        | —                                                  |
| Password      | string                                                                                   | system-generated from a cryptographically random source: three short common words and two digits, lowercase, joined by hyphens (`otter-maple-sun-42`), so a 6–11-year-old can type it (team decision 2026-10-28)                                                                                                                                           | Shown to the Parent once, on the credentials screen; stored only as a salted hash; never logged                                                                                                                                | —                                                  |
| Avatar        | enum / image reference                                                                   | required; selected from a provided set                                                                                                                                                    | Visible to the parent and child (`BR-kid-anonymous-profile`)                                                                                                                                                                   | Kid-Facing Profile                                 |

**Related Use Cases:** `UC-PAR-onboarding` (invokes this use case immediately for the first child)\
**Assumptions:** Assumes no hard limit on the number of children one parent account can link; not yet confirmed with the client.\
**Open Issues:**
- The earlier conflict here — manual parent entry vs. an in-app baseline test — is now **resolved in this use case's favor**: `business-rules.md` v0.2 `BR-no-reading-level-assessment` and `BR-reading-level-parent-entered`, and `vision-and-scope.md` v0.4 `FEAT-reading-level-input`, all confirm (2026-09-24/2026-10-01) there is no in-app test and reading level is optional, parent-entered. The reading-level scale question is also now answered: Lexile, AR/ATOS, DRA, Guided Reading Level, or a grade-level range are all acceptable, per `BR-reading-level-parent-entered`.
- **New conflict:** `business-rules.md` §2.1 `BR-kid-data-stored` enumerates the stored child fields as name, age, grade, and (optionally) reading level only — it does not mention reading interests or favorite books already read. But `vision-and-scope.md` §4.2 `FEAT-onboarding-profile` — the feature this use case implements — also lists reading interests and favorite books already read as part of the onboarding profile. These two now-current documents disagree on what onboarding actually collects; raise with the client before deciding whether to add those fields to this use case or a separate one.
- **Resolved (team decision 2026-10-15, architecture §8.2.11):** the child's real name is stored but never shown to the child; child-facing screens use the nickname and avatar only, as `BR-kid-anonymous-profile` says. Whether the real name needs to be stored at all is still `OI-23`.
- `business-rules.md` §2.2 flags `BR-24hr-review-window` (cited in PRE-2) itself as needing reconfirmation with the client — it is absent from the team's second-meeting notes, which simplified scope elsewhere. If it's dropped, PRE-2 needs to drop the suspension clause.
- Whether the Parent can see the generated password again after leaving the credentials screen, how the Parent resets it, and whether the child can change it, are not specified. No business rule in `business-rules.md` covers child login credentials.
- Whether this use case, and the product generally, needs to support a child outside the roughly 6–11 target age band (see extension 4b) is not specified anywhere.

---

### UC-PAR-suggest-book: Suggest a Book to a Child

**UC ID and Name:** `UC-PAR-suggest-book`: Suggest a Book to a Child\
**Created By:** _Claude_\
**Date Created:** _2026-10-01_\
**Primary Actor:** A Parent\
**Secondary Actors:** A Child (recipient of the suggestion)\
**Trigger:** The Parent taps "Suggest to [child]" from a book's detail page or search results.\
**Description:** A parent directly suggests a specific catalog book to their child. The suggestion is added only to the child's recommendation list — never placed directly on the child's shelf, since a parent cannot manually add anything to the shelf. The child decides whether to accept it, exactly like any other recommendation. This use case corresponds to `FEAT-parent-suggest-book` in `vision-and-scope.md` §4.2, which is confirmed in scope for the MVP (§4.3).

**Preconditions:**

- PRE-1. The Parent is logged in.
- PRE-2. The Parent has at least one linked child account.
- PRE-3. The book being suggested is an active book in the catalog (not blocked), and is not excluded for that child by an earlier report (`BR-parent-report-book`).

**Postconditions:**

- POST-1. The book is added to the child's recommendation list, not the shelf, per `BR-parent-rec-not-forced`.
- POST-2. Any note the Parent entered is stored alongside the suggestion and shown to the child as part of it — e.g., "I think you'll like this because...". Unlike the hidden growth/theme notes governed by `BR-adult-influence-hidden`, this note is client-confirmed as visible to the child, not private.

**Main Success Scenario:**

1. The Parent finds a book and taps "Suggest to [child]."
2. The system displays a confirmation screen with an optional note field (e.g., "I think you'll like this because...").
3. The Parent confirms the suggestion, with or without a note.
4. The system adds the book, with any note, to the child's recommendation list.
5. The system surfaces the book to the child the next time they view recommendations, labeled as a suggestion from their grown-up, with the Parent's note shown if one was given. The book is not placed on the child's shelf — only the child's own action (accepting the recommendation) can do that, via a separate `REC`-area use case.

**Extensions:**

- 1a. The Parent has more than one linked child. The system asks which child to suggest the book to before continuing.
- 3a. The Parent cancels before confirming. Use case ends; no suggestion is recorded.
- 1b. The book is excluded for the chosen child by an earlier report (PRE-3 fails). The system tells the Parent the book cannot be suggested to this child and records no suggestion; a report is final (`BR-parent-report-book`).
- 4a. The book is already on the child's shelf or already in their recommendation list. The system notifies the Parent and asks whether to suggest it anyway or cancel.
- 5a. The child never logs in to see the suggestion. The suggestion remains pending indefinitely in the recommendation list; no expiry is currently defined (see Open Issues).

**Priority:** Medium-High — `FEAT-parent-suggest-book` is confirmed in scope for the MVP.\
**Frequency of Use:** Occasional; whenever a parent spots a book they think fits their child.\
**Business Rules:** `BR-parent-rec-not-forced`, `BR-parent-report-book` (no suggestion of an excluded book)

**Associated Information:**

| Property name  | Data type | Validation rule                          | Security or access concerns                                                                                                                                             | Glossary reference |
|----------------|-----------|------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------|
| Book reference | reference | required; an active catalog book not excluded for the child | Visible to parent and child (as a suggestion in the recommendation list only)                                                                                           | Seed Catalog       |
| Note           | string    | optional, free text                      | Visible to the child as part of the suggestion (not private, per `BR-parent-rec-not-forced`'s source note); never visible to the system admin (`BR-admin-limited-view`) | —                  |

**Related Use Cases:** `UC-REC-kid-review` (the child accepts or declines the suggestion; accepting is what moves it onto the shelf); this use case only ever populates the recommendation list.\
**Assumptions:** none beyond what's listed in Open Issues.\
**Open Issues:** Whether a pending suggestion in the recommendation list ever expires is undefined anywhere in the current requirements docs. Separately, `vision-and-scope.md` §4.2 still lists `FEAT-adult-influence-notes` (a private, hidden-from-child growth note) as a distinct, status-unclear feature that may or may not have been folded into this one — this use case assumes they are separate, with `FEAT-adult-influence-notes`/`BR-adult-influence-hidden` not yet implemented by any use case.

---

### UC-PAR-view-growth-report: View a Child's Reading Recap

**UC ID and Name:** `UC-PAR-view-growth-report`: View a Child's Reading Recap\
**Created By:** _Claude_\
**Date Created:** _2026-10-01_\
**Primary Actor:** A Parent\
**Secondary Actors:** none\
**Trigger:** The Parent taps "View Recap" from the child's dashboard, or opens a scheduled weekly/monthly notification.\
**Description:** A parent views a short, qualitative snapshot of a child's recent reading activity — what caught their attention, a notable first — without raw counts, streaks, or comparisons. This corresponds to `FEAT-recap-adult`, which `vision-and-scope.md` §4.3 places out of the MVP pending client confirmation.

**Preconditions:**

- PRE-1. The Parent is logged in.
- PRE-2. The Parent has at least one linked child account.

**Postconditions:**

- POST-1. The recap has been displayed to the Parent.

**Main Success Scenario:**

1. The Parent navigates to the child's dashboard.
2. The Parent taps "View Recap."
3. The system generates or retrieves a short qualitative snapshot of the period's reading activity, per `BR-recap-qualitative-only`.
4. The system displays the recap to the Parent.

**Extensions:**

- 2a. The Parent has more than one linked child. The system asks which child's recap to view before step 3.
- 3a. No activity is recorded for the child in the selected period. The system displays an empty-state message rather than a fabricated report.
- 3b. Recap generation fails (e.g., the underlying analytics service is unavailable). The system displays a retry message and does not show stale or fabricated data.

**Priority:** Post-MVP, pending client confirmation (`FEAT-recap-adult` is out of the MVP per `vision-and-scope.md` §4.3). If confirmed, it would support `SM-review-compliance` by giving the parent something worth checking, but it is not itself a blocking gate.\
**Frequency of Use:** Periodic; weekly or monthly per the recap's own cadence.\
**Business Rules:** `BR-recap-qualitative-only`, `BR-kid-no-metrics`

**Associated Information:**

| Property name | Data type               | Validation rule                                                                                                | Security or access concerns                                                                  | Glossary reference |
|---------------|-------------------------|----------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------|--------------------|
| Recap period  | enum (weekly, monthly)  | required                                                                                                       | Parent-only                                                                                  | —                  |
| Recap text    | system-generated string | must not include counts, streaks, or peer comparisons, per `BR-recap-qualitative-only` and `BR-kid-no-metrics` | Parent-only; never shown to the child; never visible to the system admin (`BR-admin-limited-view`) | —                  |

**Related Use Cases:** none defined yet; see Open Issues for how this may relate to `BR-24hr-review-window`.\
**Assumptions:** none beyond what's listed in Open Issues.\
**Open Issues:** This use case depends on `FEAT-recap-adult`, which `vision-and-scope.md` §4.3 leaves out of the MVP until the client confirms it is still wanted. It's also unclear whether viewing this recap is the same action that satisfies the 24-hour review acknowledgment required by `BR-24hr-review-window`, or whether that is a separate, explicit "I have reviewed" action — nothing in the current requirements docs settles this. Recommend filing both as new entries in `OPEN-ISSUES.md`.

### UC-PAR-report-book: Report a Book for a Child

**UC ID and Name:** `UC-PAR-report-book`: Report a Book for a Child\
**Created By:** _Claude_\
**Date Created:** _2026-10-13_\
**Primary Actor:** A Parent (Main or Sub Parent)\
**Secondary Actors:** A Child (receives an in-app notice if the book was on their shelf); the System Admin (reviews the report in `UC-ADM-block-content` and may warn the parent if it is false)\
**Trigger:** The Parent taps "Report" on a book in a recommendation batch under review (`UC-REC-parent-review`) or on a book in the child's shelf (`UC-SHLF-parent-view-shelf`).\
**Description:** A parent reports a book they consider unsuitable for their child. The parent gives a reason and confirms, after being warned that false reports may be punished. Once the report is sent it is final: the book no longer appears for that child, it is never recommended to them again, and it is removed from their shelf. The book is not hidden from other children unless the admin blocks it. The report also goes to the admin's list of reported books. This corresponds to `BR-parent-report-book`. It differs from `UC-ADM-block-content`, which removes a book from the catalog for everyone.

**Preconditions:**

- PRE-1. The Parent is logged in.
- PRE-2. The Parent has a linked child account (`BR-parent-account-linked`).
- PRE-3. The book is in a recommendation batch pending that parent's review for that child, or on that child's shelf.
- PRE-4. This book has not already been reported for this child.

**Postconditions:**

- POST-1. A report exists, recording the book, the child, the reporting parent, the reason, and the time. It appears in the admin's list of reported books.
- POST-2. The book is excluded from every future recommendation and search result for that child.
- POST-3. The book is no longer in the child's current recommendation batch or on the child's shelf.
- POST-4. If the book was on the child's shelf, the child has an in-app notice that it was removed. The notice gives no reason.
- POST-5. The report, the exclusion, the removal, and the notice were saved together. No report exists without its exclusion.
- POST-6. The child's rating and reflection for the book, if any, are kept. The book is unchanged for every other child.
- POST-7. The report cannot be undone.

**Main Success Scenario:**

1. The Parent taps "Report" on a book, from the recommendation batch under review or from the child's shelf.
2. The system displays the report screen, showing the book's title and the child it is being reported for.
3. The Parent selects a reason and may add a comment.
4. The Parent taps "Continue."
5. The system displays a confirmation stating that the report is final, that the book will no longer appear for this child, and that sending a false report may be punished, and asks the Parent to confirm.
6. The Parent confirms.
7. The system saves the report, excludes the book for that child, removes it from the child's current batch and shelf, and creates the child's removal notice if the book was on the shelf, in one save.
8. The system confirms to the Parent that the report was sent and that the book will no longer appear for the child. Use case ends.

**Extensions:**

- 3a. The Parent does not select a reason. The system shows that a reason is required and does not continue.
- 3b. The Parent cancels the report screen. The system makes no change and returns the Parent to where they started.
- 5a. The Parent declines the confirmation. The system makes no change and returns the Parent to the report screen.
- 7a. Saving fails. The system shows an error, creates no report, and leaves the book where it was. The Parent may retry. The report, exclusion, removal, and notice are all-or-nothing.
- 7b. The book was removed from the batch or shelf since the Parent opened it, for example by the child. The system still saves the report and the exclusion, so the book cannot come back. No removal notice is created, since nothing was removed.
- 7c. This book is already reported for this child, for example by the other parent on the account. The system tells the Parent it is already reported and creates no second report.
- 7d. The Parent reported the book from a recommendation batch. The system removes it from the batch as if the Parent had removed it in `UC-REC-parent-review` step 4, and the batch continues to review. The child never saw the book, so no notice is created.
- 7e. The child is not online. The notice stays pending until the child's next session and does not expire.

**Priority:** Medium — an occasional parental correction, but it is the only way a parent's concern about a book reaches the admin.\
**Frequency of Use:** Rare; occasional correction (estimate).\
**Business Rules:** `BR-parent-report-book`, `BR-parent-ultimate-say`, `BR-parent-content-removal`, `BR-parent-shelf-removal` (the notice, with no reason), `BR-parent-account-linked`

**Associated Information:**

| Property name       | Data type                                                                         | Validation rule                                                                  | Security or access concerns                                                                                                         | Glossary reference |
|---------------------|-----------------------------------------------------------------------------------|----------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------|--------------------|
| Reason              | enum: inappropriate content, too difficult, not interested, other (team proposal) | required                                                                         | Parent-set; admin-visible in the reported books list; not shown to the child                                                        | —                  |
| Comment             | string                                                                            | optional; length limit TBD                                                       | Parent-set; admin-visible in the reported books list, so it must not carry the child's identity (`BR-admin-limited-view`)           | —                  |
| Confirmation        | boolean                                                                           | required; the Parent must actively confirm after seeing the false-report warning | Parent-set                                                                                                                          | —                  |
| Reported book       | reference to a catalog book                                                       | must be in the child's batch under review or on the child's shelf                | Parent-visible; child-visible only as an absence and the removal notice                                                             | —                  |
| Reported for        | reference to the child account                                                    | system-set from the linked child                                                 | Parent-visible; shown to the admin only as an opaque account reference                                                              | —                  |
| Reported by         | reference to the parent account (Main or Sub Parent)                              | system-set                                                                       | Parent-visible; not visible to the child; shown to the admin only as an opaque account reference, so a false report can be acted on | —                  |
| Report status       | enum: open, blocked, discarded                                                    | system-set; changed only by `UC-ADM-block-content`                               | Admin-visible; the status does not change the child's exclusion                                                                     | —                  |
| Per-child exclusion | flag on the book for one child                                                    | system-set; permanent, with no undo                                              | Honoured by the recommender and by `UC-SHLF-manual-search`; kept even when the admin discards the report                            | —                  |
| Removal notice      | in-app message                                                                    | created only when a shelf entry is removed; gives no reason                      | Visible to the child; the parent's identity is not shown to the child                                                               | —                  |

Quality attributes: `ROB-no-data-loss` (a failed report leaves the book as it was, not half-excluded); `USE-parent-light` (a report takes a reason, a tap, and a confirm).

A report is final. There is no way for the Parent or the admin to remove the exclusion once the report is sent. Discarding a report in `UC-ADM-block-content` closes it in the admin's list only.

**Related Use Cases:** `UC-REC-parent-review` (invokes this use case from step 4); `UC-SHLF-parent-view-shelf` (also invokes it); `UC-SHLF-parent-remove-book` (removes a shelf book without excluding it from future recommendations; same notice, no reason); `UC-ADM-block-content` (reviews the report; may block the book for everyone, discard the report, or warn the parent about a false report); `UC-ADM-suspend-parent-account` (how a repeated false report is punished); `UC-PAR-create-sub-parent-account` (warns the Main Parent that a Sub Parent's reports bind them); `UC-REC-recommend-quiz-rules` and `UC-REC-recommend-quiz-ai` (must skip excluded books)\
**Assumptions:** The exclusion applies only to the child the book was reported for. A Sub Parent's report acts as the Main Parent's: it is final and the Main Parent cannot reverse it. A report removes the shelf entry as well, because the book must "no longer appear" for the child. Punishing a false report is manual: the admin decides, and may warn the parent (`UC-ADM-block-content` extension 3a) or suspend the account. The reporting parent is not told whether a report was acted on, except through that warning. Neither the child nor the parent is told if a rating or reflection is deleted later because the admin blocked the book. The business rule is confirmed by the client, but no source document records it yet.\
**Open Issues:**
- **Admin identification.** The admin sees opaque account references only (`BR-admin-limited-view`). How an admin decides a report is false, using only that and the reason and comment, is not defined.

---

### UC-PAR-review-child-data: Review and Export a Child's Data

**UC ID and Name:** `UC-PAR-review-child-data`: Review and Export a Child's Data\
**Created By:** _Claude_\
**Date Created:** _2026-10-26_\
**Primary Actor:** A Parent (Main or Sub Parent)\
**Secondary Actors:** none\
**Trigger:** The Parent taps "My child's data" in account settings.\
**Description:** A parent sees what categories of personal information BookBuddies holds about their child, why each is held, and the actual data, and can download a copy. This is the parent's review right under the COPPA Rule (`BR-coppa-parent-rights`, `FR-DATA-review`). It changes nothing. Deleting the data is `UC-PAR-delete-child-data` or `UC-PAR-delete-kid-account`; stopping further collection is `UC-PAR-revoke-consent`. This corresponds to `FEAT-consent-privacy`.

**Preconditions:**

- PRE-1. The Parent is logged in.
- PRE-2. The Parent has at least one linked child account (`BR-parent-account-linked`).

**Postconditions:**

- POST-1. The Parent has seen each category of the child's data, with its purpose and its contents.
- POST-2. If the Parent asked for an export, a file of the child's data was offered to that Parent only.
- POST-3. The view, and any export, is recorded in the audit log with IDs only (architecture §8.2.9).
- POST-4. No data has been changed.

**Main Success Scenario:**

1. The Parent taps "My child's data."
2. The system asks which child, if the Parent has more than one.
3. The system asks the Parent to enter their password again, so the person reviewing is that child's parent (`BR-coppa-parent-rights`: the requester must be confirmed as the parent).
4. The Parent enters their password.
5. The system displays the child's data by category, each with the purpose it is held for: identity (real name, nickname, age, grade, optional reading level, username, avatar); reading profile (interests, favorite books); recommendations and reactions, including decline reasons; shelf; ratings; reflections, including any pending deletion and any safety flag on them; shelf requests; books reported for the child and their per-child exclusions; notifications; and the family's consent record. The child's password is never shown.
6. The Parent taps "Download a copy."
7. The system generates a file of the same data and offers it to the Parent as a download.
8. The system records the view and the export. Use case ends.

**Extensions:**

- 2a. The requested child is not linked to the Parent. The system denies the request and shows no data (`SEC-role-authorization`).
- 4a. The password is wrong. The system shows an error and returns to step 3.
- 4b. The password is wrong too many times. The system slows further attempts, as for sign-in (`SEC-signin-throttling`).
- 5a. A category holds no data. The system shows the category with an empty-state line rather than hiding it, so the Parent sees the full list of what could be held.
- 5b. Loading fails. The system shows a retry message and no partial data.
- 6a. The Parent leaves without exporting. Use case ends after step 5; the view is still recorded.
- 7a. Generating the file fails. The system shows an error and offers a retry; no partial file is offered.

**Priority:** High — the COPPA review right (`BR-coppa-parent-rights`) applies from the first child.\
**Frequency of Use:** Rare; on request.\
**Business Rules:** `BR-coppa-parent-rights`, `BR-parent-account-linked`, `BR-notes-visible-to-parent`

**Associated Information:**

| Property name     | Data type                       | Validation rule                                  | Security or access concerns                                                                                   | Glossary reference |
|-------------------|---------------------------------|--------------------------------------------------|---------------------------------------------------------------------------------------------------------------|--------------------|
| Data categories   | fixed list with stated purposes | system-defined; must match the privacy notice    | Parent-visible; the list must be the same one the online privacy notice gives (`BR-coppa-notice`)             | —                  |
| Export file       | file                            | system-generated; format TBD (team proposal: a readable document plus a machine-readable file) | Offered only to the requesting Parent, over the authenticated session; never emailed; not kept after download | —                  |
| Re-authentication | password check                  | required before step 5                           | Counted with sign-in attempts (`SEC-signin-throttling`)                                                      | —                  |

Quality attributes: `SEC-role-authorization` (a parent reaches only linked children's data); `USE-parent-light`.

**Related Use Cases:** `UC-PAR-delete-child-data`, `UC-PAR-delete-kid-account`, `UC-PAR-revoke-consent` (the parent's other COPPA rights); `UC-SHLF-parent-view-shelf` (the everyday view of the shelf, ratings and reflections)\
**Assumptions:** A Sub Parent may review and export, since a Sub Parent has the same access to linked children as the Main Parent (`OI-25`). The data shown is only what is linked to this child; other families' data and aggregate statistics are not included.\
**Open Issues:**
- The export format is a team proposal.
- Whether the export may include reflection text with a safety flag, and whether the Parent sees entries about the child on the dangerous content list, is not decided (`OI-27`).
- Whether re-entering the password is enough to confirm the requester is the parent is a team proposal; the COPPA Rule asks only that the method not be unduly burdensome.

---

### UC-PAR-delete-child-data: Delete a Child's Reading Data

**UC ID and Name:** `UC-PAR-delete-child-data`: Delete a Child's Reading Data\
**Created By:** _Claude_\
**Date Created:** _2026-10-26_\
**Primary Actor:** The Main Parent\
**Secondary Actors:** A Sub Parent (is told the data was deleted)\
**Trigger:** The Main Parent taps "Delete my child's reading data" in account settings or in `UC-PAR-review-child-data`.\
**Description:** The Main Parent deletes everything the child has done in BookBuddies and their reading profile, while keeping the child's account so the child can start again. Deleting the account itself is `UC-PAR-delete-kid-account`. This is the parent's deletion right under the COPPA Rule (`BR-coppa-parent-rights`, `FR-DATA-removal`). This corresponds to `FEAT-consent-privacy`.

**Preconditions:**

- PRE-1. The Parent is logged in and is the family's Main Parent.
- PRE-2. The child account is linked to the Parent's family (`BR-parent-account-linked`).

**Postconditions:**

- POST-1. The child's reading profile (interests, favorite books), recommendation batches, reactions and decline reasons, shelf entries, ratings, reflections (including any pending deletion), shelf requests and notifications are deleted, so they are no longer retrievable in the normal course of business.
- POST-2. The child account, its identity fields (name, nickname, age, grade, optional reading level, username, avatar), its credentials, the family's consent record and any per-child exclusions are kept.
- POST-3. Onboarding is marked incomplete for the child, so the Parent is asked to fill in the reading profile again (`UC-REC-kid-onboarding` 3b).
- POST-4. Any aggregate statistic derived from the child's data no longer counts it (`FR-DATA-removal`).
- POST-5. The deletion is recorded in the audit log with IDs only (architecture §8.2.9).

**Main Success Scenario:**

1. The Parent taps "Delete my child's reading data" and chooses the child.
2. The system lists what will be deleted and what will be kept (POST-1 and POST-2), and states that deletion cannot be undone.
3. The system asks the Parent to enter their password.
4. The Parent enters their password and confirms.
5. The system deletes the data in POST-1 in one save, marks onboarding incomplete, and records the deletion.
6. The system notifies any Sub Parent in-app that the child's reading data was deleted.
7. The system confirms the deletion to the Parent. Use case ends.

**Extensions:**

- 1a. The Parent is a Sub Parent (PRE-1 fails). The system does not offer the action; deleting is an account change only the Main Parent makes (`OI-25`).
- 2a. The Parent cancels. No change.
- 4a. The password is wrong. The system shows an error and returns to step 3; repeated failures are slowed (`SEC-signin-throttling`).
- 5a. The child has a flagged reflection that is still open in `UC-ADM-flag-review`, or entries on the dangerous content list. How a parent's deletion treats them is not decided (see Open Issues). Until it is, the system must not complete this step for that child.
- 5b. Deleting fails part way. Nothing is deleted; the system shows an error and the Parent may retry. Deletion is all-or-nothing.
- 6a. The Sub Parent notice cannot be saved. The deletion stands, and the system retries the notice.

**Priority:** High — the COPPA deletion right (`BR-coppa-parent-rights`) applies from the first child.\
**Frequency of Use:** Rare.\
**Business Rules:** `BR-coppa-parent-rights`, `BR-coppa-retention`, `BR-parent-account-linked`, `BR-parent-report-book` (exclusions are kept)

**Associated Information:**

| Property name  | Data type        | Validation rule                      | Security or access concerns                                                       | Glossary reference |
|----------------|------------------|--------------------------------------|-----------------------------------------------------------------------------------|--------------------|
| Confirmation   | password + boolean | required; the Parent must re-enter their password and confirm | Main Parent only                                                    | —                  |
| Audit record   | record           | system-set: parent ID, child ID, time, "reading data deleted" | Holds IDs only, never the deleted content (architecture §8.2.9)        | —                  |

Deletion covers backups only through their own expiry; the backup window must be stated in the retention policy (`BR-coppa-retention`, `OI-22`).

**Related Use Cases:** `UC-PAR-review-child-data` (often precedes this); `UC-PAR-delete-kid-account` (deletes the account as well); `UC-REC-kid-onboarding` (the profile is filled in again)\
**Assumptions:** Per-child exclusions are kept, because a parent's report is final while the account is in service (`BR-parent-report-book`). A parent who wants them gone deletes the account.\
**Open Issues:**
- **Flagged content.** Whether a parent's deletion removes a flagged reflection that is under admin review, or entries on the dangerous content list, needs a decision. `FR-DATA-removal` says no preservation exception may be assumed (`OI-27`, `OI-18`).
- Whether the Main Parent may delete only some categories, rather than all reading data at once, is not specified.
- Whether the parent gets an email confirming the deletion is not specified; notifications are otherwise in-app only (`CI-in-app-alerts`).

---

### UC-PAR-revoke-consent: Revoke Consent for a Child

**UC ID and Name:** `UC-PAR-revoke-consent`: Revoke Consent for a Child\
**Created By:** _Claude_\
**Date Created:** _2026-10-26_\
**Primary Actor:** The Main Parent\
**Secondary Actors:** A Child (can no longer sign in); a Sub Parent (is told)\
**Trigger:** The Main Parent taps "Stop collecting my child's information" in account settings, or opens the revoke link in the consent confirmation email (`UC-PAR-onboarding` step 5).\
**Description:** The Main Parent withdraws consent for a child, so BookBuddies stops using the child's information and collects nothing more from them. The COPPA Rule lets the service end for that child, so the child can no longer sign in (`BR-coppa-parent-rights`, `BR-coppa-parental-consent`). The data already held is kept until the Parent deletes it or the retention policy removes it. This corresponds to `FEAT-consent-privacy`.

**Preconditions:**

- PRE-1. The Parent is the family's Main Parent and is logged in, or has opened a valid revoke link from the consent email.
- PRE-2. The child account is linked to the family and its consent is active.

**Postconditions:**

- POST-1. The consent record shows consent revoked for the child, with the date and the method (settings or email link).
- POST-2. The child's sessions are ended, and the child cannot sign in.
- POST-3. Nothing further is collected from or about the child, and the child's data is not used for recommendations, statistics or any other purpose.
- POST-4. The child's existing data is kept until the Parent deletes it (`UC-PAR-delete-child-data`, `UC-PAR-delete-kid-account`) or the retention policy's deadline passes (`BR-coppa-retention`, `OI-22`).
- POST-5. Any Sub Parent has an in-app notice.

**Main Success Scenario:**

1. The Parent taps "Stop collecting my child's information" and chooses the child.
2. The system explains what revoking does: the child can no longer use BookBuddies, nothing more is collected, and the data already held is kept until it is deleted. It offers to delete the data or the account now as well.
3. The system asks the Parent to enter their password.
4. The Parent enters their password and confirms.
5. The system records the revocation on the consent record, sets the child account to consent revoked, and ends the child's sessions, in one save.
6. The system notifies any Sub Parent in-app.
7. The system confirms the revocation to the Parent. Use case ends.

**Extensions:**

- 1a. The Parent is a Sub Parent. The system does not offer the action (`OI-25`).
- 1b. The Parent arrived from the email link without being signed in. The system asks the Parent to sign in first, then continues at step 2.
- 2a. The Parent chooses to delete the data or the account as well. The system revokes consent as in steps 3–5, then continues in `UC-PAR-delete-child-data` or `UC-PAR-delete-kid-account`.
- 2b. The Parent cancels. No change.
- 4a. The password is wrong. The system shows an error and returns to step 3; repeated failures are slowed (`SEC-signin-throttling`).
- 5a. Ending the child's sessions fails. The revocation is kept, because blocking new sign-ins is what matters; the system retries ending the sessions.
- 5b. Saving the revocation fails. Nothing changes; the system shows an error and the Parent may retry.

**Priority:** High — the COPPA right to refuse further collection (`BR-coppa-parent-rights`) applies from the first child.\
**Frequency of Use:** Rare.\
**Business Rules:** `BR-coppa-parent-rights`, `BR-coppa-parental-consent`, `BR-coppa-retention`, `BR-parent-account-linked`

**Associated Information:**

| Property name  | Data type                        | Validation rule                              | Security or access concerns                                                              | Glossary reference |
|----------------|----------------------------------|----------------------------------------------|------------------------------------------------------------------------------------------|--------------------|
| Consent status | enum: pending, confirmed, revoked | per child; set to revoked only by this use case | Parent-visible; the admin sees only whether consent exists (`DI-consent-record`)      | Consent Record     |
| Revoke method  | enum: settings, email link       | system-set                                   | Kept on the consent record                                                               | Consent Record     |

A revoked account is not a suspended account: only the Parent can end a revocation, and the admin cannot reinstate it (`UC-ADM-reinstate-account`).

**Related Use Cases:** `UC-PAR-onboarding` (records the consent and sends the email with the revoke link); `UC-PAR-delete-child-data` and `UC-PAR-delete-kid-account` (offered in step 2); `UC-PAR-review-child-data`\
**Assumptions:** Consent is revoked one child at a time; a parent revoking for every child repeats the use case (team proposal). The consent record is per family (`DI-consent-record`), so it holds a per-child status.\
**Open Issues:**
- How a parent gives consent again after revoking, and whether that needs a fresh notice and confirmation email, is not specified (`BR-coppa-parental-consent`, `OI-21`).
- Whether a revoked child's data is kept until the general retention deadline, or deleted sooner, needs the retention period (`OI-22`).

---

### UC-PAR-delete-kid-account: Delete a Child Account

**UC ID and Name:** `UC-PAR-delete-kid-account`: Delete a Child Account\
**Created By:** _Claude_\
**Date Created:** _2026-10-26_\
**Primary Actor:** The Main Parent\
**Secondary Actors:** A Sub Parent (is told)\
**Trigger:** The Main Parent taps "Delete this child's account" in account settings, or chooses it in `UC-PAR-revoke-consent` or `UC-PAR-review-child-data`.\
**Description:** The Main Parent deletes a child's account and every piece of personal information held about the child, so none of it is retrievable in the normal course of business (`BR-coppa-parent-rights`, `FR-DATA-removal`). This corresponds to `FEAT-consent-privacy` and `FEAT-parent-account-linking`.

**Preconditions:**

- PRE-1. The Parent is logged in and is the family's Main Parent.
- PRE-2. The child account is linked to the family (`BR-parent-account-linked`).

**Postconditions:**

- POST-1. The child account and its credentials no longer exist, and its sessions are ended.
- POST-2. Everything in `FR-DATA-removal` is deleted: the identity fields in the Child Identity Store, the reading profile, recommendation batches and reactions, shelf, ratings, reflections, shelf requests, books reported for the child and their per-child exclusions, notifications, and the child's entries in applicable logs.
- POST-3. Aggregate statistics no longer count the child (`FR-DATA-removal`).
- POST-4. The family's consent record shows the child removed, with the date.
- POST-5. The deletion is recorded in the audit log with IDs only (architecture §8.2.9).
- POST-6. Any Sub Parent has an in-app notice.

**Main Success Scenario:**

1. The Parent taps "Delete this child's account" and chooses the child.
2. The system states that the account and all of the child's information will be deleted, that this cannot be undone, and that the child will no longer be able to sign in.
3. The system asks the Parent to enter their password and to type the child's nickname to confirm (team proposal, so the wrong child is not deleted).
4. The Parent enters both and confirms.
5. The system ends the child's sessions and deletes the account and the data in POST-2, in one save, and records the deletion.
6. The system notifies any Sub Parent in-app.
7. The system confirms the deletion to the Parent. Use case ends.

**Extensions:**

- 1a. The Parent is a Sub Parent (PRE-1 fails). The system does not offer the action; only the Main Parent creates or deletes accounts (`OI-25`).
- 2a. The Parent cancels. No change.
- 4a. The password is wrong, or the nickname does not match. The system shows an error and returns to step 3; repeated password failures are slowed (`SEC-signin-throttling`).
- 5a. The child has a flagged reflection still open in `UC-ADM-flag-review`, or entries on the dangerous content list. As in `UC-PAR-delete-child-data` 5a, the handling is not decided, and the system must not complete this step for that child until it is.
- 5b. Deleting fails part way. Nothing is deleted; the system shows an error and the Parent may retry.
- 7a. This was the family's last child. The Main Parent account stays, and the Parent is offered `UC-PAR-create-kid-account` on the next sign-in, as in `UC-PAR-onboarding` 8a.

**Priority:** High — the COPPA deletion right (`BR-coppa-parent-rights`) applies from the first child.\
**Frequency of Use:** Rare.\
**Business Rules:** `BR-coppa-parent-rights`, `BR-coppa-retention`, `BR-parent-account-linked`, `BR-parent-account-structure`

**Associated Information:**

| Property name | Data type                      | Validation rule                                  | Security or access concerns                                               | Glossary reference |
|---------------|--------------------------------|--------------------------------------------------|---------------------------------------------------------------------------|--------------------|
| Confirmation  | password + typed nickname      | both required; the nickname must match exactly   | Main Parent only                                                          | —                  |
| Audit record  | record                         | system-set: parent ID, deleted child ID, time    | IDs only; the deleted child ID no longer resolves to any data             | —                  |

Deletion covers backups only through their own expiry, stated in the retention policy (`BR-coppa-retention`, `OI-22`). Reports in the admin's list that named this child keep the book and reason but lose the child reference.

**Related Use Cases:** `UC-PAR-delete-child-data` (deletes the reading data but keeps the account); `UC-PAR-revoke-consent` (may lead here); `UC-PAR-create-kid-account` (the reverse); `UC-ADM-block-content` (a report that loses its child reference stays in the admin's list)\
**Assumptions:** Deleting a child account never deletes the parent account. There is no undo or grace period (team proposal).\
**Open Issues:**
- **Flagged content.** As in `UC-PAR-delete-child-data`: whether a deletion removes flagged content under review or on the dangerous content list needs a decision (`FR-DATA-removal`, `OI-27`, `OI-18`).
- Whether a parent can delete their own Main Parent account, and what happens to the family, has no use case.
- Whether a short grace period, like the reflection's pending deletion, should apply is not specified.

---

### UC-PAR-approve-shelf-request: Approve or Decline a Child's Shelf Request

**UC ID and Name:** `UC-PAR-approve-shelf-request`: Approve or Decline a Child's Shelf Request\
**Created By:** _Claude_\
**Date Created:** _2026-10-26_\
**Primary Actor:** A Parent (Main or Sub Parent)\
**Secondary Actors:** A Child (is told the outcome)\
**Trigger:** The Parent taps the in-app prompt about a pending shelf request, or opens "Shelf requests" on the child's dashboard.\
**Description:** A parent decides on a book their child asked to add to their shelf from manual search (`UC-SHLF-manual-search`). Approving adds the book to the shelf in the category the child chose; declining adds nothing. The child is told either way. This is the parent's side of `UC-SHLF-manual-search` steps 8–9, and corresponds to `FEAT-manual-search`.

**Preconditions:**

- PRE-1. The Parent is logged in.
- PRE-2. A pending shelf request exists for a child linked to the Parent's family (`BR-parent-account-linked`).

**Postconditions:**

- POST-1. If approved: the book is on the child's shelf in the requested category, the request is approved, and it records the deciding parent and the time.
- POST-2. If declined: no shelf entry is created, and the request is declined with the deciding parent and the time.
- POST-3. The child has an in-app notice of the outcome, in neutral wording that does not name the parent.
- POST-4. The decision, the shelf entry and the notice were saved together.

**Main Success Scenario:**

1. The Parent opens the pending shelf requests.
2. The system lists the pending requests for the family's children, newest first, each with the child's nickname, the book's cover and title, and the requested category.
3. The Parent opens a request.
4. The system shows the book's details and the requested category, with "Approve" and "Decline."
5. The Parent taps "Approve."
6. The system adds the book to the child's shelf in the requested category, marks the request approved, and creates the child's notice, in one save. Only the first decision on a request counts (architecture §8.2.8).
7. The system confirms to the Parent and returns to the list. Use case ends.

**Extensions:**

- 2a. There are no pending requests. The system shows an empty-list message.
- 3a. The request is for a child not linked to the Parent. The system denies it and shows nothing (`SEC-role-authorization`).
- 5a. The Parent taps "Decline." The system marks the request declined and creates a neutral notice for the child that the book was not added this time (`UC-SHLF-manual-search` 8a). Use case ends.
- 5b. The Parent wants the book never to appear for the child. The Parent taps "Report" and continues in `UC-PAR-report-book`; the request is closed as declined.
- 6a. The other parent decided first. The system shows the recorded outcome and makes no change.
- 6b. The book was blocked, or excluded for this child, after the request was made. The system does not add it, closes the request, and tells the child the book is no longer available (`UC-SHLF-manual-search` 8c).
- 6c. The book is already on the child's shelf by another route. The system creates no duplicate and records the request as already satisfied (`UC-SHLF-manual-search` 9b).
- 6d. The child cancelled the request. The system shows it as cancelled; no change.
- 6e. Saving fails. Nothing is committed; the system shows an error and the Parent may retry (`UC-SHLF-manual-search` 9a).

**Priority:** Medium — needed if manual search keeps its approval step; see Open Issues.\
**Frequency of Use:** As often as children send shelf requests; a few times per week per active family (estimate).\
**Business Rules:** `BR-parent-ultimate-say`, `BR-parent-account-linked`, `BR-parent-report-book`

**Associated Information:**

| Property name | Data type                                                       | Validation rule                                   | Security or access concerns                                           | Glossary reference |
|---------------|-----------------------------------------------------------------|---------------------------------------------------|-----------------------------------------------------------------------|--------------------|
| Decision      | enum: approved, declined                                        | one decision per request; the first one counts    | Parent-set; recorded with the deciding parent                         | Shelf Request      |
| Child notice  | in-app message                                                  | created with every decision; neutral wording TBD  | Visible to the child; does not name the parent                        | —                  |

**Related Use Cases:** `UC-SHLF-manual-search` (creates the request); `UC-PAR-report-book` (from 5b); `UC-SHLF-parent-remove-book` (a parent may remove the book later)\
**Assumptions:** The Parent cannot change the requested category when approving (`UC-SHLF-manual-search` Open Issues). A declined request does not stop the child asking again.\
**Open Issues:**
- **Is approval wanted?** The 2026-09-24 notes say there is "no parent approval step for kid book selections", with purchasing treated as implicit approval (`client-interview-2026-09-24.md` §5). The approval step in `UC-SHLF-manual-search` has no business rule or client source behind it. Confirm with the client before this use case is built.
- Request expiry, decline reasons and the notice wording are not specified.

---

## [REC] Recommend Feature Area

_Recommendation flows. The recommender runs in exactly one mode at a time, set system-wide:_

- _**Rules mode (MVP):** `UC-REC-recommend-quiz-rules` → `UC-REC-parent-review` → `UC-REC-kid-review`._
- _**AI mode (post-MVP):** `UC-REC-recommend-quiz-ai` → `UC-REC-parent-review` → `UC-REC-kid-review`._

_The two quiz use cases are mutually exclusive. Which one a request enters is decided by the recommender-mode setting, never by the child or the parent, and neither flow may fall back to the other mid-request. `UC-REC-kid-onboarding` is not part of either flow; it runs once per child at setup._

### UC-REC-kid-onboarding: Capture a Child's Reading Interests and Favorite Books

**UC ID and Name:** `UC-REC-kid-onboarding`: Capture a Child's Reading Interests and Favorite Books\
**Created By:** _Claude_\
**Date Created:** _2026-10-04_\
**Primary Actor:** A Parent (sets up the child's profile on the child's behalf)\
**Secondary Actors:** A Child (present for the reflection disclosure)\
**Trigger:** Immediately after `UC-PAR-create-kid-account` completes for a child profile.\
**Description:** A parent records the reading interests and favorite books already read for a newly created child, giving the recommender its starting profile. This corresponds to the reading-interest and favorite-book parts of `FEAT-onboarding-profile` in `vision-and-scope.md` §4.2.

**Preconditions:**

- PRE-1. The Parent is logged in.
- PRE-2. A child profile exists, linked to the Parent's account (created by `UC-PAR-create-kid-account`).
- PRE-3. Onboarding is not already marked complete for this child profile.

**Postconditions:**

- POST-1. The child's reading interests are recorded, if any were selected.
- POST-2. The child's favorite books already read are recorded, if any were selected.
- POST-3. The child is shown the reflection disclosure: their parents can always read their reflections, and violent or self-harm content is reported to their parents and the system admin. The client's 2026-09-24 wording also names "authorities" (`client-interview-2026-09-24.md` §5); whether the disclosure says so depends on `OI-18`, because the disclosure must match what the system actually does.
- POST-4. Onboarding is marked complete for this child profile.

**Main Success Scenario:**

1. The Parent starts onboarding for the new child profile.
2. The system displays a set of reading-interest options and a picker of catalog books.
3. The Parent selects one or more reading interests.
4. The Parent selects zero or more favorite books the child has already read.
5. The system displays the reflection disclosure to the child, and the child acknowledges it.
6. The system saves the onboarding profile and marks onboarding complete.

**Extensions:**

- 3a. The Parent selects no interests. The system allows this and continues; the recommender then relies on age and grade alone, per `BR-reading-level-proxy`.
- 3b. The Parent skips the whole step. Onboarding is saved as incomplete; the child can still request recommendations, which again use age and grade only. The system reminds the Parent on their next login.
- 4a. The Parent tries to add a favorite book that is not in the seed catalog. The system does not accept it; the picker only offers catalog books, so the recommender can use the entry.
- 5a. The child does not acknowledge the disclosure. The system keeps the onboarding screen open and does not mark onboarding complete.
- 6a. The system fails to save the onboarding profile. The system displays an error and keeps every selection the Parent has made so far in the form; onboarding is not marked complete.

**Priority:** High — the recommender's starting profile depends on it, and `FR-ONB-profile` in the SRS places its collection at child account creation.\
**Frequency of Use:** Once per child profile, at setup; rare after that.\
**Business Rules:** `BR-parent-creates-kid-account`, `BR-reading-level-proxy`, `BR-no-reading-level-assessment`

**Associated Information:**

| Property name               | Data type                             | Validation rule                                                  | Security or access concerns                                                                                           | Glossary reference |
|-----------------------------|---------------------------------------|------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------|--------------------|
| Reading interests           | multi-select from a fixed option list | optional; each value must come from the list (list contents TBD) | Visible to the parent and child; used by the recommender; never visible to the system admin (`BR-admin-limited-view`) | —                  |
| Favorite books already read | list of catalog book references       | optional; each entry must exist in the seed catalog              | Visible to the parent and child; used by the recommender; never visible to the system admin (`BR-admin-limited-view`) | Seed Catalog       |
| Onboarding complete         | boolean                               | required; set only by step 6                                     | Parent-set; not visible to the admin                                                                                  | —                  |

**Related Use Cases:** `UC-PAR-create-kid-account` (invokes this use case); `UC-REC-recommend-quiz-rules` (consumes the saved profile)\
**Assumptions:** The Parent, not the child, enters interests and favorite books, consistent with `BR-parent-creates-kid-account`.\
**Open Issues:**
- `business-rules.md` §2.1 `BR-kid-data-stored` lists only real name, age, grade, and optional reading level as stored child data. It does not list reading interests or favorite books, yet `vision-and-scope.md` §4.2 `FEAT-onboarding-profile` and `FR-ONB-profile` in the SRS require both. The rule needs updating or the features need dropping.
- `UC-PAR-create-kid-account` and this use case both run at child setup. Whether the profile fields belong in the parent's create-kid form or a separate onboarding step is undecided; the SRS currently puts all of them in the creation step (`FR-ONB-profile`).
- The reading-interest option list and its contents are not specified anywhere in the requirements.
- The reflection disclosure's exact wording is not specified, and no rule in `business-rules.md` governs it; it rests on `FR-NOTE-disclosure` in the SRS.

---

### UC-REC-recommend-quiz-rules: Recommend Books With the Rules-Based Quiz

**UC ID and Name:** `UC-REC-recommend-quiz-rules`: Recommend Books With the Rules-Based Quiz\
**Created By:** _Claude_\
**Date Created:** _2026-10-04_\
**Primary Actor:** A Child\
**Secondary Actors:** none\
**Trigger:** The child taps "Get recommendations" on their home screen. This can happen on any request, not only at onboarding.\
**Description:** A child answers a short button-based quiz and receives a batch of books from the tagged seed catalog, filtered and ranked by a rules engine against the child's profile. The batch is then handed to `UC-REC-parent-review`. This is the MVP recommendation flow and corresponds to `FEAT-recommendation-quiz` and `FR-REC-rules`/`FR-REC-every-request` in the SRS.

**Preconditions:**

- PRE-1. The child is logged in to their child session.
- PRE-2. The child profile has an age and a grade recorded.
- PRE-3. The system's recommender-mode setting is **rules**. If it is not, this use case does not start.
- PRE-4. The seed catalog contains at least one tagged book.

**Postconditions:**

- POST-1. A recommendation batch for this request is stored, with source "rules," and is pending parent review.
- POST-2. The batch has been handed to `UC-REC-parent-review`.

**Main Success Scenario:**

1. The child taps "Get recommendations."
2. The system displays the quiz as button options; no free text is offered.
3. The child selects one option for each quiz question.
4. The system filters the active tagged catalog against the child's profile, using age and grade as the primary signal and the reading level as a difficulty input only if one is recorded, per `BR-reading-level-proxy`. It leaves out books the admin has blocked and books excluded for this child by a parent's report (`BR-parent-report-book`).
5. The system ranks the matching books and selects the top results.
6. The system stores the batch as rules-sourced recommendations and hands it to `UC-REC-parent-review`.

**Extensions:**

- 1a. The child profile has no age or grade. The system blocks the request and shows the child a message asking them to get a parent to finish their profile; the request is recorded as failed, not retried silently.
- 2a. The child closes the quiz before answering. Use case ends; no batch is created.
- 3a. A quiz question is left unanswered when the child taps to continue. The system highlights the unanswered question and returns to step 3.
- 4a. The filter returns no matching books. The system shows an empty-state message and offers to restart the quiz. It does not widen the filter or fill the batch with unrelated books.
- 4b. The catalog cannot be read (e.g., database timeout). The system shows an error and offers a retry; no partial batch is stored.
- 5a. Fewer books match than the batch size. The system stores and presents the books that do match, and does not pad the batch.
- 6a. The batch cannot be stored. The system shows an error; the batch is not handed to `UC-REC-parent-review`.

**Priority:** High — this is the core MVP loop.\
**Frequency of Use:** Several times per active child per week; the most frequent `REC` use case.\
**Business Rules:** `BR-reading-level-proxy`, `BR-no-reading-level-assessment`, `BR-parent-report-book` (per-child exclusions)

**Associated Information:**

| Property name         | Data type                           | Validation rule                                                        | Security or access concerns                                                                                                   | Glossary reference |
|-----------------------|-------------------------------------|------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------|--------------------|
| Quiz answers          | button selections, one per question | required, each from the provided option set; questions and options TBD | Child-visible; used only to filter this request; not stored as a reading-level estimate, per `BR-no-reading-level-assessment` | —                  |
| Batch size            | integer                             | system-defined; exact number TBD (`OI-2`)                              | Not user-set                                                                                                                  | —                  |
| Recommendation source | enum                                | set to "rules" by this use case                                        | Visible to the parent (source only)                                                                                           | Recommender        |

Quality attributes: the batch should return quickly for a catalog of 30–50 books (`PER-recommendation-latency`; numeric target TBD).

**Related Use Cases:** `UC-REC-parent-review` (step 6 hand-off); `UC-REC-kid-onboarding` (provides the starting profile); `UC-REC-kid-review` (runs after parent review)\
**Assumptions:** The seed catalog is tagged with at least genre/mood/length/age fit (`FEAT-book-tagging`); this use case depends on that tagging being in place.\
**Open Issues:**
- The quiz questions, their options, and the number of books per batch are not specified (`OI-2`).
- The exact matching criteria beyond "age/grade primary, reading level as difficulty input" are not specified (`OI-2`). The 2026-09-24 notes say the rule-based MVP also draws on the child's ratings and reflections and on parent recommendations (`client-interview-2026-09-24.md`, "Initial ideas"); how ratings and reflections enter the rules is not yet specified.
- The seed catalog source is unconfirmed (`OI-1`); with no catalog, PRE-4 cannot be met.

---

### UC-REC-recommend-quiz-ai: Recommend Books With the AI Recommender (Post-MVP)

**UC ID and Name:** `UC-REC-recommend-quiz-ai`: Recommend Books With the AI Recommender (Post-MVP)\
**Created By:** _Claude_\
**Date Created:** _2026-10-04_\
**Primary Actor:** A Child\
**Secondary Actors:** none\
**Trigger:** The child taps "Get recommendations," while the recommender-mode setting is **AI**.\
**Description:** The rules engine narrows the tagged catalog to a candidate set, and an ML model re-ranks those candidates using behavioral similarity to other children. The batch is then handed to `UC-REC-parent-review`. This is `FEAT-ai-recommendation` stages 2–3 and `FR-REC-ml` in the SRS. It is post-MVP and is written now only so its identifier and flow exist; it is never run in the MVP.

**Preconditions:**

- PRE-1. The child is logged in to their child session.
- PRE-2. The child profile has an age and a grade recorded.
- PRE-3. The system's recommender-mode setting is **AI**. If it is not, this use case does not start.
- PRE-4. The seed catalog contains at least one tagged book.
- PRE-5. The behavioral similarity model is available.

**Postconditions:**

- POST-1. A recommendation batch for this request is stored, with source "AI," and is pending parent review.
- POST-2. The batch has been handed to `UC-REC-parent-review`.

**Main Success Scenario:**

1. The child taps "Get recommendations."
2. The system displays the quiz as button options; no free text is offered.
3. The child selects one option for each quiz question.
4. The rules engine narrows the tagged catalog to a candidate set, using the same profile filters as `UC-REC-recommend-quiz-rules`.
5. The ML model re-ranks the candidate set using behavioral signals only, never age, location, or other demographic traits (`BR-similarity-signal-weights`, `BR-similarity-data-boundary`).
6. The system stores the top-ranked batch as AI-sourced recommendations and hands it to `UC-REC-parent-review`.

**Extensions:**

- 1a. The child profile has no age or grade. Same handling as `UC-REC-recommend-quiz-rules` 1a.
- 2a–3a. As in `UC-REC-recommend-quiz-rules`.
- 4a. The rules narrowing returns no candidates. Same empty-state handling as `UC-REC-recommend-quiz-rules` 4a; the request does not switch to rules mode.
- 5a. The similarity model has too little behavioral data for this child (cold start). The system returns the rule-narrowed candidates unranked and marks the batch as unranked. It does **not** fall back to `UC-REC-recommend-quiz-rules`, because the two flows may not run for the same request. *The exact cold-start behavior is a team decision still to be confirmed.*
- 5b. The model is unavailable. The system shows an error and offers a retry; no batch is stored and the request does not switch to rules mode.
- 6a. The batch cannot be stored. Same handling as `UC-REC-recommend-quiz-rules` 6a.

**Priority:** Post-MVP (`FEAT-ai-recommendation` is out of MVP scope per `vision-and-scope.md` §4.3). Do not build in the MVP.\
**Frequency of Use:** Same as the rules flow once enabled.\
**Business Rules:** `BR-reading-level-proxy`, `BR-similarity-signal-weights` (flagged for reconfirmation), `BR-similarity-data-boundary`, `BR-no-reading-level-assessment`

**Associated Information:**

| Property name         | Data type                                                  | Validation rule                       | Security or access concerns                              | Glossary reference          |
|-----------------------|------------------------------------------------------------|---------------------------------------|----------------------------------------------------------|-----------------------------|
| Behavioral signals    | saved, loved, rated highly, recommended to a peer, skipped | only these signals; never demographic | Used for similarity across users; not shown to any child | Similarity ("Similar Kids") |
| Recommendation source | enum                                                       | set to "AI" by this use case          | Visible to the parent (source only)                      | Recommender                 |

**Related Use Cases:** `UC-REC-parent-review`, `UC-REC-kid-review` (both shared with the rules flow); `UC-REC-recommend-quiz-rules` (mutually exclusive — never run for the same request)\
**Assumptions:** The recommender-mode setting is changed only by a deliberate system-level configuration step, never per child or mid-session.\
**Open Issues:**
- Cold-start behavior (extension 5a) must be decided without falling back to the rules flow.
- `BR-similarity-signal-weights` is flagged in `business-rules.md`: the "rated highly" weight conflicts with the client's own note to keep rating weight low early on.
- The "recommended to a peer" signal depends on peer sharing, which was cut from the MVP; it has no data source until social features return.

---

### UC-REC-parent-review: Parent Reviews a Child's Recommendation Batch

**UC ID and Name:** `UC-REC-parent-review`: Parent Reviews a Child's Recommendation Batch\
**Created By:** _Claude_\
**Date Created:** _2026-10-04_\
**Primary Actor:** A Parent\
**Secondary Actors:** none\
**Trigger:** A recommendation batch is handed off by `UC-REC-recommend-quiz-rules` (MVP) or `UC-REC-recommend-quiz-ai` (post-MVP).\
**Description:** A parent sees the batch generated for their child before the child does, and may remove any book they object to. The parent is not required to approve each book, per `BR-parent-ultimate-say`. Books that remain are released to the child for `UC-REC-kid-review`.

**Preconditions:**

- PRE-1. The Parent is logged in.
- PRE-2. A recommendation batch exists for a child linked to the Parent's account and is pending review.

**Postconditions:**

- POST-1. Each book in the batch is either removed by the Parent or released to the child.
- POST-2. The released books are handed to `UC-REC-kid-review`. Books the Parent removed are never shown to the child.

**Main Success Scenario:**

1. The system notifies the Parent that a new recommendation batch is ready for their child.
2. The Parent opens the batch.
3. The system displays each recommended book with its title and tags.
4. The Parent removes one or more books they object to, or removes none.
5. The Parent confirms the batch.
6. The system releases the remaining books to the child and hands them to `UC-REC-kid-review`.

**Extensions:**

- 2a. The Parent does not open the batch. The system releases the batch to the child unchanged. Parent review is non-blocking, per `BR-parent-ultimate-say`. *This default is a team decision awaiting client confirmation, and it is the part of this use case that depends most on the unresolved 24-hour review rule.*
- 4a. The Parent removes every book. The system releases an empty batch, and the child sees a message that there are no new picks right now and that they can ask again.
- 5a. The confirmation fails to save. The system shows an error and keeps the batch pending; nothing is released to the child until the save succeeds.
- 6a. Release to the child fails. The system retries and does not show the child a partial batch.

**Priority:** Medium — required by the flow you specified, but no `FEAT-*` in `vision-and-scope.md` v0.4 currently describes parent review of recommendations (see Open Issues).\
**Frequency of Use:** Once per recommendation request, so roughly as often as `UC-REC-recommend-quiz-rules`.\
**Business Rules:** `BR-parent-ultimate-say`, `BR-parent-rec-not-forced` (parent-suggested books bypass this review; see Assumptions)

**Associated Information:**

| Property name | Data type                       | Validation rule                     | Security or access concerns                          | Glossary reference |
|---------------|---------------------------------|-------------------------------------|------------------------------------------------------|--------------------|
| Batch status  | enum (pending, released, empty) | system-set                          | Parent-visible; never shown to the child as a status | —                  |
| Removed books | list of book references         | optional; each must be in the batch | Parent-only; never shown to the child                | —                  |

**Related Use Cases:** `UC-REC-recommend-quiz-rules` and `UC-REC-recommend-quiz-ai` (upstream, mutually exclusive); `UC-REC-kid-review` (downstream); `UC-PAR-report-book` (the Parent may report a book from step 4 instead of only removing it, so it is never recommended to this child again)\
**Assumptions:** Parent-suggested books (`UC-PAR-suggest-book`) go straight to the child's recommendation list and do not pass through this review, per `BR-parent-rec-not-forced`.\
**Open Issues:**
- **No `FEAT-*` covers this.** `FEAT-parent-review-dashboard` in `vision-and-scope.md` v0.4 covers viewing the child's shelf and reflections and removing a shelf book, not reviewing recommendations. Confirm with the client that this review is wanted before it is built.
- Whether the batch is blocked until the parent acts (extension 2a) contradicts nothing in `business-rules.md` as long as it stays non-blocking, but it has not been confirmed.
- The 24-hour review rule (`BR-24hr-review-window`, `OI-16`) is still unconfirmed. If it applies to recommendations, a missed review would have to suspend the child's account, which would change extension 2a.

---

### UC-REC-kid-review: Child Reacts to Recommended Books

**UC ID and Name:** `UC-REC-kid-review`: Child Reacts to Recommended Books\
**Created By:** _Claude_\
**Date Created:** _2026-10-04_\
**Primary Actor:** A Child\
**Secondary Actors:** A Parent (receives the reflection of a decline reason only if it is later shown to them; see Open Issues)\
**Trigger:** Books are released to the child by `UC-REC-parent-review`, or a parent-suggested book is added to the child's recommendation list.\
**Description:** A child decides what to do with each recommended book: accept it (it goes onto the shelf as "Reading Now"), save it for later ("Maybe Later"), or decline it with an optional reason. The child's choice is the only way a recommended book reaches the shelf.

**Preconditions:**

- PRE-1. The child is logged in to their child session.
- PRE-2. At least one recommendation is in the child's recommendation list and has not yet been reacted to.

**Postconditions:**

- POST-1. Each book the child acted on has one recorded reaction: accepted, maybe later, or declined.
- POST-2. Accepted books are on the child's shelf in "Reading Now"; "Maybe Later" books are on the shelf in "Maybe Later."
- POST-3. Declined books are removed from the recommendation list and are not placed on the shelf.

**Main Success Scenario:**

1. The child opens their recommendation list.
2. The system displays each recommended book with its cover and title.
3. The child chooses a reaction for a book: "Yes," "Maybe later," or "Not for me."
4. If the reaction is "Yes," the system places the book on the shelf in "Reading Now."
5. If the reaction is "Maybe later," the system places the book on the shelf in "Maybe Later."
6. If the reaction is "Not for me," the system offers an optional reason (Not interested in topic, Too easy / too short, Too hard / too long, Not my style, or Other; glossary "Decline Reason", from the flowchart, slide 1), and records the decline.
7. The system removes the book from the recommendation list.
8. The child repeats steps 3–7 for each book, then leaves the list. Use case ends.

**Extensions:**

- 3a. The child leaves the list without reacting to a book. The book stays in the recommendation list for the next visit.
- 4a. The book is already on the child's shelf. The system does not add a duplicate and tells the child it is already on their shelf.
- 6a. The child skips the optional reason. The decline is recorded with no reason.
- 7a. Saving the shelf change or the reaction fails. The system shows an error and keeps the book in the list; the reaction is not recorded.

**Priority:** High — the child's accept/decline is the step that moves a recommendation onto the shelf.\
**Frequency of Use:** Several times per active child per week, following each recommendation request.\
**Business Rules:** `BR-parent-rec-not-forced` (the child may accept or decline any recommendation, including parent suggestions), `BR-kid-no-metrics` (no counts or comparisons shown to the child)

**Associated Information:**

| Property name  | Data type                                               | Validation rule                              | Security or access concerns                                                        | Glossary reference   |
|----------------|---------------------------------------------------------|----------------------------------------------|------------------------------------------------------------------------------------|----------------------|
| Reaction       | enum: yes, maybe later, not for me                      | required; one per book                       | Child-set; visible to the parent as part of the shelf                              | —                    |
| Decline reason | enum: not interested in topic, too easy / too short, too hard / too long, not my style, other | optional; only when reaction is "not for me" | Parent visibility not yet decided (see Open Issues); never visible to the system admin (`BR-admin-limited-view`) | Decline Reason       |
| Shelf category | enum: Reading Now, Maybe Later                          | set by the reaction                          | Visible to the parent and child                                                    | Shelf (`FEAT-shelf`) |

**Related Use Cases:** `UC-REC-parent-review` (upstream); `UC-REC-recommend-quiz-rules` / `UC-REC-recommend-quiz-ai` (originating flows, mutually exclusive); `UC-SHLF-kid-view-shelf` (where accepted books appear)\
**Assumptions:** The reaction options and shelf categories follow the 2026-09-25 flowchart; `FR-REC-react` in the SRS lists accept/defer/decline, which maps onto the same three choices.\
**Open Issues:**
- Whether a declined book, or its reason, is ever shown to the parent is not specified. The decline reason's purpose and visibility need confirming.
- Whether a declined book can be recommended again later is not specified.
- The shelf category for an accepted book is "Reading Now" per the flowchart; `FR-SHLF-categories` in the SRS lists the four categories.

---

## [SHLF] Shelf Feature Area

_The shelf is the child's record of what they are reading, want to read, or have finished. Books reach the shelf only through the child's own reaction in `UC-REC-kid-review`; a parent can remove a book from the shelf but cannot add one (`BR-parent-rec-not-forced`). The four categories follow `FEAT-shelf` as shown in the 2026-09-25 flowchart, and `FR-SHLF-categories` in the SRS. The shelf shows no counts, streaks, or comparisons to other children (`BR-kid-no-metrics`)._

### UC-SHLF-parent-view-shelf: View a Child's Shelf and Reflections

**UC ID and Name:** `UC-SHLF-parent-view-shelf`: View a Child's Shelf and Reflections\
**Created By:** _Claude_\
**Date Created:** _2026-10-04_\
**Primary Actor:** A Parent (Main or Sub Parent)\
**Secondary Actors:** none\
**Trigger:** The Parent taps "View Shelf" on a child's dashboard.\
**Description:** A parent sees everything a linked child has placed on their shelf, grouped by category, with each finished book's rating and reflection. This is the parent's oversight view under `FR-PAR-review`. It changes nothing, and it is the entry point to `UC-SHLF-parent-remove-book`. This corresponds to `FEAT-parent-review-dashboard`.

**Preconditions:**

- PRE-1. The Parent is logged in.
- PRE-2. The Parent has at least one linked child account (`BR-parent-account-linked`).

**Postconditions:**

- POST-1. The child's shelf entries, ratings, and reflections have been displayed to the Parent.
- POST-2. No shelf entry, rating, or reflection has been changed.

**Main Success Scenario:**

1. The Parent taps "View Shelf" on the child's dashboard.
2. The system loads the child's shelf entries, with their ratings and reflections.
3. The system displays the entries grouped under Reading Now, Want to Read, Maybe Later, and Finished, each with its cover and title.
4. The Parent taps a book.
5. The system displays the book's rating and any reflection the child wrote, with a flag marker if the reflection was flagged.
6. The Parent leaves the shelf view. Use case ends.

**Extensions:**

- 1a. The Parent has more than one linked child. The system asks which child's shelf to view before step 2.
- 2a. The child has no shelf entries. The system displays an empty-state message for the shelf instead of an empty list.
- 2b. Loading fails. The system displays a retry message and does not show a partial or stale shelf.
- 2c. The Parent is not linked to the requested child. The system denies the request and returns no shelf data (`SEC-role-authorization`).
- 5a. A reflection on the book is flagged for violence or self-harm. The system displays the flag marker; the alert itself is issued by `UC-SHLF-kid-add-note`.
- 5b. The admin blocks the book while the Parent is viewing the shelf. `UC-ADM-block-content` removes the shelf entry and deletes its rating and reflection, so the entry is gone the next time the view loads. Neither the parent nor the child is told (`UC-ADM-block-content` Assumptions).

**Priority:** High — reviewing the child's shelf is the parent's core oversight action.\
**Frequency of Use:** Several times per week per family (estimate).\
**Business Rules:** `BR-parent-account-linked`, `BR-notes-visible-to-parent`

**Associated Information:**

| Property name  | Data type                                              | Validation rule                                                                                                             | Security or access concerns                                                                                | Glossary reference   |
|----------------|--------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------|----------------------|
| Shelf category | enum: Reading Now, Want to Read, Maybe Later, Finished | required; one value per entry                                                                                               | Visible to the parent and child                                                                            | Shelf (`FEAT-shelf`) |
| Rating         | enum: Loved it, Liked it, It was okay, Not for me      | optional; only for Finished entries                                                                                         | Parent-visible; never visible to the system admin (`BR-admin-limited-view`)                                | Rating               |
| Reflection     | string                                                 | optional; see `UC-SHLF-kid-add-note`                                                                                        | Always parent-visible (`BR-notes-visible-to-parent`); the admin sees flagged content only in `UC-ADM-flag-review` (`OI-15`) | —                    |
| Display order  | system-set                                             | Categories are fixed in the order listed in step 3; entries within a category are most-recently-moved first (team proposal) | Not shown as a number                                                                                      | —                    |

The view runs from a stored shelf and does not recompute anything, so a failed load leaves the child's data untouched. Quality attributes: `USE-parent-light` (the parent reaches the shelf in one tap from the dashboard).

**Related Use Cases:** `UC-SHLF-parent-remove-book` (invoked from step 4); `UC-SHLF-kid-view-shelf` (the child's view of the same shelf); `UC-PAR-report-book` (also invoked from this view); `UC-SHLF-kid-add-note` (produces the reflections shown here); `UC-PAR-view-growth-report` (a separate, qualitative recap, not this view)\
**Assumptions:** A secondary parent sees the same shelf as the primary parent, per `UC-PAR-create-sub-parent-account`. The parent view shows no counts or totals, a team proposal that keeps this view consistent with `BR-kid-no-metrics`.\
**Open Issues:**
- Whether a parent should see when a child moved a book, or any history of moves, is not specified anywhere in the requirements.
- Whether viewing the shelf counts as the parent's review under `BR-24hr-review-window` is unresolved (`OI-16`).

---

### UC-SHLF-kid-view-shelf: View My Shelf

**UC ID and Name:** `UC-SHLF-kid-view-shelf`: View My Shelf\
**Created By:** _Claude_\
**Date Created:** _2026-10-04_\
**Primary Actor:** A Child\
**Secondary Actors:** none\
**Trigger:** The child taps "My Shelf" on their home screen.\
**Description:** A child sees the books they have placed on their shelf, grouped by category, as the place where their reading is tracked. The shelf is the only place a recommended book lands after the child accepts it. This corresponds to `FEAT-shelf`.

**Preconditions:**

- PRE-1. The child is logged in to their child session.
- PRE-2. The child profile is linked to a parent account (`BR-parent-account-linked`).

**Postconditions:**

- POST-1. The child has seen their shelf entries.
- POST-2. No shelf entry, rating, or reflection has been changed.

**Main Success Scenario:**

1. The child taps "My Shelf."
2. The system loads the child's shelf entries.
3. The system displays the entries grouped under Reading Now, Want to Read, Maybe Later, and Finished, each with its cover and title, using large tap targets.
4. The child taps a book.
5. The system displays the book's shelf actions: move, remove, and, for Finished books, rate and add a reflection.
6. The child leaves the shelf. Use case ends.

**Extensions:**

- 2a. The child has no shelf entries. The system displays a short empty-state message that points the child to get recommendations, not a count or a zero.
- 2b. Loading fails. The system displays a retry message and does not show a partial shelf.
- 3a. A category has no entries. The system still shows the category heading with a one-line empty state, so the four-category layout stays the same for every child.
- 3b. The admin blocks a book on the child's shelf. `UC-ADM-block-content` removes the shelf entry, so the book is no longer on the shelf the next time it loads; the child is not told (`UC-ADM-block-content` Assumptions).
- 5a. The child taps an action that the book's current category does not allow, such as rating a book that is not Finished. The system does not offer the action.

**Priority:** High — the shelf is the child's main place in the app after a recommendation is accepted.\
**Frequency of Use:** Several times per week per active child.\
**Business Rules:** `BR-kid-anonymous-profile`, `BR-kid-no-metrics`, `BR-parent-account-linked`

**Associated Information:**

| Property name        | Data type                                              | Validation rule                                              | Security or access concerns     | Glossary reference   |
|----------------------|--------------------------------------------------------|--------------------------------------------------------------|---------------------------------|----------------------|
| Shelf category       | enum: Reading Now, Want to Read, Maybe Later, Finished | required; one value per entry                                | Visible to the child and parent | Shelf (`FEAT-shelf`) |
| Book cover and title | catalog reference                                      | required; from the seed catalog                              | Visible to the child and parent | Seed Catalog         |
| Display order        | system-set                                             | Within a category, most-recently-moved first (team proposal) | Not shown as a number           | —                    |

The child interface shows no counts, streaks, reading level, or comparisons (`BR-kid-no-metrics`; `UI-kid-no-metrics` in the SRS). Quality attributes: `USE-child-first-run` (a child finds the shelf without adult help).

**Related Use Cases:** `UC-SHLF-kid-move-book`, `UC-SHLF-kid-remove-book`, `UC-SHLF-kid-rate-book`, `UC-SHLF-kid-add-note` (all invoked from step 5); `UC-REC-kid-review` (the flow that places accepted books here); `UC-SHLF-parent-view-shelf` (the parent's view of the same data)\
**Assumptions:** Books reach the shelf through `UC-REC-kid-review` or, with parent approval, through `UC-SHLF-manual-search`. `UC-SHLF-kid-move-book` only changes a book already on the shelf.\
**Open Issues:**

---

### UC-SHLF-kid-move-book: Move a Book Between Shelf Categories

**UC ID and Name:** `UC-SHLF-kid-move-book`: Move a Book Between Shelf Categories\
**Created By:** _Claude_\
**Date Created:** _2026-10-04_\
**Primary Actor:** A Child\
**Secondary Actors:** none\
**Trigger:** The child selects a category control on a book on their shelf.\
**Description:** A child changes which category a book sits in, for example from Want to Read to Reading Now, or from Reading Now to Finished. This is how the child tracks their own progress through a book.

**Preconditions:**

- PRE-1. The child is logged in to their child session.
- PRE-2. The book is on the child's shelf.

**Postconditions:**

- POST-1. The shelf entry's category is the category the child chose.
- POST-2. The shelf entry is in no other category.
- POST-3. Moving a book to Finished does not require a rating; the rating step is offered, not forced.

**Main Success Scenario:**

1. The child opens a book on their shelf.
2. The system displays the four categories, with the book's current category marked.
3. The child selects a different category.
4. The system validates that the book is still on the shelf and that the chosen category is one of the four.
5. The system saves the new category and returns the child to the shelf, showing the book in its new place.
6. If the new category is Finished and the book has no rating, the system offers the optional rating step in `UC-SHLF-kid-rate-book`. Use case ends.

**Extensions:**

- 2a. The book is no longer on the shelf, for example because the parent removed it in `UC-SHLF-parent-remove-book` while the child was viewing it. The system tells the child the book is no longer on their shelf and returns them to the shelf. No move occurs.
- 3a. The child selects the category the book is already in. The system makes no change and returns to the shelf.
- 3b. The child closes the category control without selecting. The system makes no change.
- 4a. The chosen category is not one of the four, for example from a tampered request. The system rejects the request and makes no change.
- 5a. Saving fails. The system shows an error and keeps the book in its previous category; the child's choice is shown as not saved (`ROB-no-data-loss`).
- 6a. The child declines the rating step. The book stays in Finished, unrated.

**Priority:** High — moving books is how the child's shelf reflects their reading.\
**Frequency of Use:** A few times per week per active child.\
**Business Rules:** `BR-kid-no-metrics`

**Associated Information:**

| Property name  | Data type                                              | Validation rule                    | Security or access concerns                    | Glossary reference   |
|----------------|--------------------------------------------------------|------------------------------------|------------------------------------------------|----------------------|
| Shelf category | enum: Reading Now, Want to Read, Maybe Later, Finished | required; must be one of the four  | Child-set; visible to the parent               | Shelf (`FEAT-shelf`) |
| Last moved at  | timestamp                                              | system-set on each successful move | Not shown to the child; used for display order | —                    |

A failed save changes nothing, so the entry is never left in two categories or in none. Moves do not generate any notice to the parent (no source requires one).

**Related Use Cases:** `UC-SHLF-kid-view-shelf` (invokes this use case from a shelf entry); `UC-SHLF-kid-rate-book` (offered from step 6); `UC-SHLF-parent-remove-book` (can remove the book while the child is moving it)\
**Assumptions:** A child may move a book to Finished without having read it; the system does not verify reading.\
**Open Issues:**
- The difference between Want to Read and Maybe Later is not defined in any source. `UC-REC-kid-review` sends a "maybe later" reaction to Maybe Later and never uses Want to Read.
- Whether a book can move out of Finished back into a reading category (for re-reading) is not specified; this use case allows it.

---

### UC-SHLF-kid-remove-book: Remove a Book From My Shelf

**UC ID and Name:** `UC-SHLF-kid-remove-book`: Remove a Book From My Shelf\
**Created By:** _Claude_\
**Date Created:** _2026-10-04_\
**Primary Actor:** A Child\
**Secondary Actors:** none\
**Trigger:** The child chooses "Remove from shelf" on a book on their shelf.\
**Description:** A child takes a book off their own shelf. This corresponds to the archive behavior in `FEAT-shelf`. No source explicitly describes child-initiated removal; the 2026-09-25 flowchart shows only parent removal, so this use case is included on the basis of `FEAT-shelf` and needs client confirmation before it is built.

**Preconditions:**

- PRE-1. The child is logged in to their child session.
- PRE-2. The book is on the child's shelf.

**Postconditions:**

- POST-1. The shelf entry no longer exists.
- POST-2. The entry's rating and reflection are kept. The recommender uses them, so removing the shelf entry does not delete them.
- POST-3. The book is not added to the child's recommendation list by this use case.

**Main Success Scenario:**

1. The child opens a book on their shelf.
2. The child chooses "Remove from shelf."
3. The system asks the child to confirm that the book comes off their shelf, and states that their rating and reflection stay on record.
4. The child confirms.
5. The system removes the shelf entry only. The rating and reflection are kept.
6. The system returns the child to the shelf without the book. Use case ends.

**Extensions:**

- 1a. The book is no longer on the shelf. The system tells the child the book has already been removed and returns them to the shelf.
- 3a. The child cancels. The system makes no change.
- 5a. Saving fails. The system shows an error and keeps the shelf entry; removal is all-or-nothing.
- 5b. The entry's reflection has been safety-flagged (`UC-SHLF-kid-add-note`). Removal does not change the flag or the alert, so the parent and admin can still act on the reflection under `BR-note-safety-flagging`.

**Priority:** Medium — the child can usually leave a book on the shelf without harm, so this is not a blocking flow.\
**Frequency of Use:** Occasional, about once a month per active child (estimate).\
**Business Rules:** `BR-note-safety-flagging`, `BR-notes-visible-to-parent`

**Associated Information:**

| Property name                  | Data type | Validation rule                                                                                             | Security or access concerns                                                                                                              | Glossary reference |
|--------------------------------|-----------|-------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------|--------------------|
| Confirmation                   | boolean   | required; the child must actively confirm                                                                   | Child-set                                                                                                                                | —                  |
| Retained rating and reflection | reference | kept after the shelf entry is removed; deleting a reflection is a separate action in `UC-SHLF-kid-add-note` | Rating and reflection stay with the child's record for the recommender; parent-visible; the admin sees a flagged reflection only in `UC-ADM-flag-review` (`OI-15`) | —                  |

Only the shelf entry is deleted, in one save. The rating and reflection are not touched, so a failed save leaves the entry in place (`ROB-no-data-loss`).

**Related Use Cases:** `UC-SHLF-kid-view-shelf` (invokes this use case from a shelf entry); `UC-SHLF-parent-remove-book` (the parent's counterpart, which does notify the child); `UC-SHLF-kid-add-note` (where a reflection can be deleted; this use case never deletes one)\
**Assumptions:** A child-removed book is not put back into the recommendation list automatically; a later recommendation is a new request under `UC-REC-recommend-quiz-rules`.\
**Open Issues:**
- No source confirms that a child may remove their own shelf entries (see Description).
- A rating or reflection whose shelf entry has been removed is not shown on the shelf, so the parent view (`UC-SHLF-parent-view-shelf`) needs a rule for showing it. The recommender still uses it. Whether the parent should be able to see it is not specified.
- Whether the parent should see that the child removed a book is not specified.
- Whether a removed book can be recommended again is not specified (also open for `UC-SHLF-parent-remove-book`).

---

### UC-SHLF-kid-rate-book: Rate a Finished Book

**UC ID and Name:** `UC-SHLF-kid-rate-book`: Rate a Finished Book\
**Created By:** _Claude_\
**Date Created:** _2026-10-04_\
**Primary Actor:** A Child\
**Secondary Actors:** none\
**Trigger:** The child taps "Rate this book" on a Finished book, or accepts the rating step offered by `UC-SHLF-kid-move-book`.\
**Description:** A child records how they felt about a book they have finished. The rating is the child's own, shown to their parent, and it is not shown to other children in the MVP. This corresponds to `FEAT-ratings`.

**Preconditions:**

- PRE-1. The child is logged in to their child session.
- PRE-2. The book is on the child's shelf in the Finished category.

**Postconditions:**

- POST-1. One rating is recorded for this child and this book. A new choice replaces any earlier rating.
- POST-2. The rating is visible to the child and to their parent, and to no other child.

**Main Success Scenario:**

1. The child opens a Finished book and taps "Rate this book."
2. The system displays the rating options from the current scale, each with a short label and icon.
3. The child selects one option.
4. The system validates that the option belongs to the current scale.
5. The system saves the rating and shows it on the book. Use case ends.

**Extensions:**

- 1a. The book is not in Finished. The system does not offer the rating option.
- 2a. The child closes the rating step without selecting. The system records no rating; the book stays unrated.
- 3a. The child selects a different option from an earlier rating. The system replaces the earlier rating; the earlier value is not kept.
- 4a. The option is not on the current scale, for example from a tampered request. The system rejects it and records no rating.
- 5a. Saving fails. The system shows an error, keeps the child's selection on screen so they can retry, and records no rating (`ROB-no-data-loss`).

**Priority:** Medium — `FEAT-ratings` is in the MVP, and ratings are the "child feedback loop" among the client's MVP goals (glossary, "MVP"). A child can still get recommendations without rating anything, so this does not block the core loop.\
**Frequency of Use:** Once per finished book; roughly one to two per active child per week (estimate).\
**Business Rules:** `BR-kid-no-metrics`

**Associated Information:**

| Property name | Data type                   | Validation rule                         | Security or access concerns                                                                             | Glossary reference |
|---------------|-----------------------------|-----------------------------------------|---------------------------------------------------------------------------------------------------------|--------------------|
| Rating        | enum: Loved it, Liked it, It was okay, Not for me | required when set; must be one of the four | Child-set; visible to the child and parent; never visible to the system admin (`BR-admin-limited-view`) | Rating             |
| Rated at      | timestamp                   | system-set on each save                 | Parent-visible                                                                                          | —                  |

**The rating scale is the four options Loved it / Liked it / It was okay / Not for me** (team decision 2026-10-07, following the 2026-09-25 flowchart; `OI-17` resolved; glossary "Rating"; `FR-RATE-rating`). The "community aggregate" rating is not part of the MVP, because `FEAT-ratings` drops the peer and social layer.

**Related Use Cases:** `UC-SHLF-kid-move-book` (offers this from step 6); `UC-SHLF-kid-view-shelf` (where the rating shows); `UC-SHLF-parent-view-shelf` (where the parent sees it)\
**Assumptions:** The 2026-09-24 notes say the rule-based MVP draws on the child's ratings (`client-interview-2026-09-24.md`, "Initial ideas"), with rating weight kept low while the user base is small. How a rating enters the rules is not yet specified (`OI-2`); the later ML stage uses it as a behavioral signal (`FEAT-ai-recommendation`, Stage 2).\
**Open Issues:**
- The 2026-09-24 notes say to keep rating weight low early on, which conflicts with the "rated highly" weight in `BR-similarity-signal-weights`. Relevant only to the later ML stage.

---

### UC-SHLF-kid-add-note: Write a Reflection After Finishing a Book

**UC ID and Name:** `UC-SHLF-kid-add-note`: Write a Reflection After Finishing a Book\
**Created By:** _Claude_\
**Date Created:** _2026-10-04_\
**Primary Actor:** A Child\
**Secondary Actors:** A Parent (receives an in-app alert if the reflection is flagged); the System Admin (receives an alert if the reflection is flagged, and reads the content only in `UC-ADM-flag-review`)\
**Trigger:** The child taps "Write a reflection" on a Finished book.\
**Description:** A child optionally writes a short reflection about a finished book: why they liked or disliked it, and who they would recommend it to. The reflection is always visible to the parent, with no private option for this age group. If it contains violent or self-harm content, it is flagged and alerted immediately. This corresponds to `FEAT-kid-reflections`.

**Preconditions:**

- PRE-1. The child is logged in to their child session.
- PRE-2. The book is on the child's shelf in the Finished category.
- PRE-3. The child's onboarding is complete, including the reflection disclosure the child acknowledged (`UC-REC-kid-onboarding`, POST-3). Per `FR-NOTE-disclosure`, the child is told at onboarding that this kind of content is reported.

**Postconditions:**

- POST-1. One reflection is saved for this child and this book. A later save replaces the earlier text.
- POST-2. The reflection is visible to the child's linked parent (`BR-notes-visible-to-parent`).
- POST-3. If the reflection was flagged, an in-app alert has been issued to the parent and to the system admin, and the flag is recorded on the reflection.

**Main Success Scenario:**

1. The child opens a Finished book and taps "Write a reflection."
2. The system displays a text box, with optional prompts ("Why did you like or not like it?", "Who would you recommend it to?") and the character limit.
3. The child types a reflection and taps "Save."
4. The system checks the reflection for violent or self-harm content.
5. The system saves the reflection, and records a flag on it if the check found such content.
6. If the reflection is flagged, the system sends an immediate in-app alert to the parent and to the system admin.
7. The system confirms the reflection is saved and returns the child to the book. Use case ends.

**Extensions:**

- 2a. The book is not in Finished. The system does not offer the reflection option.
- 2b. The child chooses "Delete reflection" on an unflagged reflection. The system asks the child to confirm. On confirm, the reflection enters pending deletion for 24 hours: it is hidden from the child and the parent, and the child can restore it during that window. After 24 hours with no restore, the reflection is permanently deleted. A flagged reflection shows no delete option.
- 2c. The child chooses "Restore" on a reflection pending deletion, within 24 hours. The system restores it unchanged and returns it to the parent view.
- 3a. The child leaves the text box with unsaved text. The system asks whether to discard the reflection; on discard, nothing is saved, and on cancel, the child returns to the text box.
- 3b. The child saves an empty reflection. The system saves nothing, because a reflection is optional, and returns the child to the book.
- 3c. The text exceeds the character limit. The system shows an inline error, disables Save, and keeps the text so the child can shorten it. Limit is TBD (see Open Issues).
- 4a. The content check cannot run, for example because the service is unavailable. The system does not save the reflection, keeps the text on screen, and shows a retry message. The reflection is never saved unchecked.
- 5a. Saving fails. The system shows an error and keeps the text on screen. Nothing is saved, so no alert is issued (`ROB-no-data-loss`).
- 6a. The parent cannot receive the alert at once, for example because they are offline. The flag and alert stay pending, the parent sees them at their next login, and the system keeps retrying delivery. An alert is never only a log entry (`SAF-flag-delivery`).
- 6b. The alert reaches the parent but not the admin. The system retries the admin alert and does not drop it.

**Priority:** Medium — an optional feature in the MVP. The safety handling around it is high-stakes, so the flagging path must be built and tested before the reflection itself ships.\
**Frequency of Use:** Occasional; at most once per finished book, and many books will have none.\
**Business Rules:** `BR-notes-visible-to-parent`, `BR-note-safety-flagging`, `BR-parent-content-removal`

**Associated Information:**

| Property name   | Data type                               | Validation rule                                                                                                        | Security or access concerns                                                                                                                           | Glossary reference |
|-----------------|-----------------------------------------|------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------|
| Reflection text | string                                  | optional; must not be blank to save; character limit TBD (team proposal: 500)                                          | Always visible to the parent (`BR-notes-visible-to-parent`); never private (`SEC-no-private-notes`); the admin sees it only if flagged, in `UC-ADM-flag-review` (`OI-15`) | —                  |
| Flag status     | enum: none, flagged                     | system-set by the content check; not editable by the child                                                             | Visible to the parent and the system admin                                                                                                            | —                  |
| Flag category   | enum: violence, self-harm               | system-set when flagged                                                                                                | Visible to the parent; visible to the admin in the flagged-content list (`UC-ADM-flag-review`)                                                        | —                  |
| Saved at        | timestamp                               | system-set on each save                                                                                                | Parent-visible                                                                                                                                        | —                  |
| Deletion state  | enum: active, pending deletion, deleted | system-set; "pending deletion" lasts 24 hours from the child's confirmation; only an unflagged reflection can enter it | Pending-deletion reflections are hidden from the child and parent; only unflagged reflections enter this state, so the admin has no view of them      | —                  |

A child can delete their own reflection only if it is not flagged. Removing a book from the shelf never deletes a reflection (see `UC-SHLF-kid-remove-book`). The parent may remove flagged content under `BR-parent-content-removal`.

**Related Use Cases:** `UC-SHLF-kid-view-shelf` (invokes this use case from a Finished book); `UC-SHLF-parent-view-shelf` (where the parent reads the reflection); `UC-SHLF-kid-remove-book` (keeps the reflection when the book is removed); `UC-REC-kid-onboarding` (the disclosure this use case relies on)\
**Assumptions:** A child can edit a saved reflection, and the edit replaces it. The reflection is stored for parent review and as a recommender input (see Open Issues).\
**Open Issues:**
- **Admin alert content.** Team position (2026-10-26), for the client to confirm (`OI-15`): the alert in step 6 carries no reflection content and no child details. The admin reads the content, and the flagged child's identifying details, only by opening the entry in `UC-ADM-flag-review`, which records every view (`KD-admin-flag-review`).
- **Detection method.** How violence and self-harm content is detected, its accuracy, and how false positives are handled are not yet decided (`OI-19`).
- **Reporting to authorities.** The client's 2026-09-24 wording says flagged content goes to "parents and authorities." This use case covers only the parent and admin. The rest is `OI-18`.
- **Disclosure wording.** The wording of the onboarding disclosure (`FR-NOTE-disclosure`) is not specified, and no rule in `business-rules.md` governs it.
- **Free text.** Whether reflections stay free text, given that a child can type personal information into them, is `OI-28`.
- **Child notification.** Whether the child is told when their reflection is flagged is not specified.
- **Recommender use.** `FEAT-kid-reflections` and the 2026-09-24 notes say reflections feed the rule-based MVP recommender (`client-interview-2026-09-24.md`, "Initial ideas"). How free text enters a rules engine is not specified (`OI-2`), and any use must stay within `BR-coppa-minimization`.
- **Pending deletion.** The 24-hour pending-deletion window and restore are the client's rule as now described to the team; no source yet confirms the length or the child's restore right. Also undecided: whether a pending-deletion reflection still feeds the recommender during the window.
- **Admin review.** Only an unflagged reflection can enter pending deletion, and the admin reads only flagged content (`UC-ADM-flag-review`), so the admin has no view of pending-deletion reflections. Confirm that no admin review of them is needed.
- **Parent visibility of deletions.** Whether the parent is told when a child deletes a reflection is not specified.

---

### UC-SHLF-parent-remove-book: Remove a Book From a Child's Shelf

**UC ID and Name:** `UC-SHLF-parent-remove-book`: Remove a Book From a Child's Shelf\
**Created By:** _Claude_\
**Date Created:** _2026-10-04_\
**Primary Actor:** A Parent (Main or Sub Parent)\
**Secondary Actors:** A Child (receives an in-app notice that the book was removed)\
**Trigger:** The Parent taps "Remove from shelf" on a book in the child's shelf view.\
**Description:** A parent removes a book from a child's shelf, for example because it is not appropriate. The child is always told the book was removed. Removal and notice happen together, so a removal is never silent. This corresponds to `BR-parent-shelf-removal` and `FEAT-parent-review-dashboard`.

**Preconditions:**

- PRE-1. The Parent is logged in.
- PRE-2. The Parent has a linked child account (`BR-parent-account-linked`), and the book is on that child's shelf.
- PRE-3. The Parent is viewing the child's shelf (`UC-SHLF-parent-view-shelf`).

**Postconditions:**

- POST-1. The shelf entry no longer exists on the child's shelf.
- POST-2. An in-app notice that the book was removed exists for the child and remains until the child sees it.
- POST-3. The removal and the notice were saved together. No removal exists without its notice.

**Main Success Scenario:**

1. The Parent opens a book on the child's shelf.
2. The Parent taps "Remove from shelf."
3. The system asks the Parent to confirm, and states that the child will be told the book was removed.
4. The Parent confirms.
5. The system removes the shelf entry and creates the in-app removal notice for the child, in one save.
6. The system confirms to the Parent that the book was removed. Use case ends.

**Extensions:**

- 3a. The Parent cancels. The system makes no change and no notice is created.
- 3b. The book is no longer on the child's shelf, for example because the child removed it first. The system tells the Parent the book is already off the shelf. No notice is created, since nothing was removed.
- 5a. Saving fails. The system shows an error, leaves the entry on the shelf, and creates no notice. The Parent may retry. Removal and notice are all-or-nothing.
- 5b. The child is not online. The notice stays pending until the child's next session and does not expire.
- 5c. The child's rating and reflection for the book are kept, as in `UC-SHLF-kid-remove-book` and `BR-parent-report-book`. How the parent sees a rating or reflection whose shelf entry is gone is open (see `UC-SHLF-kid-remove-book` Open Issues).

**Priority:** Medium — `BR-parent-shelf-removal` is confirmed, but removal is an occasional correction rather than a routine step.\
**Frequency of Use:** Occasional; a few times per family per month (estimate).\
**Business Rules:** `BR-parent-shelf-removal`, `BR-parent-ultimate-say`, `BR-parent-account-linked`

**Associated Information:**

| Property name  | Data type                       | Validation rule                                                                     | Security or access concerns                                                                          | Glossary reference |
|----------------|---------------------------------|-------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------|--------------------|
| Removal notice | in-app message                  | required whenever a shelf entry is removed by a parent; references the book's title | Visible to the child; wording TBD (see Open Issues); the parent's identity is not shown to the child | —                  |
| Confirmation   | boolean                         | required; the Parent must actively confirm                                          | Parent-set                                                                                           | —                  |
| Removed by     | reference to the parent account | system-set                                                                          | Parent-visible; not visible to the child                                                             | —                  |

Quality attributes: `ROB-no-data-loss` (a failed removal leaves the book on the shelf rather than half-removed); `USE-parent-light` (the parent removes a book in two taps plus confirm).

**Related Use Cases:** `UC-SHLF-parent-view-shelf` (invokes this use case from step 1); `UC-SHLF-kid-remove-book` (the child's counterpart, which does not notify anyone)\
**Assumptions:** The parent does not have to give a reason for removal. No source requires one.\
**Open Issues:**
- Notice wording, and whether the child sees a reason, are not specified (`BR-parent-shelf-removal` requires only that a notice is shown).
- Whether a removed book can be recommended again, for example by a later quiz, is not specified.
- Whether the parent's review under `BR-24hr-review-window` depends on this action is unresolved (`OI-16`).

---

### UC-SHLF-manual-search: Search the Catalog and Request a Shelf Addition

**UC ID and Name:** `UC-SHLF-manual-search`: Search the Catalog and Request a Shelf Addition\
**Created By:** _Claude_\
**Date Created:** _2026-10-04_\
**Primary Actor:** A Child\
**Secondary Actors:** A Parent (approves or declines the child's shelf request)\
**Trigger:** The child taps the search field on their home screen and types a keyword.\
**Description:** A child searches the active catalog by keyword, without using the recommender. The child may ask to put a book they find on their shelf. The book is added only after a linked parent approves the request. This corresponds to `FEAT-manual-search` and to `FEAT-shelf` ("archive books they're interested in"). The approval requirement comes from the client's direction for this feature and does not yet appear in `business-rules.md` (see Open Issues).

**Preconditions:**

- PRE-1. The child is logged in to their child session.
- PRE-2. The catalog contains at least one active book.

**Postconditions:**

- POST-1. The child has seen the search results.
- POST-2. No shelf entry exists for the book unless a parent has approved it.
- POST-3. If approved, the book is on the child's shelf in the category the child requested.
- POST-4. The request and its outcome (pending, approved, declined, or cancelled) are recorded.

**Main Success Scenario:**

1. The child taps the search field and types a keyword.
2. The system matches the keyword against the titles and authors of active books.
3. The system displays the matching books with covers and titles.
4. The child taps a result.
5. The system displays the book's detail page with an "Add to my shelf" action.
6. The child taps "Add to my shelf" and chooses a shelf category (Reading Now, Want to Read, Maybe Later, or Finished).
7. The system records a pending shelf request for the child's linked parents and tells the child it is waiting for a grown-up to approve.
8. A linked parent reviews the request and must either confirm or deny adding the book to the child's shelf.
9. The parent confirms the request. The system adds the book to the child's shelf in the requested category and tells the child in-app. Use case ends.

**Extensions:**

- 1a. The keyword is empty. The system does not search and shows a short prompt to type a word.
- 1b. The keyword is longer than 100 characters. The system shows an inline message and does not search.
- 2a. No active book matches. The system shows a "no books found" message and does not show unrelated books.
- 2b. The search cannot run. The system shows a retry message and no partial results.
- 2c. A blocked book matches. The system omits it (`UC-ADM-block-content`).
- 2d. A book excluded for this child by a parent's report matches. The system omits it (`BR-parent-report-book`, `UC-PAR-report-book`).
- 5a. The book is already on the child's shelf. The system shows its current category and does not create a request.
- 6a. The child already has a pending request for this book. The system shows that it is pending and does not create a duplicate.
- 6b. The child closes the category choice without choosing. No request is created.
- 7a. Recording the request fails. The system shows an error and creates no request; the child may retry.
- 8a. The parent denies the request. No shelf entry is created. The child is told, in neutral wording (TBD), that the book was not added this time. The request is closed.
- 8b. No parent responds. The request stays pending, and the child sees that it is still waiting. No expiry is defined (see Open Issues).
- 8c. The book is blocked after the request was made but before approval. The system does not add it, and the child is told the book is no longer available.
- 9a. Adding the book to the shelf fails. The approval is not committed, the parent sees an error, and the parent may retry.
- 9b. The book was added to the shelf by another route (for example, a recommendation the child accepted) before approval. The system does not create a duplicate and records the request as already satisfied.

**Priority:** Medium — `FEAT-manual-search` is in the MVP per `vision-and-scope.md` §4.3.\
**Frequency of Use:** A few times per week per active child (estimate).\
**Business Rules:** `BR-parent-ultimate-say` (parent authority over which books a child may access), `BR-parent-account-linked`, `BR-parent-report-book` (per-child exclusions)

**Associated Information:**

| Property name      | Data type                                                                    | Validation rule                                                            | Security or access concerns                                                                   | Glossary reference   |
|--------------------|------------------------------------------------------------------------------|----------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------|----------------------|
| Keyword            | string                                                                       | required; trimmed; 1–100 characters                                        | Child-entered; used only for this search                                                      | —                    |
| Shelf request      | record: book reference, requested category, status, requested at, decided by | status is one of pending, approved, declined, cancelled, already satisfied | Visible to the child and linked parents; never visible to the admin (`BR-admin-limited-view`) | Shelf (`FEAT-shelf`) |
| Requested category | enum: Reading Now, Want to Read, Maybe Later, Finished                       | required when requesting                                                   | Child-set; the parent may see it                                                              | —                    |

Search matches standard catalog fields only. Whether custom tags (`UC-ADM-add-content`) are searchable is open.

**Related Use Cases:** `UC-SHLF-kid-view-shelf` (where an approved book appears); `UC-SHLF-kid-move-book` (after the book is added); `UC-REC-kid-review` (the other route onto the shelf); `UC-ADM-block-content` (removes books from results); `UC-SHLF-parent-remove-book` (a parent may remove the book again later)\
**Assumptions:** Approval applies to one request for one book. It does not approve later requests or other books. A child's approved request is not a standing permission.\
**Open Issues:**
- **Parent-side approval** is `UC-PAR-approve-shelf-request` (steps 8–9 and extensions 8a–8c, 9a–9b of this use case, from the parent's side).
- **No business rule yet.** The approval requirement is not in `business-rules.md`. It should be added there, with its source, before this use case is built.
- **Expiry.** Whether a pending request expires, and after how long, is not defined (8b).
- **Decline.** The wording the child sees, whether a decline reason is given, and whether the child may ask again after a decline are not defined (8a).
- **Category choice.** Whether a parent can change the requested category when approving is not defined.
- **Recommendations.** Whether accepted recommendations also need parent approval is not specified. Step 9b assumes they do not.
- **Still planned?** The 2026-09-25 flowchart does not show `FEAT-manual-search`. Confirm it is still in the MVP.

---

## [ADM] Admin Feature Area

_The system admin operates the catalog and the system and receives safety alerts. The admin sees no child's details except in flagged-content review: the admin may see parent credentials and the number of child accounts under each parent (`BR-admin-limited-view`), and `UC-ADM-flag-review` is the one exception, with every view recorded. That exception is the team's position (2026-10-26, `KD-admin-flag-review`) and still needs the client's confirmation (`OI-15`). Admin account creation (`UC-ADM-add-admin`) is post-MVP and not written here._

### UC-ADM-add-content: Add a Book to the Seed Catalog

**UC ID and Name:** `UC-ADM-add-content`: Add a Book to the Seed Catalog\
**Created By:** _Claude_\
**Date Created:** _2026-10-04_\
**Primary Actor:** A System Admin\
**Secondary Actors:** none\
**Trigger:** The admin taps "Add Book" in catalog management.\
**Description:** An admin adds one book, with its tags, to the seed catalog so the recommender can offer it. Bulk loading from the approved dataset is a separate import (`SI-book-dataset`) and is not covered here. This corresponds to `FEAT-book-tagging` and `FR-ADM-catalog`.

**Preconditions:**

- PRE-1. The admin is logged in with the admin role.
- PRE-2. No catalog book has the same ISBN, or the same title and author, as the book being added.

**Postconditions:**

- POST-1. The book is in the catalog with all its tags saved.
- POST-2. The book is eligible for recommendation only once it has its required tags (see 6b).

**Main Success Scenario:**

1. The admin taps "Add Book."
2. The system displays the book form: title, author, ISBN, tag fields for genre, mood, format, themes, length, age fit, and reading level, and a custom tag field that offers the existing custom tags and lets the admin type a new one.
3. The admin enters the book's details, chooses standard tags, and adds custom tags by choosing an existing custom tag or typing a new one.
4. The system validates the required fields, checks each standard tag value against its approved list, and normalizes each custom tag (trims spaces and ignores letter case).
5. The system checks that the book is not already in the catalog.
6. The system saves the book.
7. The system shows the book in the catalog list. Use case ends.

**Extensions:**

- 3a. The admin cancels. No book is saved.
- 4a. A required field is empty. The system shows an inline error and returns to step 3.
- 4b. A standard tag value is not on its approved list. The system rejects the value, names the list, and returns to step 3. Custom tags are not checked against the approved list.
- 4d. A new custom tag matches an existing custom tag after normalization (for example, "Friend" and "friends" if the normalization treats them as one). The system offers the existing tag instead of creating a new one.
- 4e. A custom tag is empty or longer than the length limit (team proposal: 30 characters). The system shows an inline error and returns to step 3.
- 4c. The reading level is not on an accepted scale (Lexile, AR/ATOS, DRA, Guided Reading Level, or a grade-level range). The system shows an inline error and returns to step 3.
- 5a. A matching book already exists. The system shows the existing entry and offers to open it instead. No new record is created.
- 6a. Saving fails. The system shows an error and saves nothing; no partial book is left behind.
- 6b. The book is saved without all required tags. The system saves it as not yet recommendable, so no child is offered a book that lacks the tags the rules engine needs (team proposal; the required tag set is TBD).

**Priority:** Medium — `FEAT-book-tagging` is in the MVP per `vision-and-scope.md` v0.4. Building it is blocked until the seed-catalog source and tag lists are settled (`OI-1`).\
**Frequency of Use:** Heavy during the initial catalog load of about 30–50 books, then occasional.\
**Business Rules:** None in `business-rules.md` governs catalog content directly. Age-appropriate catalog content is required by `SAF-child-content` in the SRS.

**Associated Information:**

| Property name                                                               | Data type                    | Validation rule                                                                                                              | Security or access concerns                                                | Glossary reference |
|-----------------------------------------------------------------------------|------------------------------|------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------|--------------------|
| Title                                                                       | string                       | required                                                                                                                     | Admin-set; visible to children and parents                                 | Seed Catalog       |
| Author                                                                      | string                       | required                                                                                                                     | Admin-set; visible to children and parents                                 | Seed Catalog       |
| ISBN                                                                        | string                       | optional; must be a valid ISBN-10 or ISBN-13 when given (team proposal)                                                      | Admin-set                                                                  | —                  |
| Standard tags (genre, mood, format, themes, length, age fit, reading level) | enum each                    | each value must come from its approved list; lists TBD (`OI-1`)                                                              | Admin-set; used by the recommender                                         | —                  |
| Custom tags                                                                 | list of strings              | optional; each entry trimmed and case-normalized; 1–30 characters; must not duplicate an existing custom tag (team proposal) | Admin-created; shared across the catalog; whether children see them is TBD | —                  |
| Catalog status                                                              | enum: draft, active, blocked | system-set; new books are draft until tagged, then active                                                                    | Admin-visible; see `UC-ADM-block-content`                                  | —                  |

Only the admin role may write catalog data (`SEC-role-authorization`). A failed save leaves the catalog unchanged.

**Related Use Cases:** `UC-ADM-block-content` (the reverse action); `UC-PAR-suggest-book` (requires the book to exist in the catalog); `UC-REC-recommend-quiz-rules` (draws only from active, tagged books)\
**Assumptions:** The seed catalog is loaded in bulk from the approved dataset, and this use case handles single additions and corrections of new entries only. Custom tags are free-form labels for the admin's own use. They are shared across the catalog, they do not replace standard tags, and the rules engine does not use them unless the client says so.\
**Open Issues:**
- The catalog's source dataset is not chosen (`OI-1`), so there is no approved tag list to validate against.
- Whether custom tags such as "Cute," "Scary but Warming," and "Friends" are shown to children, used by the rules-based recommender, or used only for admin browsing is not specified.
- Who may create custom tags, rename them, or delete them is not specified. This use case allows any admin to create one.
- The normalization rule (case, spacing, and whether plurals such as "Friend" and "Friends" are merged) and the 30-character limit are team proposals that need client input.
- Editing an existing book's details and tags is `UC-ADM-edit-content`.
- Whether ISBN is required for de-duplication is a team proposal.

---

### UC-ADM-edit-content: Edit a Catalog Book

**UC ID and Name:** `UC-ADM-edit-content`: Edit a Catalog Book\
**Created By:** _Claude_\
**Date Created:** _2026-10-26_\
**Primary Actor:** A System Admin\
**Secondary Actors:** none\
**Trigger:** The admin opens a book in catalog management and taps "Edit."\
**Description:** An admin corrects or completes a catalog book's details and tags, whether it came from the bulk import or from `UC-ADM-add-content`. Supplying a draft book's missing tags is how it becomes recommendable. This corresponds to `FEAT-admin-catalog` and `FEAT-book-tagging`.

**Preconditions:**

- PRE-1. The admin is logged in with the admin role.
- PRE-2. The book exists in the catalog.

**Postconditions:**

- POST-1. The book's details and tags are the edited values, with the admin and the time recorded.
- POST-2. The book's status matches its tags: a draft book with all required tags becomes active, and an active book that loses a required tag returns to draft. A blocked book stays blocked.
- POST-3. Shelf entries, ratings, reflections and per-child exclusions that refer to the book are unchanged; they refer to the book, not to its details.
- POST-4. The edit is recorded in the audit log (architecture §8.2.9).

**Main Success Scenario:**

1. The admin opens a book and taps "Edit."
2. The system displays the same form as `UC-ADM-add-content`, filled in with the book's current title, author, ISBN, standard tags and custom tags, and shows its status.
3. The admin changes one or more values.
4. The system validates them as in `UC-ADM-add-content` steps 4–5: required fields, standard tags against their approved lists, normalized custom tags, and no duplicate of another book.
5. The system saves the changes and sets the status by POST-2.
6. The system shows the updated book and its status. Use case ends.

**Extensions:**

- 3a. The admin cancels. No change.
- 4a. A value fails validation. The system shows the error as in `UC-ADM-add-content` 4a–4e and returns to step 3.
- 4b. The changed title and author, or the ISBN, now match another catalog book. The system shows that book and does not save; merging duplicates is not covered.
- 4c. The edit removes a required tag from an active book. The system warns that the book will return to draft and stop appearing in recommendations and search until the tag is supplied, and asks the admin to confirm.
- 5a. Another admin changed the book after this form was opened. The system shows the newer values and does not overwrite them; the admin may edit again.
- 5b. Saving fails. The book is unchanged; the system shows an error and the admin may retry.

**Priority:** Medium — imported data will need correcting, and draft books cannot be recommended until tagged.\
**Frequency of Use:** Occasional; heavier just after the seed import.\
**Business Rules:** None in `business-rules.md` governs catalog content directly. Age-appropriate catalog content is required by `SAF-child-content` in the SRS.

**Associated Information:**

Fields and validation are those of `UC-ADM-add-content`, plus:

| Property name   | Data type                      | Validation rule | Security or access concerns | Glossary reference |
|-----------------|--------------------------------|-----------------|-----------------------------|--------------------|
| Last edited by  | reference to the admin account | system-set      | Admin-visible only          | —                  |
| Last edited at  | timestamp                      | system-set      | Admin-visible only          | —                  |

A change to a book's tags affects only future recommendations. Batches already generated are not recomputed.

**Related Use Cases:** `UC-ADM-add-content` (the form and its rules); `UC-ADM-block-content` and `UC-ADM-unblock-content` (the other status changes); `UC-ADM-view-audit-log` (where edits are recorded)\
**Assumptions:** Status follows the tags automatically; the admin cannot set a book active by hand. Editing a blocked book does not unblock it.\
**Open Issues:**
- Whether the next catalog import may overwrite an admin's edits is not specified (`KD-catalog-import-offline`).
- Renaming or deleting a custom tag across the whole catalog is not covered (`UC-ADM-add-content` Open Issues).

---

### UC-ADM-block-content: Block a Catalog Book

**UC ID and Name:** `UC-ADM-block-content`: Block a Catalog Book\
**Created By:** _Claude_\
**Date Created:** _2026-10-04_\
**Primary Actor:** A System Admin\
**Secondary Actors:** none\
**Trigger:** The admin opens the list of reported books, or taps "Block book" on a catalog book.\
**Description:** An admin removes a catalog book from every child's view and from every recommendation list. This is the admin's content-safety control under `SAF-child-content`. Parents' reports (`UC-PAR-report-book`) arrive in a list of reported books, where the admin can block a book or discard its reports with one tap and a confirmation. The admin may also open any book in the catalog and block it without going through the list. If a single report looks false, the admin can warn that parent not to send false reports. Blocking deletes every child's rating and reflection for the book, and the admin is told so before confirming.

**Preconditions:**

- PRE-1. The admin is logged in with the admin role.
- PRE-2. The book exists in the catalog and is not already blocked.
- PRE-3. For the list path, at least one open report exists for the book.

**Postconditions:**

- POST-1. If blocked: the book's status is blocked, with the reason, the admin, and the time recorded.
- POST-2. If blocked: the book does not appear in any recommendation, quiz result, or keyword search result (`FEAT-manual-search`), and is removed from every child's recommendation list.
- POST-3. If blocked: every shelf entry for the book is removed, and every child's rating and reflection for it is deleted.
- POST-4. If blocked from the list: every open report for the book is marked blocked.
- POST-5. If discarded: the open reports for the book are marked discarded and the book stays in the catalog. The per-child exclusions that parents created are not changed.
- POST-6. If a parent was warned: that report is marked discarded, the parent has an in-app warning, and the book's other reports are unchanged.

**Main Success Scenario:**

1. The admin opens the list of reported books.
2. The system displays every book with at least one open report, newest first. Each row shows the title, the number of open reports, and the reasons given. It shows no child or parent name.
3. The admin selects a book and reads its reports: the reasons, any comments, and the opaque account references.
4. The admin taps "Block book" on the row or on the book's page.
5. The system tells the admin that blocking deletes every child's rating and reflection for this book and removes it from every shelf, shows how many shelf entries, ratings, and reflections are affected, and asks the admin to choose a reason and confirm.
6. The admin chooses a reason and confirms.
7. The system sets the book to blocked, removes it from recommendation lists and search results, deletes the shelf entries, ratings, and reflections, and marks the book's open reports as blocked, in one save.
8. The system shows the book as blocked and returns the admin to the list. Use case ends.

**Extensions:**

- 1a. The admin does not use the list and opens a book in the catalog instead. The admin taps "Block book" there. The flow continues at step 5, with no report to mark, and the list is not changed.
- 2a. There are no open reports. The system shows an empty-list message.
- 3a. The admin judges one report to be false and taps "Warn parent" on it. The system asks the admin to confirm. On confirm, the system sends that parent an in-app warning that false reports are not allowed and may lead to the account being suspended, marks that report discarded, and returns the admin to the book's other reports. If the admin cancels, no change is made. The warning does not say whether the book was blocked. Any suspension is a separate, manual choice under `UC-ADM-suspend-parent-account`.
- 4a. The admin taps "Discard reports" instead. The system asks the admin to confirm that the reports do not justify blocking the book. On confirm, the system marks the book's open reports as discarded, keeps the book in the catalog, and returns the admin to the list. If the admin cancels, no change is made. Use case ends.
- 4b. The book is already blocked, for example by another admin. The system shows its status and the recorded reason and marks the open reports blocked; no other change.
- 5a. The admin cancels. No change; the report stays open.
- 6a. No reason is chosen. The system does not allow confirmation.
- 7a. Removing the book from lists, shelves, or ratings fails part way. The system does not commit the block, shows an error, and the admin may retry. The book is never left half-blocked.
- 7b. A child has the book open when it is blocked. The book is hidden the next time the child's screen loads; the system does not force-close the child's session.
- 7c. A reflection the block would delete is safety-flagged. In the same save, the system first copies it to the dangerous content list with its flag category, then deletes it with the rest; an entry already on the list is not changed. Team decision 2026-10-15, for the client to confirm (`OI-24`).

**Priority:** High — this is the admin's safety control over what children see.\
**Frequency of Use:** Rare; only when content is reported or an error is found.\
**Business Rules:** `BR-parent-report-book` (the list of reported books); required by `SAF-child-content` in the SRS.

**Associated Information:**

| Property name        | Data type                                                                   | Validation rule                                                                             | Security or access concerns                                                                                     | Glossary reference |
|----------------------|-----------------------------------------------------------------------------|---------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------|--------------------|
| Catalog status       | enum: draft, active, blocked                                                | required; changed only by this use case or its reverse                                      | Admin-visible only                                                                                              | —                  |
| Block reason         | enum: age-inappropriate, content concern, data error, other (team proposal) | required when blocking                                                                      | Admin-visible only; never shown to children                                                                     | —                  |
| Blocked by           | reference to the admin account                                              | system-set                                                                                  | Admin-visible only                                                                                              | —                  |
| Blocked at           | timestamp                                                                   | system-set                                                                                  | Admin-visible only                                                                                              | —                  |
| Reported book        | catalog book with its open reports                                          | system-set; one row per book, not per report                                                | Admin-only; no child or parent name; account references are opaque (`BR-admin-limited-view`)                    | —                  |
| Report status        | enum: open, blocked, discarded                                              | set only by blocking, discarding, or warning, each with confirmation                        | Admin-visible; a discarded report does not undo any parent's per-child exclusion                                | —                  |
| False-report warning | in-app message                                                              | sent only by the admin, one report at a time; fixed wording; never names the book's outcome | Visible to the reporting parent only; the admin sees the account only as an opaque reference                    | —                  |
| Affected counts      | integers: shelf entries, ratings, reflections                               | system-computed before confirmation                                                         | Admin-only; shown only as numbers, never the child's content                                                    | —                  |

**Related Use Cases:** `UC-PAR-report-book` (creates the reports in the list); `UC-ADM-suspend-parent-account` (the admin's manual punishment for a repeated false report); `UC-ADM-add-content` (the book was added there); `UC-SHLF-kid-view-shelf` and `UC-SHLF-parent-view-shelf` (how a blocked book appears); `UC-SHLF-kid-rate-book` and `UC-SHLF-kid-add-note` (the ratings and reflections deleted by a block); `UC-REC-recommend-quiz-rules` (no longer offers blocked books)\
**Assumptions:** Blocking is reversed by `UC-ADM-unblock-content`, which does not bring back what the block deleted. Discarding a report closes it in the list only; it does not give the book back to the child it was reported for. Neither the child nor the parent is told when a block deletes a rating or reflection. The reporting parent is not told whether a report was acted on, except for the false-report warning.\
**Open Issues:**
- The reason list is a team proposal and needs client input.
- Keeping a flagged reflection on a block (7c) is a team decision awaiting the client (`OI-24`). The retention statements in `UC-SHLF-kid-remove-book` and `UC-SHLF-kid-add-note` cover the child's own removal and deletion, not a block.
- Unblocking is `UC-ADM-unblock-content`.
- When a Sub Parent's report is warned about, whether the Main Parent also gets the warning is not specified.
- The warning's exact wording and whether a count of warnings leads to suspension are not specified.

---

### UC-ADM-unblock-content: Unblock a Catalog Book

**UC ID and Name:** `UC-ADM-unblock-content`: Unblock a Catalog Book\
**Created By:** _Claude_\
**Date Created:** _2026-10-26_\
**Primary Actor:** A System Admin\
**Secondary Actors:** none\
**Trigger:** The admin opens the list of blocked books and taps "Unblock" on one.\
**Description:** An admin reverses a block, for example one made in error, so the book can be recommended and found in search again. Unblocking does not bring back what the block deleted, and it never overrides a parent's per-child exclusion. This is the reverse of `UC-ADM-block-content` and corresponds to `FEAT-admin-catalog`.

**Preconditions:**

- PRE-1. The admin is logged in with the admin role.
- PRE-2. The book exists in the catalog and is blocked.

**Postconditions:**

- POST-1. The book's status is active, or draft if it lacks the required tags (`UC-ADM-add-content` 6b), with the reason, the admin and the time recorded. The block's own record is kept.
- POST-2. The book can appear in new recommendations and search results again, except for children with a per-child exclusion for it (`BR-parent-report-book`).
- POST-3. The shelf entries, ratings and reflections the block deleted stay deleted, and the reports it closed stay closed.
- POST-4. Dangerous content list entries made when the book was blocked are unchanged.

**Main Success Scenario:**

1. The admin opens the list of blocked books.
2. The system lists the blocked books, newest first, each with its title, block reason and block date.
3. The admin selects a book and taps "Unblock."
4. The system states what unblocking does and does not do (POST-2 and POST-3), and asks for a reason and confirmation.
5. The admin chooses a reason and confirms.
6. The system sets the book's status and records the unblock, in one save.
7. The system shows the book as active, or as draft with the missing tags named, and returns to the list. Use case ends.

**Extensions:**

- 2a. No book is blocked. The system shows an empty-list message.
- 5a. The admin cancels. No change.
- 5b. No reason is chosen. The system does not allow confirmation.
- 6a. Another admin unblocked the book first. The system shows its current status and makes no change.
- 6b. Saving fails. The book stays blocked; the system shows an error and the admin may retry.

**Priority:** Low — corrects an admin error; children are safe while a book stays blocked.\
**Frequency of Use:** Rare.\
**Business Rules:** `BR-parent-report-book` (per-child exclusions survive an unblock)

**Associated Information:**

| Property name  | Data type                                                | Validation rule        | Security or access concerns              | Glossary reference |
|----------------|----------------------------------------------------------|------------------------|------------------------------------------|--------------------|
| Unblock reason | enum: blocked in error, content re-reviewed, other (team proposal) | required when unblocking | Admin-visible only                 | —                  |
| Unblocked by   | reference to the admin account                           | system-set             | Admin-visible only                       | —                  |
| Unblocked at   | timestamp                                                | system-set             | Admin-visible only                       | —                  |

**Related Use Cases:** `UC-ADM-block-content` (the reverse); `UC-ADM-add-content` (the required tags); `UC-REC-recommend-quiz-rules` and `UC-SHLF-manual-search` (offer the book again)\
**Assumptions:** No parent or child is told about an unblock, as no one is told about a block (`BR-parent-report-book`).\
**Open Issues:**
- The reason list is a team proposal.
- Whether a book blocked because of parent reports may be unblocked at all, and whether anyone else must agree, is not specified.

---

### UC-ADM-suspend-account: Suspend a Child Account

**UC ID and Name:** `UC-ADM-suspend-account`: Suspend a Child Account\
**Created By:** _Claude_\
**Date Created:** _2026-10-04_\
**Primary Actor:** A System Admin\
**Secondary Actors:** A Parent (is notified of the suspension)\
**Trigger:** The admin taps "Suspend account" on a child account.\
**Description:** An admin suspends a child's account so the child can no longer sign in or request recommendations, while keeping the account's data. The admin has the authority to suspend accounts (team decision, 2026-10-26: the client is, in practice, the system admin). The suspension that follows a flagged reflection is covered by `UC-ADM-flag-review`; this use case is a suspension on any other ground. The automatic 24-hour review suspension (`BR-24hr-review-window`) is unconfirmed (`OI-16`) and is not part of this use case.

**Preconditions:**

- PRE-1. The admin is logged in with the admin role.
- PRE-2. The child account exists and is active.

**Postconditions:**

- POST-1. The child account's status is suspended, with the reason, the admin, and the time recorded.
- POST-2. The child cannot start a child session or request recommendations while suspended.
- POST-3. The child's data is kept; suspension does not delete anything.
- POST-4. The parent has been notified that the account is suspended.

**Main Success Scenario:**

1. The admin finds the account by its account reference, or by the parent's name, username or email. The admin does not see the child's name, age, or grade (`BR-admin-limited-view`).
2. The admin taps "Suspend account."
3. The system asks the admin to choose a reason and to confirm.
4. The admin chooses a reason and confirms.
5. The system sets the account to suspended and ends the child's active sessions.
6. The system notifies the parent in-app that the account is suspended.
7. The system shows the account as suspended to the admin. Use case ends.

**Extensions:**

- 1a. No account matches the reference. The system shows a not-found message.
- 2a. The account is already suspended. The system shows its status; no change.
- 4a. The admin cancels. No change.
- 5a. Ending active sessions fails. The suspension is kept, because blocking new sign-ins is the control that matters. The system retries ending the sessions and shows the admin that retry is pending.
- 6a. The parent notification cannot be sent. The system retries it and keeps the suspension in place.

**Priority:** Medium — the admin's authority is settled; the list of grounds is still a team proposal (see Open Issues).\
**Frequency of Use:** Rare.\
**Business Rules:** `BR-24hr-review-window` (flagged for reconfirmation; applies only if it stands), `BR-admin-limited-view`

**Associated Information:**

| Property name     | Data type                                                                              | Validation rule                                        | Security or access concerns                             | Glossary reference |
|-------------------|----------------------------------------------------------------------------------------|--------------------------------------------------------|---------------------------------------------------------|--------------------|
| Account status    | enum: active, suspended                                                                | required; changed only by this use case or its reverse | Admin-visible; parent-visible                           | —                  |
| Suspension reason | enum: safety flag, review non-compliance, multiple spam reports, other (team proposal) | required when suspending                               | Admin-visible; parent-visible                           | —                  |
| Account reference | opaque identifier                                                                      | required; never derived from the child's name          | Admin-visible; the only child identifier the admin sees | —                  |

**Related Use Cases:** `UC-ADM-reinstate-account` (the reverse action); `UC-ADM-flag-review` (the suspension that follows a flagged reflection); `UC-ADM-block-content` (the other admin control); `UC-REC-parent-review` (a suspended child receives no recommendations)\
**Assumptions:** Suspension is not deletion; the child's data stays on record. Reinstatement is `UC-ADM-reinstate-account`.\
**Open Issues:**
- **Grounds:** The reason list is a team proposal. Whether an unreviewed 24-hour window can suspend an account depends on `OI-16`.
- **Parent accounts:** suspending a parent account, for example for repeated false reports, is `UC-ADM-suspend-parent-account`.
- **Notification channel:** in-app only. The 2026-09-24 notes rule out SMS and push for the web app (`client-interview-2026-09-24.md` §5; `CI-in-app-alerts`).

---

### UC-ADM-suspend-parent-account: Suspend a Parent Account

**UC ID and Name:** `UC-ADM-suspend-parent-account`: Suspend a Parent Account\
**Created By:** _Claude_\
**Date Created:** _2026-10-26_\
**Primary Actor:** A System Admin\
**Secondary Actors:** A Parent (the suspended Main or Sub Parent, who is notified); the family's other parent, if any (is notified)\
**Trigger:** The admin taps "Suspend parent account" on a parent account, usually from a reported book after warning that parent about false reports (`UC-ADM-block-content` 3a).\
**Description:** An admin suspends a Main or Sub Parent account so that parent can no longer sign in, for example after repeated false book reports, which `BR-parent-report-book` says may be punished. The admin has the authority to suspend accounts (team decision 2026-10-26). The family's children keep their accounts. This corresponds to `FEAT-parent-book-report`.

**Preconditions:**

- PRE-1. The admin is logged in with the admin role.
- PRE-2. The parent account exists and is active.

**Postconditions:**

- POST-1. The parent account's status is suspended, with the reason, the admin and the time recorded.
- POST-2. The parent's sessions are ended, and the parent cannot sign in while suspended.
- POST-3. The family's child accounts, their data, and the family's other parent account are unchanged.
- POST-4. The suspended parent, and the family's other parent if there is one, have an in-app notice. The suspended parent's notice is shown on their next sign-in attempt.
- POST-5. The suspension is recorded in the audit log (architecture §8.2.9).

**Main Success Scenario:**

1. The admin finds the parent account by its account reference, or by the parent's name, username or email (`BR-admin-limited-view`).
2. The system shows the account's status, whether it is a Main or Sub Parent, the number of child accounts in the family, and the false-report warnings already sent to it.
3. The admin taps "Suspend parent account."
4. The system asks the admin to choose a reason and confirm, and states that the family's children keep their accounts.
5. The admin chooses a reason and confirms.
6. The system sets the parent account to suspended and ends its sessions, in one save, and records the suspension.
7. The system creates the in-app notices.
8. The system shows the account as suspended to the admin. Use case ends.

**Extensions:**

- 1a. No account matches. The system shows a not-found message.
- 2a. The account is already suspended. The system shows its status; no change.
- 4a. The parent is the Main Parent and the family has no Sub Parent. The system warns the admin that no parent will be able to sign in, so no one can review the children's shelves or receive safety alerts in the app until reinstatement; the admin must confirm again (team proposal).
- 5a. The admin cancels. No change.
- 5b. No reason is chosen. The system does not allow confirmation.
- 6a. Ending the sessions fails. The suspension is kept, because blocking new sign-ins is the control that matters; the system retries ending the sessions.
- 6b. Saving fails. The account stays active; the system shows an error and the admin may retry.
- 7a. A notice cannot be saved. The suspension stands, and the system retries the notice.

**Priority:** Low — the punishment for repeated false reports; reports are rare.\
**Frequency of Use:** Rare.\
**Business Rules:** `BR-parent-report-book` (false reports may be punished), `BR-admin-limited-view`, `BR-parent-account-structure`

**Associated Information:**

| Property name     | Data type                                                       | Validation rule                                   | Security or access concerns                                        | Glossary reference |
|-------------------|-----------------------------------------------------------------|---------------------------------------------------|--------------------------------------------------------------------|--------------------|
| Account status    | enum: active, suspended                                         | changed only by this use case and `UC-ADM-reinstate-account` | Admin-visible; visible to the family's parents          | —                  |
| Suspension reason | enum: repeated false reports, misuse, other (team proposal)     | required when suspending                          | Admin-visible; shown to the suspended parent                       | —                  |
| Warning history   | count and dates of false-report warnings                        | system-computed from `UC-ADM-block-content` 3a    | Admin-visible only                                                 | —                  |

**Related Use Cases:** `UC-ADM-block-content` (the false-report warning that usually comes first); `UC-PAR-report-book` (the reports); `UC-ADM-reinstate-account` (the reverse); `UC-ADM-suspend-account` (suspends a child account instead)\
**Assumptions:** The children's accounts stay active while a parent is suspended, and safety flags still reach the admin. A Sub Parent's suspension does not affect the Main Parent.\
**Open Issues:**
- **Children while the only parent is suspended.** Whether the children should stay active when no parent can sign in (4a) is a team proposal for the client. Leaving them active keeps their access; it also leaves no parent able to act on a safety alert.
- How many false reports justify a suspension, and whether the admin must warn first, is not specified (`UC-ADM-block-content` Open Issues).

---

### UC-ADM-reinstate-account: Reinstate a Suspended Account

**UC ID and Name:** `UC-ADM-reinstate-account`: Reinstate a Suspended Account\
**Created By:** _Claude_\
**Date Created:** _2026-10-26_\
**Primary Actor:** A System Admin\
**Secondary Actors:** A Parent (is notified of the reinstatement)\
**Trigger:** The admin taps "Reinstate account" on a suspended child or parent account.\
**Description:** An admin ends a suspension, so the child or parent can sign in and use BookBuddies again with the same account and data. This is the reverse of `UC-ADM-suspend-account`, of the suspension in `UC-ADM-flag-review`, and of `UC-ADM-suspend-parent-account`, and corresponds to `FEAT-flag-review`.

**Preconditions:**

- PRE-1. The admin is logged in with the admin role.
- PRE-2. The child or parent account exists and is suspended. A child account whose consent the parent revoked is not suspended and cannot be reinstated here (`UC-PAR-revoke-consent`).

**Postconditions:**

- POST-1. The account's status is active, with the reason, the admin and the time recorded. The suspension's own record is kept.
- POST-2. The child or parent can sign in with their existing username and password.
- POST-3. The family's parents have an in-app notice that the account is active again.
- POST-4. Any dangerous content list entry from the suspension is unchanged.

**Main Success Scenario:**

1. The admin finds the account by its account reference, or by the parent's name, username or email. For a child account, the admin does not see the child's name, age or grade (`BR-admin-limited-view`).
2. The system shows the account status, the suspension reason and its date.
3. The admin taps "Reinstate account."
4. The system asks the admin to choose a reason and confirm.
5. The admin chooses a reason and confirms.
6. The system sets the account to active and records the reinstatement.
7. The system notifies the parent in-app.
8. The system shows the account as active to the admin. Use case ends.

**Extensions:**

- 1a. No account matches. The system shows a not-found message.
- 2a. The account is not suspended. The system shows its status and does not offer "Reinstate account."
- 2b. The suspension came from `UC-ADM-flag-review` with the content marked as breaking the law and for escalation. The system warns the admin that the escalation is still marked open (`OI-18`) and asks for a second confirmation (team proposal).
- 5a. The admin cancels. No change.
- 5b. No reason is chosen. The system does not allow confirmation.
- 6a. Saving fails. The account stays suspended; the system shows an error and the admin may retry.
- 7a. The parent notice cannot be saved. The reinstatement stands, and the system retries the notice.

**Priority:** Medium — without it, any suspension is permanent.\
**Frequency of Use:** Rare.\
**Business Rules:** `BR-admin-limited-view`

**Associated Information:**

| Property name        | Data type                                                       | Validation rule              | Security or access concerns     | Glossary reference |
|----------------------|-----------------------------------------------------------------|------------------------------|---------------------------------|--------------------|
| Account status       | enum: active, suspended                                         | changed only by `UC-ADM-suspend-account`, `UC-ADM-flag-review`, `UC-ADM-suspend-parent-account` and this use case | Admin-visible; parent-visible | —                  |
| Reinstatement reason | enum: suspension in error, issue resolved with the parent, other (team proposal) | required | Admin-visible; parent-visible     | —                  |

**Related Use Cases:** `UC-ADM-suspend-account`, `UC-ADM-flag-review` and `UC-ADM-suspend-parent-account` (the suspensions this reverses); `UC-PAR-revoke-consent` (a different state the admin cannot reverse)\
**Assumptions:** Reinstatement keeps the account's existing password. For a child, a parent who wants a new one resets it (`OI-26`).\
**Open Issues:**
- Whether a parent can ask for reinstatement in the app, and whether the admin must speak with the parent first, is not specified.
- The reason list is a team proposal.

---

### UC-ADM-view-recommender-stats: View Recommender Statistics

**UC ID and Name:** `UC-ADM-view-recommender-stats`: View Recommender Statistics\
**Created By:** _Claude_\
**Date Created:** _2026-10-04_\
**Primary Actor:** A System Admin\
**Secondary Actors:** none\
**Trigger:** The admin opens the recommender statistics page.\
**Description:** An admin sees aggregate figures on how the recommender is performing, such as how many quiz requests were made and how often recommendations were accepted, deferred, or declined. The admin sees totals only, never a per-child row. The contents are not yet decided (SRS §7.3).

**Preconditions:**

- PRE-1. The admin is logged in with the admin role.

**Postconditions:**

- POST-1. The aggregate figures for the chosen date range have been displayed.
- POST-2. No data has been changed.

**Main Success Scenario:**

1. The admin opens recommender statistics.
2. The system selects the last 30 days as the default date range (team proposal).
3. The system computes the aggregate figures from stored requests and reactions.
4. The system displays each figure with its date range.
5. The admin changes the date range, and the system recomputes the figures. Use case ends when the admin leaves the page.

**Extensions:**

- 3a. There is no data in the date range. The system shows an empty-state message, not zeros presented as results.
- 3b. A figure would describe fewer than 5 children (team proposal for a small-cell threshold). The system shows "not enough data" for that figure, so a single child cannot be identified from it.
- 3c. The computation fails. The system shows an error and no partial figures.
- 5a. The admin enters an invalid range, such as an end date before the start date. The system rejects it and keeps the previous range.

**Priority:** Low — useful for the team and client, not needed for a child or parent to use the product.\
**Frequency of Use:** Occasional; about once a week per admin (estimate).\
**Business Rules:** `BR-admin-limited-view`

**Associated Information:**

| Property name        | Data type           | Validation rule                                      | Security or access concerns                              | Glossary reference |
|----------------------|---------------------|------------------------------------------------------|----------------------------------------------------------|--------------------|
| Date range           | start and end dates | required; end not before start                       | Admin-only                                               | —                  |
| Aggregate figures    | counts and rates    | each figure must meet the small-cell threshold in 3b | Admin-only; no child identifiers, names, ages, or grades | Recommender        |
| Small-cell threshold | integer             | 5 (team proposal; client to confirm)                 | Not shown to the admin                                   | —                  |

The figure list is TBD (SRS §7.3). The AI-mode figures are post-MVP.

**Related Use Cases:** `UC-ADM-view-usage-stats` (sister page); `UC-REC-recommend-quiz-rules` and `UC-REC-kid-review` (the source of the figures)\
**Assumptions:** The figures are computed from stored data on demand and do not need a live feed.\
**Open Issues:**
- The figure list and the small-cell threshold need client input.
- Whether book-level figures (for example, how often a book is declined across all children) are acceptable under `BR-admin-limited-view` is undecided.

---

### UC-ADM-view-usage-stats: View Usage Statistics

**UC ID and Name:** `UC-ADM-view-usage-stats`: View Usage Statistics\
**Created By:** _Claude_\
**Date Created:** _2026-10-04_\
**Primary Actor:** A System Admin\
**Secondary Actors:** none\
**Trigger:** The admin opens the usage statistics page.\
**Description:** An admin sees aggregate usage figures for the system, such as the number of parent accounts, the number of child accounts per parent, and how many accounts were active in a period. The admin sees totals only. Contents are not yet decided (SRS §7.3).

**Preconditions:**

- PRE-1. The admin is logged in with the admin role.

**Postconditions:**

- POST-1. The aggregate figures for the chosen date range have been displayed.
- POST-2. No data has been changed.

**Main Success Scenario:**

1. The admin opens usage statistics.
2. The system selects the last 30 days as the default date range (team proposal).
3. The system computes the figures from stored account and activity records.
4. The system displays each figure with its date range.
5. The admin changes the date range, and the system recomputes the figures. Use case ends when the admin leaves the page.

**Extensions:**

- 3a. There is no data in the date range. The system shows an empty-state message.
- 3b. A figure would describe fewer than 5 accounts (team proposal). The system shows "not enough data" for that figure.
- 3c. The computation fails. The system shows an error and no partial figures.
- 5a. The admin enters an invalid range. The system rejects it and keeps the previous range.

**Priority:** Low — needed for operating the system, not for the child or parent experience.\
**Frequency of Use:** Occasional; about once a week per admin (estimate).\
**Business Rules:** `BR-admin-limited-view` (the admin may see the number of child accounts under each parent, and nothing else about a child)

**Associated Information:**

| Property name         | Data type           | Validation rule                                                | Security or access concerns                       | Glossary reference |
|-----------------------|---------------------|----------------------------------------------------------------|---------------------------------------------------|--------------------|
| Date range            | start and end dates | required; end not before start                                 | Admin-only                                        | —                  |
| Account counts        | integers            | parent accounts overall; child accounts per parent             | Admin-only; parent credentials are not shown here | —                  |
| Active account counts | integers            | a figure below 5 is shown as "not enough data" (team proposal) | Admin-only                                        | —                  |

**Related Use Cases:** `UC-ADM-view-recommender-stats` (sister page); `UC-PAR-onboarding` and `UC-PAR-create-kid-account` (the source of account records)\
**Assumptions:** "Active" means a session in the date range; the definition is a team proposal.\
**Open Issues:**
- The figure list, and the definition of "active," need client input.
- The success metrics in `vision-and-scope.md` §2.3 have no targets yet, so this page has no thresholds to report against.

---

### UC-ADM-view-audit-log: View the Audit Log

**UC ID and Name:** `UC-ADM-view-audit-log`: View the Audit Log\
**Created By:** _Claude_\
**Date Created:** _2026-10-26_\
**Primary Actor:** A System Admin\
**Secondary Actors:** none\
**Trigger:** The admin opens the audit log.\
**Description:** An admin looks up who did what, to which record, and when: for example, who removed a book from a child's shelf, whether a parent was alerted about a flag, or who viewed a flagged child's details. The log is append-only and holds IDs, never child details or reflection text (architecture §8.2.9). It also supports the yearly review the COPPA security program requires (`SEC-coppa-program`). This corresponds to `FEAT-admin-pii-segregation`.

**Preconditions:**

- PRE-1. The admin is logged in with the admin role.

**Postconditions:**

- POST-1. The matching audit entries have been displayed.
- POST-2. No audit entry has been changed or deleted.
- POST-3. The admin's own viewing of the log is recorded in it.

**Main Success Scenario:**

1. The admin opens the audit log.
2. The system shows the last 7 days of entries, newest first (team proposal), each with the time, the actor's account reference and role, the action, and the affected record's reference.
3. The admin filters by date range, action type, actor, or account reference.
4. The system shows the matching entries.
5. The admin opens an entry.
6. The system shows the entry's full record: still IDs and action details only. Use case ends when the admin leaves.

**Extensions:**

- 3a. The date range is invalid, for example an end before the start. The system rejects it and keeps the previous filter.
- 4a. No entry matches. The system shows an empty-state message.
- 4b. Loading fails. The system shows a retry message and no partial list.
- 6a. The entry refers to a record that has since been deleted, such as a deleted child account. The system shows the entry with the reference marked as deleted; the deleted data is not brought back.

**Priority:** Medium — needed to answer "who did this?" and to show alerts were delivered, without reading server logs.\
**Frequency of Use:** Occasional; when something needs explaining, and at each security review.\
**Business Rules:** `BR-admin-limited-view`

**Associated Information:**

| Property name    | Data type                                         | Validation rule                          | Security or access concerns                                                        | Glossary reference |
|------------------|---------------------------------------------------|------------------------------------------|------------------------------------------------------------------------------------|--------------------|
| Audit entry      | record: time, actor reference and role, action, record reference | system-set; append-only; never edited | Admin-only; holds IDs only, never child-identifying fields or reflection text   | —                  |
| Action type      | enum of the actions in architecture §8.2.9        | fixed list                               | —                                                                                  | —                  |
| Filters          | date range, action type, actor, account reference | end not before start                     | Filtering by a child's real name is not possible, because names are not in the log | —                  |

Entries carry account references, which the admin resolves to a child only through flagged-content review (`UC-ADM-flag-review`), so the log never becomes a second route to child details (`KD-admin-flag-review`).

**Related Use Cases:** every use case that writes an audit entry, including `UC-SHLF-parent-remove-book`, `UC-PAR-report-book`, `UC-ADM-block-content`, `UC-ADM-edit-content`, `UC-ADM-flag-review`, `UC-ADM-suspend-account`, `UC-ADM-suspend-parent-account`, `UC-PAR-delete-child-data` and `UC-PAR-delete-kid-account`\
**Assumptions:** There is no export of the log in the MVP (team proposal).\
**Open Issues:**
- **Who checks the admin.** The client is, in practice, the only admin, so the person whose actions are logged is the one reading the log. Whether someone else should review admin actions, for example views of child details in flag review, is not specified (`SEC-coppa-program`, `OI-20`).
- How long audit entries are kept is not set; it belongs in the retention policy (`BR-coppa-retention`, `OI-22`).

---

### UC-ADM-flag-review: Review Flagged Reflections

**UC ID and Name:** `UC-ADM-flag-review`: Review Flagged Reflections\
**Created By:** _Claude_\
**Date Created:** _2026-10-06_\
**Primary Actor:** A System Admin\
**Secondary Actors:** A Parent (is notified if the account is suspended)\
**Trigger:** The admin opens the flagged content list, or taps an in-app alert about a flagged reflection (`UC-SHLF-kid-add-note` step 6).\
**Description:** An admin views a list of reflections the system has flagged, opens an entry to see the flagged content with the detected passages highlighted, and sees the account behind it. The admin then either suspends the account or unflags the content, and each choice needs a further confirmation. **This is the only use case in which `BR-admin-limited-view` does not apply.** For security and safety reasons, the admin sees the child's real name and account details here, and nowhere else, and every view is recorded. This is the team's position (2026-10-26, `KD-admin-flag-review`), for the client to confirm (`OI-15`). A suspension saves the content to a list of dangerous content and notifies the parent. The suspension confirmation asks whether the content breaks only the app's conduct rules or also breaks the law and should be marked for escalation.

**Preconditions:**

- PRE-1. The admin is logged in with the admin role.

**Postconditions:**

- POST-1. The admin has seen the list of flagged content.
- POST-2. If the admin suspended the account: the account is suspended, the flagged content is saved to the dangerous content list with its classification (conduct only, or law-breaking and marked for escalation), and the parent has been notified.
- POST-3. If the admin unflagged the content: the flag is removed and the decision is recorded.
- POST-4. Every time the admin opens an entry, the access is recorded with the admin, the entry, and the time, because child details were shown.
- POST-5. A resolved entry is marked resolved and no longer appears as open.

**Main Success Scenario:**

1. The admin opens the flagged content list.
2. The system displays the open flagged reflections, newest first. Each row shows the flag category, and the date flagged. It does not show the child's name or any content in the list.
3. The admin taps an entry.
4. The system displays the flagged content in full, with the passages that triggered the flag highlighted, and the flag category.
5. The system displays information about the account: the child's real name, age, grade, and username, the account status, the parent's name and email, and the number of earlier flags on the account. The system records the access (POST-4).
6. The admin taps "Suspend account."
7. The system displays a suspension confirmation screen. It asks the admin to choose one of two classifications: the content breaks only the app's conduct rules, or the content broke the law and should be marked for further escalation.
8. The admin chooses a classification and confirms the suspension.
9. The system sets the account to suspended and ends the child's active sessions.
10. The system saves the flagged content to the dangerous content list with the classification, the account reference, and the time. If the content was classified as breaking the law, the system marks it for further escalation.
11. The system notifies the parent in-app that the account is suspended.
12. The system marks the flag resolved and shows the admin the outcome. Use case ends.

**Extensions:**

- 2a. There is no open flagged content. The system shows an empty-list message.
- 2b. The list cannot load. The system shows a retry message and no partial list.
- 3a. The entry was resolved by another admin since the list loaded. The system tells the admin, shows the recorded outcome, and returns to the list.
- 4a. The parent has already removed the content from the child's view (`BR-parent-content-removal`). The system still shows its retained copy to the admin and says it was removed by the parent.
- 4b. No passage can be highlighted, for example because the flag came from the category check alone. The system shows the content without highlights and the flag category.
- 5a. The account is already suspended. The system shows its status and does not offer "Suspend account." The admin may still unflag the content (6b) or return to the list.
- 6a. The admin leaves the entry without choosing. No change; the entry stays open.
- 6b. The admin taps "Unflag content." The system displays a confirmation asking the admin to confirm that the content does not break the rules. On confirm, the system removes the flag, records the admin, the time, and the decision, marks the entry resolved, and returns to the list. If the admin cancels, no change is made. Use case ends.
- 8a. The admin cancels the suspension. No change; the system returns to the entry (step 4).
- 8b. The admin confirms without choosing a classification. The system shows an inline error and does not suspend; returns to step 7.
- 9a. Ending the active sessions fails. The suspension is kept, because blocking new sign-ins is the control that matters. The system retries and shows the admin that the retry is pending (as in `UC-ADM-suspend-account` 5a).
- 9b. Setting the suspension fails. The system shows an error; the account stays active, nothing is saved to the dangerous content list, and the admin may retry from step 6.
- 10a. Saving to the dangerous content list fails. The suspension is kept. The system shows the admin that saving failed, keeps the flag open, and retries. The content must not be lost.
- 11a. The parent notification cannot be sent. The system retries it and keeps the suspension in place. A notification is never only a log entry (`SAF-flag-delivery`).

**Priority:** High — flagged content involves violence or self-harm, and the admin needs a way to act on it. Blocked in part by the open issues below.\
**Frequency of Use:** Rare; only when the content check flags something.\
**Business Rules:** `BR-note-safety-flagging`, `BR-parent-content-removal`, `BR-notes-visible-to-parent`; `BR-admin-limited-view` is **suspended for this use case only** (see Open Issues)

**Associated Information:**

| Property name                | Data type                                                                                            | Validation rule                                          | Security or access concerns                                                                                        | Glossary reference |
|------------------------------|------------------------------------------------------------------------------------------------------|----------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------|--------------------|
| Flagged entry                | record: reflection content, flag category, detected passages, flagged at, status | status is open or resolved                               | Admin-visible only through this use case; the list shows no content                                                | —                  |
| Flag category                | enum: violence, self-harm                                                                            | system-set by the content check (`UC-SHLF-kid-add-note`) | Admin-visible here                                                                                                 | —                  |
| Detected passages            | list of character ranges in the content                                                              | system-set; may be empty (4b)                            | Admin-visible here                                                                                                 | —                  |
| Account information          | child's real name, age, grade, username; account status; parent's name and email; earlier flag count | read-only                                                | Child PII shown to the admin **only** in this use case; each view is recorded; never shown on any other admin page | —                  |
| Classification               | enum: conduct only, breaks the law (escalate)                                                        | required when suspending                                 | Admin-visible                                                                                                      | —                  |
| Dangerous content list entry | record: content, flag category, classification, account reference, saved at, saved by                | created by a suspension here, or by a block that deletes a flagged reflection (`UC-ADM-block-content` 7c, `OI-24`); never edited | Admin-only; holds child content and must be protected like the child's data                                        | —                  |

Unflagging is the only way an admin clears a flag. An unflagged entry is not saved to the dangerous content list.

**Related Use Cases:** `UC-SHLF-kid-add-note` (raises the flag and the alert that leads here); `UC-ADM-suspend-account` (the same suspension, but this use case adds the content review, classification, and dangerous content list); `UC-SHLF-parent-view-shelf` (where the parent sees the flag marker)\
**Assumptions:** Only reflections are screened and flagged (`UC-SHLF-kid-add-note`); a rating is one of four fixed options and carries no text, so it cannot be flagged. A flag stays open until an admin resolves it. Any admin may resolve an entry.\
**Open Issues:**
- **Exception to `BR-admin-limited-view`:** `business-rules.md` now records this use case as the rule's one exception, as the team's position (2026-10-26). The client still has to confirm it (`OI-15`). The alert in `UC-SHLF-kid-add-note` step 6 carries no content; the admin reads it only here.
- **Authority:** settled; the admin may suspend accounts (team decision 2026-10-26).
- **Escalation:** what "further escalation" means, who receives a law-breaking item, and how, is not specified (`OI-18`).
- **Dangerous content list:** retention period and whether it can be exported are not specified (`OI-27`; the team decided only the admin may view it).
- **Notifications:** whether the parent is told the reason or the classification, and whether the child is told anything, are not specified. Whether the parent is notified when content is unflagged is also open.
- **Reinstatement:** `UC-ADM-reinstate-account`. Whether reinstating an account suspended here needs any extra step is open there.
- **Detection:** how passages are detected and highlighted is not specified; the flag categories are only violence and self-harm.

---

_**Gap:** reflections pending deletion (`UC-SHLF-kid-add-note`) have no admin use case.

---

## Working these with your agent

_[Delegate: drafting the main success scenario once you have the trigger and the goal; proposing extensions you have not thought of, which it is genuinely good at; turning a filled-in use case into a first set of test cases; checking that every `BR-*` you cite exists in [business-rules.md](business-rules.md).]_

_Keep human: whether this is one use case or three, what the priority is, and whether an extension the agent proposed is a real path in your client's business or a generic one it has seen elsewhere. "The system handles concurrent edits" is a real requirement for some projects and invented complexity for others, and only you have met the client._

_The verification that catches the most: read the main success scenario aloud to someone who has not read the document, and stop wherever they ask a question. Every question is a missing step or a missing extension._

_**Checklist for each use case:** Does the name start with a verb? Can the system test every precondition? Does every step alternate actor and system? Is there at least one extension per step that can fail? Does every business rule appear as an identifier only? Could a tester write test cases from this without asking you anything?_
