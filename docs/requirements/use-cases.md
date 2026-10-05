# Use Cases

**Project:** Book Buddies\
**Team:** Team 5\
**Client:** Yang Yang, Research Scientist IBR/Knight D Research\
**Version:** 0.8

---

_**How to use this template.** Instructions appear in italic square brackets. Fill in underneath them and leave them in place until the document is stable._

_**What a use case is.** One goal a user can accomplish with your system, written as the dialogue between the actor and the system, including what happens when it goes wrong. It is the unit of work in this course: one use case becomes one issue, one branch, one pull request, and one set of tests._

_**Why the use case and not the user story.** You will meet user stories in industry, and they are a good planning tool: "As a student, I want to submit my report so that I get credit." A story is deliberately under-specified, because it is a **placeholder for a conversation** that happens later, between people. That is exactly the wrong property when the thing building your code is an agent that will implement precisely what the specification says and never ask what you meant. Use stories to plan and prioritize. Build against use cases._

_The difference that matters is the parts a story does not have: preconditions, the step-by-step flow, and above all the **extensions**, which is where the failure paths live. Most defects your team ships this semester will be in a path nobody wrote down._

## Identifiers

_Use cases are identified as `UC-<AREA>-<slug>`, where the area code groups related functionality and the slug is coined from the goal: `UC-RUB-create-rubric`, `UC-WAR-manage-activities`, `UC-STU-invite-students`._

_Pick your own area codes from your project's feature areas, three or four letters each, and list them at the top of the Use Case List. Areas correspond to the `FEAT-*` entries in your [vision and scope](vision-and-scope.md), which is where use cases come from._

_**Never renumber, rename, or repoint an identifier.** Moving a use case between areas would change its identifier, so put it in the right area the first time, and if you get it wrong, leave it. An identifier is an address, not a description._

_Within one use case, `PRE-1`, `POST-1`, and the step numbers are local and may be renumbered freely, because nothing outside the use case cites them._

## Revision History

| Date           | Version | Description                           | Author                          |
|----------------|---------|---------------------------------------|---------------------------------|
| _[2026-09-13]_ | 0.1     | File setup and ready for feature list | _Grayson Whittingham_           |
| _[2026-09-17]_ | 0.2     | Added Area Codes                      | _Grayson Whittingham_           |
| _[2026-09-17]_ | 0.3     | Added Scope and First Use Case        | _Grayson Whittingham_           |
| _[2026-09-27]_ | 0.4     | Added Feature List                    | _Grayson Whittingham_           |
| _[2026-10-01]_ | 0.5     | Replaced temporary feature dump with the Use Case List table, cross-referenced to `FEAT-*` | _Grayson Whittingham_, _Claude_ |
| _[2026-10-04]_ | 0.6     | Wrote the `REC` area use cases: kid-onboarding, recommend-quiz-rules, recommend-quiz-ai (post-MVP), parent-review, kid-review; recommender mode is mutually exclusive between the rules and AI flows | _Claude_ |
| _[2026-10-04]_ | 0.7     | Wrote the `SHLF` area use cases: parent-view-shelf, kid-view-shelf, kid-move-book, kid-remove-book, kid-rate-book, kid-add-note, parent-remove-book. Rating scale and reflection-visibility conflicts are left as open issues, not decided | _Claude_ |
| _[2026-10-04]_ | 0.8     | Reflection deletion (24-hour pending window, restore, unflagged only) and kept ratings and reflections on shelf removal; wrote the `ADM` area use cases (add-content with custom tags, block-content, suspend-account, view-recommender-stats, view-usage-stats); wrote `UC-SHLF-manual-search` (keyword search, parent approval before a shelf add) | _Claude_ |
---

## 1. Introduction

### 1.1 Purpose

Bookbuddies is an app that allows kids get easy recommendation based on criteria, adult input, and other kids input. Kids are added to groups by adults and can record and recommend books to other kids. Adults can check a child's reading profile, manage accounts and groups, bias the recommendation system slightly, wipe child data, and report books. System admins are still a work in progress.

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

| Property name | Data type | Validation rule | Security or access concerns | Glossary reference |
|---|---|---|---|---|
| _[field]_ | _[type]_ | _[required, format, range]_ | _[who may see or set it]_ | _[term]_ |

**Related Use Cases.** _Other use cases this one invokes or is invoked by, by identifier and name._

**Assumptions.** _Anything assumed about this use case or how it executes._

**Open Issues.** _What you do not know yet. Mirror it into [OPEN-ISSUES.md](OPEN-ISSUES.md) so it is visible in one place._

---

## 3. Use Case List

_[Your area codes, then a table of every use case by area. Write this list first, before specifying any single use case in detail. It is the cheapest thing to review with your client, and finding out you missed a whole area costs minutes here rather than a week later.]_

| Area code | Feature area                                                                                                             | Use cases                                                                                                                                                          |
|-----------|---------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `PAR`     | Parent — account linking and oversight (`FEAT-parent-account-linking`, `FEAT-parent-review-dashboard`)                   | `UC-PAR-onboarding`, `UC-PAR-create-sub-parent-account`, `UC-PAR-create-kid-account`, `UC-PAR-suggest-book`, `UC-PAR-view-growth-report`                           |
| `SHLF`    | Shelf — tracking and rating what a child has read (`FEAT-shelf`, `FEAT-ratings`, `FEAT-manual-search`)                    | `UC-SHLF-parent-view-shelf`, `UC-SHLF-kid-view-shelf`, `UC-SHLF-kid-move-book`, `UC-SHLF-kid-remove-book`, `UC-SHLF-kid-rate-book`, `UC-SHLF-kid-add-note`, `UC-SHLF-parent-remove-book`, `UC-SHLF-manual-search` |
| `REC`     | Recommend — picture-quiz and (later) AI-assisted recommendations (`FEAT-recommendation-quiz`, `FEAT-reading-level-baseline`, `FEAT-ai-recommendation`) | `UC-REC-kid-onboarding`, `UC-REC-recommend-quiz-rules`, `UC-REC-recommend-quiz-ai`, `UC-REC-parent-review`, `UC-REC-kid-review`                                    |
| `ADM`     | Admin — PII-segregated content and system oversight (`FEAT-admin-pii-segregation`)                                        | `UC-ADM-suspend-account`, `UC-ADM-add-content`, `UC-ADM-block-content`, `UC-ADM-view-recommender-stats`, `UC-ADM-view-usage-stats`                                 |

Notes on the table above:

- `UC-PAR-create-sub-parent-account` is the identifier already specified in section 4 below; it replaces an earlier, inconsistent name for the same use case (`UC-PAR-create-second-parent-account`) that appeared in a draft version of this list. Per the identifier rule in this document, the already-specified name wins and is never renamed.
- `UC-PAR-suggest-book` and `UC-PAR-view-growth-report` correspond to `FEAT-adult-influence-notes` and `FEAT-recap-adult` respectively. Both features are defined in `vision-and-scope.md` §4.2 but are not yet placed in either the in-scope or out-of-scope list in §4.3 — flag this gap with the client rather than assuming MVP inclusion.
- The `REC` use cases form two alternative flows that converge on the same downstream steps: `UC-REC-recommend-quiz-rules` → `UC-REC-parent-review` → `UC-REC-kid-review`, and `UC-REC-recommend-quiz-ai` → `UC-REC-parent-review` → `UC-REC-kid-review`. `FEAT-ai-recommendation` (and therefore `UC-REC-recommend-quiz-ai`) is explicitly out of scope for the MVP per §4.3 — carry that priority into the detailed use case.
- `UC-ADM-add-content` and `UC-ADM-block-content` depend on `FEAT-book-tagging`, which `vision-and-scope.md` §4.3 lists as out of scope for the MVP pending `OI-1`/`OI-2`. `vision-and-scope.md` v0.4 moves `FEAT-book-tagging` into MVP scope, so these are Medium priority; building them is still blocked until the seed-catalog source and tag lists are settled (`OI-1`).

**Future / stretch use cases** (not targeted for the MVP; kept here so the identifiers exist before they're needed):

| Area code | Feature area                                                  | Use cases              |
|-----------|-----------------------------------------------------------------|-------------------------|
| `SHLF`    | `FEAT-reading-identity-badges` (badge design still forming)     | `UC-SHLF-view-badges`  |
| `ADM`     | Admin account management (not described by any `FEAT-*` yet)    | `UC-ADM-add-admin`     |

---

## 4. Use Cases

_[One `###` heading per use case, grouped under a `##` heading per area. Worked example below, taken from Project Pulse. Delete it and write your own.]_

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
- POST-3. Parental consent has been recorded for the account, per `BR-coppa-parental-consent`.
- POST-4. At least one child account exists, linked to the new parent account — a parent account cannot exist without a linked child, so the system carries the Parent directly into `UC-PAR-create-kid-account` before this use case is considered complete.

**Main Success Scenario:**

1. The Parent taps "Create Account."
2. The system displays a sign-up form requesting name, email, and password, together with a parental-consent notice required for a product that serves children, per `BR-coppa-parental-consent`.
3. The Parent enters their name, email, and password, acknowledges the consent notice, and submits the form.
4. The system validates the email format and checks that it is not already registered.
5. The system creates the Main Parent account, records the consent acknowledgment, and logs the Parent in.
6. The system immediately invokes `UC-PAR-create-kid-account`, since a parent account cannot exist without at least one linked child.
7. Use case ends once `UC-PAR-create-kid-account` completes successfully.

**Extensions:**

- 3a. The Parent cancels before submitting. Use case ends; no account is created.
- 3b. The Parent does not acknowledge the consent notice. The system blocks submission and keeps the form open; no account is created until consent is given, per `BR-coppa-parental-consent`.
- 4a. The email is already registered to an existing account. The system displays an error and offers a sign-in or password-reset link instead; returns to step 3.
- 4b. The email is not a valid email format. The system displays an inline validation error; returns to step 3.
- 4c. The password does not meet the minimum strength policy. The system displays an inline validation error; returns to step 3.
- 5a. The system fails to persist the new account (e.g., database timeout). The system displays an error and does not log the parent in; no partial account record is left behind.
- 6a. The Parent abandons the flow during `UC-PAR-create-kid-account` (e.g., closes the app, navigates away) before a child account is created. The system keeps the Main Parent account but does not treat onboarding as finished — on the Parent's next login, the system routes them straight back into `UC-PAR-create-kid-account` before allowing access to anything else, rather than restarting this use case.

**Priority:** High — nothing else in the `PAR` area can happen without a parent account.\
**Frequency of Use:** Once per family, at signup; rare after that.\
**Business Rules:** `BR-parent-account-linked`, `BR-parent-creates-kid-account`, `BR-parent-account-structure`, `BR-coppa-parental-consent`

**Associated Information:**

| Property name | Data type | Validation rule | Security or access concerns | Glossary reference |
|---|---|---|---|---|
| Parent name | string | required | Visible to the parent and any linked sub parent; the system admin may see parent credentials but not a child's details (`BR-admin-limited-view`) | — |
| Email | string | required; valid email format; unique across parent accounts | Used for login and account recovery only | — |
| Password | string | required; meets a minimum strength policy (exact rule TBD) | Stored hashed; never visible to anyone, including admin | — |
| Consent acknowledgment | boolean | required; must be explicitly acknowledged, not pre-checked | Recorded as part of the account for compliance purposes, per `BR-coppa-parental-consent` | — |

If account creation fails partway (step 5a), the operation rolls back completely — no row is written for the account, so a retry with the same email does not collide with a half-created record.

**Related Use Cases:** `UC-PAR-create-kid-account` (invoked immediately, in step 6, as a mandatory continuation of this use case — not optional)\
**Assumptions:** none beyond what's listed in Open Issues.\
**Open Issues:**
- `OI-8` is resolved — `business-rules.md` §2.1 `BR-parent-creates-kid-account` and `BR-parent-account-structure`, and `vision-and-scope.md` §2.7 `AS-parent-account-first`, all confirm (2026-09-24/2026-10-01) that a parent account always exists before any child account, a child cannot self-register, and one parent account can manage multiple children. This use case's parent-first ordering is the client-confirmed design, not an assumption.
- The earlier `BR-admin-no-pii` citation used elsewhere in this document is a stale identifier — `business-rules.md` v0.2 replaced "admin sees zero PII" with `BR-admin-limited-view` ("admin may see parent credentials and child-account counts, but not a child's details"). This use case now cites the current identifier.
- `business-rules.md` §2.1 flags `BR-coppa-parental-consent` itself as incomplete: Yang Yang is sending the team the actual COPPA rules link, and further rules should only be added once attributed to that source. Treat the consent step above as a placeholder for the right legal language, not a finished implementation.

---

### UC-PAR-create-sub-parent-account: A Parent Creates A Sub Parent Account

**UC ID and Name:** `UC-PAR-create-sub-parent-account`: A Parent Creates A Sub Parent Account\
**Created By:** _Grayson Whittingham_; extensions, business rules, and associated information added by _Claude_\
**Date Created:** _2026-09-25_\
**Primary Actor:** A Parent (the Main Parent)\
**Secondary Actors:** A Sub Parent (invited, does not act until a later, separate setup step)\
**Trigger:** The parent taps "Add Sub Parent" on account management.\
**Description:** A parent creates a sub parent account to allow a second adult to manage the children's reading listed under the Main Parent Account.

**Preconditions:**

- PRE-1. The Parent is logged into the system.
- PRE-2. The Parent is the Main Parent on the account.

**Postconditions:**

- POST-1. A Sub Parent account record is created and linked to the Main Parent's family.
- POST-2. An invitation has been sent to the Sub Parent so they can set up their own login (a separate, not-yet-defined use case — see Related Use Cases).

**Main Success Scenario:**

1. The Parent taps "Add Sub Parent Account."
2. The Parent enters the name and email of the Sub Parent.
3. The Parent taps confirm on a pop-up notifying them that the Sub Parent will have the same access to the child as they do, except for creating and deleting accounts.
4. The system creates the Sub Parent account record and sends an invitation to the supplied email.
5. Use case ends.

**Extensions:**

- 1a. The Parent is a Sub Parent, not the Main Parent (PRE-2 fails). The system does not display the "Add Sub Parent Account" option, or blocks the action with an explanation if attempted directly.
- 2a. The Parent cancels before confirming. Use case ends; no Sub Parent account is created.
- 2b. The email entered is not a valid email format. The system displays an inline validation error; returns to step 2.
- 2c. The email is already associated with an existing Main Parent account on a different family. The system displays an error and does not proceed — a person cannot be a Main Parent on one family and a Sub Parent on another (assumption; not yet confirmed with the client).
- 4a. The invitation email fails to send. The system notifies the Parent that the account was created but the invite needs to be resent, and offers a retry.

**Priority:** Medium\
**Frequency of Use:** Occasional; mostly when an account is first created.\
**Business Rules:** None currently defined in `business-rules.md` specifically govern sub parent accounts or their exact permissions relative to the Main Parent — see Open Issues.

**Associated Information:**

| Property name | Data type | Validation rule | Security or access concerns | Glossary reference |
|---|---|---|---|---|
| Sub Parent name | string | required | Visible to the Main Parent, the Sub Parent, and any linked children's parent view; never visible to the system admin (`BR-admin-no-pii`) | — |
| Sub Parent email | string | required; valid email format; not already a Main Parent elsewhere | Used only to deliver the setup invitation | — |

If the account record is created but the invite email fails (4a), the account record is not rolled back — it persists in an "invited, not yet set up" state so the Parent can resend rather than starting over.

**Related Use Cases:** The Sub Parent's own account setup (accepting the invite, setting a password) is implied by POST-2 but is not yet a separate entry in the Use Case List in section 3 — recommend adding one (e.g., a future `UC-PAR-sub-parent-set-up`) before this is built, so the setup flow has its own preconditions and extensions.\
**Assumptions:** Assumes one email can be a Sub Parent on only one family at a time (see 2c); not yet confirmed with the client.\
**Open Issues:** No `BR-*` rule in `business-rules.md` currently scopes what a Sub Parent can and cannot do, or whether there is a limit on the number of Sub Parents per family — worth raising with the client and filing as a new entry in `OPEN-ISSUES.md`.

---

### UC-PAR-create-kid-account: Create a Linked Child Account

**UC ID and Name:** `UC-PAR-create-kid-account`: Create a Linked Child Account\
**Created By:** _Claude_\
**Date Created:** _2026-10-01_\
**Primary Actor:** A Parent (Main or Sub Parent)\
**Secondary Actors:** none\
**Trigger:** Either (a) immediately and automatically, as a mandatory continuation of `UC-PAR-onboarding` for the family's first child, since a parent account cannot exist without at least one linked child; or (b) the Parent taps "Add a Child" from the account dashboard, for any additional child.\
**Description:** A parent creates a linked child profile, entering the child's name, age, grade, and an optional reading level so the recommender has what it needs from the first use. This corresponds to `FEAT-onboarding-profile` in `vision-and-scope.md` §4.2.

**Preconditions:**

- PRE-1. The Parent is logged in.
- PRE-2. The Parent has a Main or Sub Parent account in good standing (not suspended under `BR-24hr-review-window`). *`business-rules.md` §2.2 itself now flags this rule as needing reconfirmation with the client — see the Open Issues note below.*

**Postconditions:**

- POST-1. A child profile exists, linked to the Parent's account.
- POST-2. The child profile includes the child's name, age, grade, and avatar; it includes a reading level only if the Parent chose to enter one.

**Main Success Scenario:**

1. The Parent arrives at this use case either straight from `UC-PAR-onboarding` (first child) or by tapping "Add a Child" from the account dashboard (additional child).
2. The system displays a form requesting the child's name, age, grade, an optional reading level, and an avatar/character selection.
3. The Parent enters the child's name, age, and grade; optionally enters the child's reading level using a scale they already know (e.g., Lexile, AR/ATOS, DRA, Guided Reading Level, or a grade-level range), or skips it; and selects an avatar.
4. The system validates the entered values.
5. The system creates the child profile, linked to the Parent's account, with the entered name, age, grade, and (if given) reading level available to the recommender.

**Extensions:**

- 1a. The Parent cancels before completing the form. If this is the family's first child (arrived via `UC-PAR-onboarding`), the use case ends without a profile, which triggers `UC-PAR-onboarding`'s extension 6a on the Parent's next login. If this is an additional child (arrived via "Add a Child"), the use case simply ends with no new profile created.
- 4a. The child's name is empty. The system displays an inline validation error; returns to step 3.
- 4b. The age entered is outside the product's target age band (roughly 6–11, per `vision-and-scope.md` §2.4). The system warns the Parent but does not necessarily block the entry (see Open Issues — whether a sibling outside the target band should be allowed is unconfirmed).
- 4c. The grade entered is not a recognized school grade. The system displays an inline validation error; returns to step 3.
- 4d. The Parent enters a reading level that does not match one of the accepted scales. The system displays an inline validation error and shows the accepted scales/formats; returns to step 3. Skipping the field entirely is not an error, per `BR-reading-level-parent-entered`.
- 4e. The Parent is unsure of the child's reading level. The system may offer referral links to an external resource (e.g., AR Bookfinder, Scholastic Book Wizard) for the Parent's own reference; the system itself never assesses or estimates the level, per `BR-no-reading-level-assessment`.
- 5a. The system fails to persist the child profile (e.g., database timeout). The system displays an error; no partial child record is left behind.

**Priority:** High — a family cannot use any `SHLF` or `REC` feature without a child profile, and per `UC-PAR-onboarding` a parent account cannot exist without one either.\
**Frequency of Use:** Once per family immediately after onboarding (first child), with occasional repeats for additional children.\
**Business Rules:** `BR-parent-account-linked`, `BR-parent-creates-kid-account`, `BR-kid-data-stored`, `BR-no-reading-level-assessment`, `BR-reading-level-parent-entered`, `BR-admin-limited-view`

**Associated Information:**

| Property name | Data type | Validation rule | Security or access concerns | Glossary reference |
|---|---|---|---|---|
| Child's name | string | required, per `BR-kid-data-stored` | PII, stored for law-enforcement reporting purposes per `BR-kid-data-stored`; visible to the parent; the system admin sees parent credentials and a child-account count only, never a child's details (`BR-admin-limited-view`) | — |
| Age | integer | required, per `BR-kid-data-stored`; expected range roughly 6–11 (see 4b and Open Issues) | Visible to the parent; used by the recommender as the primary signal (`BR-reading-level-proxy`); never visible to the system admin (`BR-admin-limited-view`) | — |
| Grade | string/enum (e.g., K–6) | required, per `BR-kid-data-stored`; must be a recognized school grade | Visible to the parent; used by the recommender alongside age (`BR-reading-level-proxy`); never visible to the system admin (`BR-admin-limited-view`) | — |
| Reading level | string/number, one of Lexile, AR/ATOS, DRA, Guided Reading Level, or a grade-level range | optional, per `BR-kid-data-stored`; manually entered by the parent, or skipped — never assessed by the system, per `BR-no-reading-level-assessment` and `BR-reading-level-parent-entered` | Visible to the parent; used by the recommender if given, otherwise age/grade stand in (`BR-reading-level-proxy`); never visible to the system admin (`BR-admin-limited-view`) | Lexile (Lexile Framework), Accelerated Reader (AR) |
| Avatar | enum / image reference | required; selected from a provided set | Visible to the parent and child; see Open Issues re: `BR-kid-anonymous-profile` | Kid-Facing Profile |

**Related Use Cases:** `UC-PAR-onboarding` (invokes this use case immediately for the first child)\
**Assumptions:** Assumes no hard limit on the number of children one parent account can link; not yet confirmed with the client.\
**Open Issues:**
- The earlier conflict here — manual parent entry vs. an in-app baseline test — is now **resolved in this use case's favor**: `business-rules.md` v0.2 `BR-no-reading-level-assessment` and `BR-reading-level-parent-entered`, and `vision-and-scope.md` v0.4 `FEAT-reading-level-input`, all confirm (2026-09-24/2026-10-01) there is no in-app test and reading level is optional, parent-entered. The reading-level scale question is also now answered: Lexile, AR/ATOS, DRA, Guided Reading Level, or a grade-level range are all acceptable, per `BR-reading-level-parent-entered`.
- **New conflict:** `business-rules.md` §2.1 `BR-kid-data-stored` enumerates the stored child fields as name, age, grade, and (optionally) reading level only — it does not mention reading interests or favorite books already read. But `vision-and-scope.md` §4.2 `FEAT-onboarding-profile` — the feature this use case implements — also lists reading interests and favorite books already read as part of the onboarding profile. These two now-current documents disagree on what onboarding actually collects; raise with the client before deciding whether to add those fields to this use case or a separate one.
- **New conflict:** `business-rules.md` v0.2 restates `BR-kid-anonymous-profile` ("a nickname and character avatar only... no real identifying information is displayed") with a note that the rule "still governs what is displayed," even though the child's real name is now stored per `BR-kid-data-stored`. This use case currently collects and displays the child's real name, with no nickname, per explicit direction for this project. That is a direct conflict with the client-sourced rule as currently written in `business-rules.md` — needs an explicit decision (and a `business-rules.md` update) rather than being left to stand unchanged against this use case.
- `business-rules.md` §2.2 flags `BR-24hr-review-window` (cited in PRE-2) itself as needing reconfirmation with the client — it is absent from the team's second-meeting notes, which simplified scope elsewhere. If it's dropped, PRE-2 needs to drop the suspension clause.
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
- PRE-3. The book being suggested exists in the seed catalog.

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
- 4a. The book is already on the child's shelf or already in their recommendation list. The system notifies the Parent and asks whether to suggest it anyway or cancel.
- 5a. The child never logs in to see the suggestion. The suggestion remains pending indefinitely in the recommendation list; no expiry is currently defined (see Open Issues).

**Priority:** Medium-High — `FEAT-parent-suggest-book` is confirmed in scope for the MVP.\
**Frequency of Use:** Occasional; whenever a parent spots a book they think fits their child.\
**Business Rules:** `BR-parent-rec-not-forced`

**Associated Information:**

| Property name | Data type | Validation rule | Security or access concerns | Glossary reference |
|---|---|---|---|---|
| Book reference | reference | required; must exist in the seed catalog | Visible to parent and child (as a suggestion in the recommendation list only) | Seed Catalog |
| Note | string | optional, free text | Visible to the child as part of the suggestion (not private, per `BR-parent-rec-not-forced`'s source note); never visible to the system admin (`BR-admin-limited-view`) | — |

**Related Use Cases:** A `REC`-area use case for the child accepting/declining a recommendation (not yet written) is what actually moves an accepted suggestion onto the shelf; this use case only ever populates the recommendation list.\
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
**Description:** A parent views a short, qualitative snapshot of a child's recent reading activity — what caught their attention, a notable first — without raw counts, streaks, or comparisons. This corresponds to `FEAT-recap-adult`, which `vision-and-scope.md` §4.2 defines but §4.3 does not yet place in or out of MVP scope.

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

**Priority:** Medium — supports `SM-review-compliance` by giving the parent something worth checking, but is not itself a blocking gate.\
**Frequency of Use:** Periodic; weekly or monthly per the recap's own cadence.\
**Business Rules:** `BR-recap-qualitative-only`, `BR-kid-no-metrics`, `BR-no-behavioral-analytics`

**Associated Information:**

| Property name | Data type | Validation rule | Security or access concerns | Glossary reference |
|---|---|---|---|---|
| Recap period | enum (weekly, monthly) | required | Parent-only | — |
| Recap text | system-generated string | must not include counts, streaks, or peer comparisons, per `BR-recap-qualitative-only` and `BR-kid-no-metrics` | Parent-only; never shown to the child; never visible to the system admin (`BR-admin-no-pii`) | — |

**Related Use Cases:** none defined yet; see Open Issues for how this may relate to `BR-24hr-review-window`.\
**Assumptions:** none beyond what's listed in Open Issues.\
**Open Issues:** This use case depends on `FEAT-recap-adult`, which is defined in `vision-and-scope.md` §4.2 but not yet placed in the in-scope or out-of-scope MVP list in §4.3. It's also unclear whether viewing this recap is the same action that satisfies the 24-hour review acknowledgment required by `BR-24hr-review-window`, or whether that is a separate, explicit "I have reviewed" action — nothing in the current requirements docs settles this. Recommend filing both as new entries in `OPEN-ISSUES.md`.

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
- POST-3. The child is shown the reflection disclosure: reflections like this are reported to the parent and, if violent or self-harm content is found, to the system admin.
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

| Property name | Data type | Validation rule | Security or access concerns | Glossary reference |
|---|---|---|---|---|
| Reading interests | multi-select from a fixed option list | optional; each value must come from the list (list contents TBD) | Visible to the parent and child; used by the recommender; never visible to the system admin (`BR-admin-limited-view`) | — |
| Favorite books already read | list of catalog book references | optional; each entry must exist in the seed catalog | Visible to the parent and child; used by the recommender; never visible to the system admin (`BR-admin-limited-view`) | Seed Catalog |
| Onboarding complete | boolean | required; set only by step 6 | Parent-set; not visible to the admin | — |

**Related Use Cases:** `UC-PAR-create-kid-account` (invokes this use case); `UC-REC-recommend-quiz-rules` (consumes the saved profile)\
**Assumptions:** The Parent, not the child, enters interests and favorite books, consistent with `BR-parent-creates-kid-account`.\
**Open Issues:**
- `business-rules.md` §2.1 `BR-kid-data-stored` lists only real name, age, grade, and optional reading level as stored child data. It does not list reading interests or favorite books, yet `vision-and-scope.md` §4.2 `FEAT-onboarding-profile` and `FR-ONB-profile` in the SRS require both. The rule needs updating or the features need dropping.
- `UC-PAR-create-kid-account` and this use case both run at child setup. Whether the profile fields belong in the parent's create-kid form or a separate onboarding step is undecided; the SRS currently puts all of them in the creation step (`FR-ONB-profile`).
- The reading-interest option list and its contents are not specified anywhere in the requirements.
- The reflection disclosure's exact wording and the existence of `BR-flagging-disclosure` are not yet in `business-rules.md`.

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
4. The system filters the tagged catalog against the child's profile, using age and grade as the primary signal and the reading level as a difficulty input only if one is recorded, per `BR-reading-level-proxy`.
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
**Business Rules:** `BR-reading-level-proxy`, `BR-no-reading-level-assessment`

**Associated Information:**

| Property name | Data type | Validation rule | Security or access concerns | Glossary reference |
|---|---|---|---|---|
| Quiz answers | button selections, one per question | required, each from the provided option set; questions and options TBD | Child-visible; used only to filter this request; not stored as a reading-level estimate, per `BR-no-reading-level-assessment` | — |
| Batch size | integer | system-defined; exact number TBD (`OI-2`) | Not user-set | — |
| Recommendation source | enum | set to "rules" by this use case | Visible to the parent (source only) | Recommender |

Quality attributes: the batch should return quickly for a catalog of 30–50 books (`PER-recommendation-latency`; numeric target TBD).

**Related Use Cases:** `UC-REC-parent-review` (step 6 hand-off); `UC-REC-kid-onboarding` (provides the starting profile); `UC-REC-kid-review` (runs after parent review)\
**Assumptions:** The seed catalog is tagged with at least genre/mood/length/age fit (`FEAT-book-tagging`); this use case depends on that tagging being in place.\
**Open Issues:**
- The quiz questions, their options, and the number of books per batch are not specified (`OI-2`).
- The exact matching criteria beyond "age/grade primary, reading level as difficulty input" are not specified (`OI-2`).
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

| Property name | Data type | Validation rule | Security or access concerns | Glossary reference |
|---|---|---|---|---|
| Behavioral signals | saved, loved, rated highly, recommended to a peer, skipped | only these signals; never demographic | Used for similarity across users; not shown to any child | Similarity ("Similar Kids") |
| Recommendation source | enum | set to "AI" by this use case | Visible to the parent (source only) | Recommender |

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

| Property name | Data type | Validation rule | Security or access concerns | Glossary reference |
|---|---|---|---|---|
| Batch status | enum (pending, released, empty) | system-set | Parent-visible; never shown to the child as a status | — |
| Removed books | list of book references | optional; each must be in the batch | Parent-only; never shown to the child | — |

**Related Use Cases:** `UC-REC-recommend-quiz-rules` and `UC-REC-recommend-quiz-ai` (upstream, mutually exclusive); `UC-REC-kid-review` (downstream)\
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
6. If the reaction is "Not for me," the system offers an optional reason (too easy, too hard, not my style, too long, or other), and records the decline.
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

| Property name | Data type | Validation rule | Security or access concerns | Glossary reference |
|---|---|---|---|---|
| Reaction | enum: yes, maybe later, not for me | required; one per book | Child-set; visible to the parent as part of the shelf | — |
| Decline reason | enum: too easy, too hard, not my style, too long, other | optional; only when reaction is "not for me" | Visible to the parent; never visible to the system admin (`BR-admin-limited-view`) | — |
| Shelf category | enum: Reading Now, Maybe Later | set by the reaction | Visible to the parent and child | Shelf (`FEAT-shelf`) |

**Related Use Cases:** `UC-REC-parent-review` (upstream); `UC-REC-recommend-quiz-rules` / `UC-REC-recommend-quiz-ai` (originating flows, mutually exclusive); `UC-SHLF-kid-view-shelf` (where accepted books appear)\
**Assumptions:** The reaction options and shelf categories follow the 2026-09-25 flowchart; `FR-REC-react` in the SRS lists accept/defer/decline, which maps onto the same three choices.\
**Open Issues:**
- Whether a declined book, or its reason, is ever shown to the parent is not specified. The decline reason's purpose and visibility need confirming.
- Whether a declined book can be recommended again later is not specified.
- The shelf category for an accepted book is "Reading Now" per the flowchart; `FR-SHLF-categories` in the SRS is marked to confirm with the client.

---

## [SHLF] Shelf Feature Area

_The shelf is the child's record of what they are reading, want to read, or have finished. Books reach the shelf only through the child's own reaction in `UC-REC-kid-review`; a parent can remove a book from the shelf but cannot add one (`BR-parent-rec-not-forced`). The four categories follow `FEAT-shelf` as shown in the 2026-09-25 flowchart; `FR-SHLF-categories` still needs client confirmation. The shelf shows no counts, streaks, or comparisons to other children (`BR-kid-no-metrics`)._

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
- 5b. A shelf entry's catalog book has since been blocked by the admin (`UC-ADM-block-content`). The system still shows the entry to the Parent, labeled as no longer available, so the Parent can remove it.

**Priority:** High — reviewing the child's shelf is the parent's core oversight action.\
**Frequency of Use:** Several times per week per family (estimate).\
**Business Rules:** `BR-parent-account-linked`, `BR-notes-visible-to-parent`

**Associated Information:**

| Property name | Data type | Validation rule | Security or access concerns | Glossary reference |
|---|---|---|---|---|
| Shelf category | enum: Reading Now, Want to Read, Maybe Later, Finished | required; one value per entry | Visible to the parent and child | Shelf (`FEAT-shelf`) |
| Rating | enum (scale TBD, see `UC-SHLF-kid-rate-book`) | optional; only for Finished entries | Parent-visible; never visible to the system admin (`BR-admin-limited-view`) | Rating |
| Reflection | string | optional; see `UC-SHLF-kid-add-note` | Always parent-visible (`BR-notes-visible-to-parent`); admin visibility of flagged content is TBD (`OI-15`) | — |
| Display order | system-set | Categories are fixed in the order listed in step 3; entries within a category are most-recently-moved first (team proposal) | Not shown as a number | — |

The view runs from a stored shelf and does not recompute anything, so a failed load leaves the child's data untouched. Quality attributes: `USE-parent-light` (the parent reaches the shelf in one tap from the dashboard).

**Related Use Cases:** `UC-SHLF-parent-remove-book` (invoked from step 4); `UC-SHLF-kid-view-shelf` (the child's view of the same shelf); `UC-SHLF-kid-add-note` (produces the reflections shown here); `UC-PAR-view-growth-report` (a separate, qualitative recap, not this view)\
**Assumptions:** A secondary parent sees the same shelf as the primary parent, per `UC-PAR-create-sub-parent-account`. The parent view shows no counts or totals, a team proposal that keeps this view consistent with `BR-kid-no-metrics`.\
**Open Issues:**
- Whether a parent should see when a child moved a book, or any history of moves, is not specified anywhere in the requirements.
- Whether viewing the shelf counts as the parent's review under `BR-24hr-review-window` is unresolved (`OI-16`, cited in `vision-and-scope.md` §4.2, not yet filed in `OPEN-ISSUES.md`).

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
- 3b. A shelf entry's catalog book has been blocked by the admin (`UC-ADM-block-content`). The system hides the entry from the child and keeps it on the record, so the parent still sees it (`UC-SHLF-parent-view-shelf` 5b).
- 5a. The child taps an action that the book's current category does not allow, such as rating a book that is not Finished. The system does not offer the action.

**Priority:** High — the shelf is the child's main place in the app after a recommendation is accepted.\
**Frequency of Use:** Several times per week per active child.\
**Business Rules:** `BR-kid-anonymous-profile`, `BR-kid-no-metrics`, `BR-parent-account-linked`

**Associated Information:**

| Property name | Data type | Validation rule | Security or access concerns | Glossary reference |
|---|---|---|---|---|
| Shelf category | enum: Reading Now, Want to Read, Maybe Later, Finished | required; one value per entry | Visible to the child and parent | Shelf (`FEAT-shelf`) |
| Book cover and title | catalog reference | required; from the seed catalog | Visible to the child and parent | Seed Catalog |
| Display order | system-set | Within a category, most-recently-moved first (team proposal) | Not shown as a number | — |

The child interface shows no counts, streaks, reading level, or comparisons (`BR-kid-no-metrics`; `UI-kid-no-metrics` in the SRS). Quality attributes: `USE-child-first-run` (a child finds the shelf without adult help).

**Related Use Cases:** `UC-SHLF-kid-move-book`, `UC-SHLF-kid-remove-book`, `UC-SHLF-kid-rate-book`, `UC-SHLF-kid-add-note` (all invoked from step 5); `UC-REC-kid-review` (the flow that places accepted books here); `UC-SHLF-parent-view-shelf` (the parent's view of the same data)\
**Assumptions:** Books reach the shelf through `UC-REC-kid-review` or, with parent approval, through `UC-SHLF-manual-search`. `UC-SHLF-kid-move-book` only changes a book already on the shelf.\
**Open Issues:**
- Whether a shelf entry for a blocked book should stay hidden from the child or be shown as unavailable is undecided (extension 3b is a team proposal).
- `FR-SHLF-categories` is marked for client confirmation.

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

| Property name | Data type | Validation rule | Security or access concerns | Glossary reference |
|---|---|---|---|---|
| Shelf category | enum: Reading Now, Want to Read, Maybe Later, Finished | required; must be one of the four | Child-set; visible to the parent | Shelf (`FEAT-shelf`) |
| Last moved at | timestamp | system-set on each successful move | Not shown to the child; used for display order | — |

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

| Property name | Data type | Validation rule | Security or access concerns | Glossary reference |
|---|---|---|---|---|
| Confirmation | boolean | required; the child must actively confirm | Child-set | — |
| Retained rating and reflection | reference | kept after the shelf entry is removed; deleting a reflection is a separate action in `UC-SHLF-kid-add-note` | Rating and reflection stay with the child's record for the recommender; parent-visible; admin visibility of the reflection TBD (`OI-15`) | — |

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

**Priority:** Medium — `FEAT-ratings` is in the MVP, but the MVP recommender is rules-based and does not read ratings yet, so this does not block the core recommendation loop.\
**Frequency of Use:** Once per finished book; roughly one to two per active child per week (estimate).\
**Business Rules:** `BR-kid-no-metrics`

**Associated Information:**

| Property name | Data type | Validation rule | Security or access concerns | Glossary reference |
|---|---|---|---|---|
| Rating | enum from the current scale | required when set; must be on the scale | Child-set; visible to the child and parent; never visible to the system admin (`BR-admin-limited-view`) | Rating |
| Rated at | timestamp | system-set on each save | Parent-visible | — |

**The rating scale is not decided.** `FEAT-ratings` (vision-and-scope §4.2) records a conflict: the 2026-09-24 notes say "stars or thumbs," while the 2026-09-25 flowchart shows four options: loved it, liked it, it was okay, not for me. Until the scale is confirmed (`OI-17`, cited in `vision-and-scope.md` but not yet filed in `OPEN-ISSUES.md`), the Rating field and step 2 use the flowchart's four options as a placeholder only and must not be built as final. The glossary's "community aggregate" rating is not part of the MVP, because `FEAT-ratings` drops the peer and social layer.

**Related Use Cases:** `UC-SHLF-kid-move-book` (offers this from step 6); `UC-SHLF-kid-view-shelf` (where the rating shows); `UC-SHLF-parent-view-shelf` (where the parent sees it)\
**Assumptions:** The rating does not change the MVP's rules-based recommendations. It becomes an input only in the later ML stage (`FEAT-ai-recommendation`, Stage 2).\
**Open Issues:**
- Rating scale: stars or thumbs, or the four-option flowchart scale (`OI-17`). This blocks the field definition and step 2.
- The 2026-09-24 notes say to keep rating weight low early on, which conflicts with the "rated highly" weight in `BR-similarity-signal-weights`. Relevant only to the later ML stage.

---

### UC-SHLF-kid-add-note: Write a Reflection After Finishing a Book

**UC ID and Name:** `UC-SHLF-kid-add-note`: Write a Reflection After Finishing a Book\
**Created By:** _Claude_\
**Date Created:** _2026-10-04_\
**Primary Actor:** A Child\
**Secondary Actors:** A Parent (receives an in-app alert if the reflection is flagged); the System Admin (receives an alert if the reflection is flagged, content visibility TBD)\
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

| Property name | Data type | Validation rule | Security or access concerns | Glossary reference |
|---|---|---|---|---|
| Reflection text | string | optional; must not be blank to save; character limit TBD (team proposal: 500) | Always visible to the parent (`BR-notes-visible-to-parent`); never private (`SEC-no-private-notes`); admin visibility of its content is TBD (`OI-15`) | — |
| Flag status | enum: none, flagged | system-set by the content check; not editable by the child | Visible to the parent and the system admin | — |
| Flag category | enum: violence, self-harm | system-set when flagged | Visible to the parent; admin visibility TBD (`OI-15`) | — |
| Saved at | timestamp | system-set on each save | Parent-visible | — |
| Deletion state | enum: active, pending deletion, deleted | system-set; "pending deletion" lasts 24 hours from the child's confirmation; only an unflagged reflection can enter it | Pending-deletion reflections are hidden from the child and parent; admin review access TBD (`OI-15`) | — |

A child can delete their own reflection only if it is not flagged. Removing a book from the shelf never deletes a reflection (see `UC-SHLF-kid-remove-book`). The parent may remove flagged content under `BR-parent-content-removal`.

**Related Use Cases:** `UC-SHLF-kid-view-shelf` (invokes this use case from a Finished book); `UC-SHLF-parent-view-shelf` (where the parent reads the reflection); `UC-SHLF-kid-remove-book` (keeps the reflection when the book is removed); `UC-REC-kid-onboarding` (the disclosure this use case relies on)\
**Assumptions:** A child can edit a saved reflection, and the edit replaces it. The reflection is stored now for parent review; its use by the recommender is a later stage.\
**Open Issues:**
- **Admin alert content.** `BR-admin-limited-view` says admin sees no child details, but `BR-note-safety-flagging` routes flagged notes to the admin. The rule text flags this conflict, and `OI-15` is open. Until it is decided, the admin alert in step 6 must not show reflection content.
- **Detection method.** How violence and self-harm content is detected, its accuracy, and how false positives are handled are not specified anywhere.
- **Reporting to authorities.** The client's 2026-09-24 wording says flagged content goes to "parents and authorities." This use case covers only the parent and admin. The rest is `OI-18`, cited in `vision-and-scope.md` but not yet filed in `OPEN-ISSUES.md`.
- **Disclosure wording.** `BR-flagging-disclosure` is referenced in `business-rules.md` as open and is not defined in the rules file.
- **Child notification.** Whether the child is told when their reflection is flagged is not specified.
- **Character limit.** The 500-character figure is a team proposal and needs client input.
- **Recommender use.** `FEAT-kid-reflections` says reflections feed the recommender, but the MVP recommender is rules-only. Whether reflections are used in the MVP is undecided.
- **Pending deletion.** The 24-hour pending-deletion window and restore are the client's rule as now described to the team; no source yet confirms the length or the child's restore right. Also undecided: whether a pending-deletion reflection still feeds the recommender during the window.
- **Admin review.** The admin should be able to review a reflection during its pending-deletion window. No use case in the ADM area covers this yet, and the admin's access to reflection content is blocked by `OI-15`.
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
- 5c. The child's rating and reflection for the book are not deleted by this use case. Whether they remain visible to the parent once the entry is gone is undecided (see Open Issues).

**Priority:** Medium — `BR-parent-shelf-removal` is confirmed, but removal is an occasional correction rather than a routine step.\
**Frequency of Use:** Occasional; a few times per family per month (estimate).\
**Business Rules:** `BR-parent-shelf-removal`, `BR-parent-ultimate-say`, `BR-parent-account-linked`

**Associated Information:**

| Property name | Data type | Validation rule | Security or access concerns | Glossary reference |
|---|---|---|---|---|
| Removal notice | in-app message | required whenever a shelf entry is removed by a parent; references the book's title | Visible to the child; wording TBD (see Open Issues); the parent's identity is not shown to the child | — |
| Confirmation | boolean | required; the Parent must actively confirm | Parent-set | — |
| Removed by | reference to the parent account | system-set | Parent-visible; not visible to the child | — |

Quality attributes: `ROB-no-data-loss` (a failed removal leaves the book on the shelf rather than half-removed); `USE-parent-light` (the parent removes a book in two taps plus confirm).

**Related Use Cases:** `UC-SHLF-parent-view-shelf` (invokes this use case from step 1); `UC-SHLF-kid-remove-book` (the child's counterpart, which does not notify anyone)\
**Assumptions:** The parent does not have to give a reason for removal. No source requires one.\
**Open Issues:**
- Notice wording, and whether the child sees a reason, are not specified (`BR-parent-shelf-removal` requires only that a notice is shown).
- Whether a removed book can be recommended again, for example by a later quiz, is not specified.
- Whether the child's rating and reflection stay on record after a parent removes the entry is undecided (see 5c).
- Whether the parent's review under `BR-24hr-review-window` depends on this action is unresolved (`OI-16`, cited in `vision-and-scope.md` but not yet filed in `OPEN-ISSUES.md`).

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
8. A linked parent approves the request.
9. The system adds the book to the child's shelf in the requested category and tells the child in-app. Use case ends.

**Extensions:**

- 1a. The keyword is empty. The system does not search and shows a short prompt to type a word.
- 1b. The keyword is longer than 100 characters. The system shows an inline message and does not search.
- 2a. No active book matches. The system shows a "no books found" message and does not show unrelated books.
- 2b. The search cannot run. The system shows a retry message and no partial results.
- 2c. A blocked book matches. The system omits it (`UC-ADM-block-content`).
- 5a. The book is already on the child's shelf. The system shows its current category and does not create a request.
- 6a. The child already has a pending request for this book. The system shows that it is pending and does not create a duplicate.
- 6b. The child closes the category choice without choosing. No request is created.
- 7a. Recording the request fails. The system shows an error and creates no request; the child may retry.
- 8a. The parent declines. No shelf entry is created. The child is told, in neutral wording (TBD), that the book was not added this time. The request is closed.
- 8b. No parent responds. The request stays pending, and the child sees that it is still waiting. No expiry is defined (see Open Issues).
- 8c. The book is blocked after the request was made but before approval. The system does not add it, and the child is told the book is no longer available.
- 9a. Adding the book to the shelf fails. The approval is not committed, the parent sees an error, and the parent may retry.
- 9b. The book was added to the shelf by another route (for example, a recommendation the child accepted) before approval. The system does not create a duplicate and records the request as already satisfied.

**Priority:** Medium — `FEAT-manual-search` is in the MVP per `vision-and-scope.md` §4.3.\
**Frequency of Use:** A few times per week per active child (estimate).\
**Business Rules:** `BR-parent-ultimate-say` (parent authority over which books a child may access), `BR-parent-account-linked`

**Associated Information:**

| Property name | Data type | Validation rule | Security or access concerns | Glossary reference |
|---|---|---|---|---|
| Keyword | string | required; trimmed; 1–100 characters | Child-entered; used only for this search | — |
| Shelf request | record: book reference, requested category, status, requested at, decided by | status is one of pending, approved, declined, cancelled, already satisfied | Visible to the child and linked parents; never visible to the admin (`BR-admin-limited-view`) | Shelf (`FEAT-shelf`) |
| Requested category | enum: Reading Now, Want to Read, Maybe Later, Finished | required when requesting | Child-set; the parent may see it | — |

Search matches standard catalog fields only. Whether custom tags (`UC-ADM-add-content`) are searchable is open.

**Related Use Cases:** `UC-SHLF-kid-view-shelf` (where an approved book appears); `UC-SHLF-kid-move-book` (after the book is added); `UC-REC-kid-review` (the other route onto the shelf); `UC-ADM-block-content` (removes books from results); `UC-SHLF-parent-remove-book` (a parent may remove the book again later)\
**Assumptions:** Approval applies to one request for one book. It does not approve later requests or other books. A child's approved request is not a standing permission.\
**Open Issues:**
- **Parent-side approval has no use case.** Step 8 needs a parent screen to see and approve or decline pending requests. Whether that is a separate `PAR` use case is undecided.
- **No business rule yet.** The approval requirement is not in `business-rules.md`. It should be added there, with its source, before this use case is built.
- **Expiry.** Whether a pending request expires, and after how long, is not defined (8b).
- **Decline.** The wording the child sees, whether a decline reason is given, and whether the child may ask again after a decline are not defined (8a).
- **Category choice.** Whether a parent can change the requested category when approving is not defined.
- **Recommendations.** Whether accepted recommendations also need parent approval is not specified. Step 9b assumes they do not.
- **Still planned?** The 2026-09-25 flowchart does not show `FEAT-manual-search`. Confirm it is still in the MVP.

---

## [ADM] Admin Feature Area

_The system admin operates the catalog and the system and receives safety alerts. The admin never sees a child's details: the admin may see parent credentials and the number of child accounts under each parent (`BR-admin-limited-view`). Two admin-visibility questions are open and affect several use cases below: `FEAT-admin-pii-segregation` is in the MVP but its scope is in conflict (`OI-15`, cited in `vision-and-scope.md`, not yet filed in `OPEN-ISSUES.md`), and what the admin sees of a flagged reflection is undecided. Admin account creation (`UC-ADM-add-admin`) is post-MVP and not written here._

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

| Property name | Data type | Validation rule | Security or access concerns | Glossary reference |
|---|---|---|---|---|
| Title | string | required | Admin-set; visible to children and parents | Seed Catalog |
| Author | string | required | Admin-set; visible to children and parents | Seed Catalog |
| ISBN | string | optional; must be a valid ISBN-10 or ISBN-13 when given (team proposal) | Admin-set | — |
| Standard tags (genre, mood, format, themes, length, age fit, reading level) | enum each | each value must come from its approved list; lists TBD (`OI-1`) | Admin-set; used by the recommender | — |
| Custom tags | list of strings | optional; each entry trimmed and case-normalized; 1–30 characters; must not duplicate an existing custom tag (team proposal) | Admin-created; shared across the catalog; whether children see them is TBD | — |
| Catalog status | enum: draft, active, blocked | system-set; new books are draft until tagged, then active | Admin-visible; see `UC-ADM-block-content` | — |

Only the admin role may write catalog data (`SEC-role-authorization`). A failed save leaves the catalog unchanged.

**Related Use Cases:** `UC-ADM-block-content` (the reverse action); `UC-PAR-suggest-book` (requires the book to exist in the catalog); `UC-REC-recommend-quiz-rules` (draws only from active, tagged books)\
**Assumptions:** The seed catalog is loaded in bulk from the approved dataset, and this use case handles single additions and corrections of new entries only. Custom tags are free-form labels for the admin's own use. They are shared across the catalog, they do not replace standard tags, and the rules engine does not use them unless the client says so.\
**Open Issues:**
- The catalog's source dataset is not chosen (`OI-1`), so there is no approved tag list to validate against.
- Whether custom tags such as "Cute," "Scary but Warming," and "Friends" are shown to children, used by the rules-based recommender, or used only for admin browsing is not specified.
- Who may create custom tags, rename them, or delete them is not specified. This use case allows any admin to create one.
- The normalization rule (case, spacing, and whether plurals such as "Friend" and "Friends" are merged) and the 30-character limit are team proposals that need client input.
- Whether an admin may edit tags on an existing book is not covered. It would need its own use case.
- Whether ISBN is required for de-duplication is a team proposal.

---

### UC-ADM-block-content: Block a Catalog Book

**UC ID and Name:** `UC-ADM-block-content`: Block a Catalog Book\
**Created By:** _Claude_\
**Date Created:** _2026-10-04_\
**Primary Actor:** A System Admin\
**Secondary Actors:** none\
**Trigger:** The admin taps "Block book" on a catalog book.\
**Description:** An admin removes a catalog book from every child's view and from every recommendation list without deleting it. This is the admin's content-safety control under `SAF-child-content`. Existing shelf entries are kept on record, so nothing a child or parent has done is lost.

**Preconditions:**

- PRE-1. The admin is logged in with the admin role.
- PRE-2. The book exists in the catalog and is not already blocked.

**Postconditions:**

- POST-1. The book's status is blocked, with the reason, the admin, and the time recorded.
- POST-2. The book does not appear in any recommendation, quiz result, or keyword search result (`FEAT-manual-search`).
- POST-3. The book is removed from every child's recommendation list.
- POST-4. Existing shelf entries for the book are kept on record: hidden from the child, and shown to the parent as no longer available (`UC-SHLF-kid-view-shelf` 3b, `UC-SHLF-parent-view-shelf` 5b).

**Main Success Scenario:**

1. The admin opens a catalog book.
2. The admin taps "Block book."
3. The system asks the admin to choose a reason and to confirm.
4. The admin chooses a reason and confirms.
5. The system sets the book to blocked and removes it from recommendation lists and search results, in one save.
6. The system records the block and shows the book as blocked in the catalog. Use case ends.

**Extensions:**

- 2a. The book is already blocked. The system shows its status and the recorded reason; no change.
- 3a. The admin cancels. No change.
- 4a. No reason is chosen. The system does not allow confirmation.
- 5a. Removing the book from recommendation lists fails part way. The system does not commit the block, shows an error, and the admin may retry. The book is never left half-blocked.
- 5b. A child has the book open when it is blocked. The book is hidden the next time the child's screen loads; the system does not force-close the child's session.

**Priority:** High — this is the admin's safety control over what children see.\
**Frequency of Use:** Rare; only when content is found to be unsuitable or an error is found.\
**Business Rules:** None in `business-rules.md` governs blocking directly. Required by `SAF-child-content` in the SRS.

**Associated Information:**

| Property name | Data type | Validation rule | Security or access concerns | Glossary reference |
|---|---|---|---|---|
| Catalog status | enum: active, blocked | required; changed only by this use case or its reverse | Admin-visible only | — |
| Block reason | enum: age-inappropriate, content concern, data error, other (team proposal) | required when blocking | Admin-visible only; never shown to children | — |
| Blocked by | reference to the admin account | system-set | Admin-visible only | — |
| Blocked at | timestamp | system-set | Admin-visible only | — |

**Related Use Cases:** `UC-ADM-add-content` (the book was added there); `UC-SHLF-kid-view-shelf` and `UC-SHLF-parent-view-shelf` (how existing shelf entries appear after a block); `UC-REC-recommend-quiz-rules` (no longer offers blocked books)\
**Assumptions:** Blocking is reversible in principle, but unblocking is not in scope here, and no source describes it.\
**Open Issues:**
- The reason list is a team proposal and needs client input.
- Whether a parent is told when a block removes a book from their child's shelf or recommendations is not specified.
- Whether a block should also remove the book from existing shelves, rather than hiding it, is undecided. This use case keeps shelf records.
- There is no unblock use case. Whether one is needed is not specified.

---

### UC-ADM-suspend-account: Suspend a Child Account

**UC ID and Name:** `UC-ADM-suspend-account`: Suspend a Child Account\
**Created By:** _Claude_\
**Date Created:** _2026-10-04_\
**Primary Actor:** A System Admin\
**Secondary Actors:** A Parent (is notified of the suspension)\
**Trigger:** The admin taps "Suspend account" on a child account. This is a proposed trigger; see Assumptions and Open Issues.\
**Description:** An admin suspends a child's account so the child can no longer sign in or request recommendations, while keeping the account's data. The sources do not give the admin this power. The only suspension described is the 24-hour review rule (`BR-24hr-review-window`), which is unconfirmed (`OI-16`). **Do not build this use case until the client confirms who may suspend an account and on what grounds.**

**Preconditions:**

- PRE-1. The admin is logged in with the admin role.
- PRE-2. The child account exists and is active.

**Postconditions:**

- POST-1. The child account's status is suspended, with the reason, the admin, and the time recorded.
- POST-2. The child cannot start a child session or request recommendations while suspended.
- POST-3. The child's data is kept; suspension does not delete anything.
- POST-4. The parent has been notified that the account is suspended.

**Main Success Scenario:**

1. The admin finds the account by its account reference and the parent's credentials. The admin does not see the child's name, age, or grade (`BR-admin-limited-view`).
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

**Priority:** Medium — blocked until the client confirms the authority and grounds for suspension (`OI-16`).\
**Frequency of Use:** Rare.\
**Business Rules:** `BR-24hr-review-window` (flagged for reconfirmation; applies only if it stands), `BR-admin-limited-view`

**Associated Information:**

| Property name | Data type | Validation rule | Security or access concerns | Glossary reference |
|---|---|---|---|---|
| Account status | enum: active, suspended | required; changed only by this use case or its reverse | Admin-visible; parent-visible | — |
| Suspension reason | enum: safety flag, review non-compliance, other (team proposal) | required when suspending | Admin-visible; parent-visible | — |
| Account reference | opaque identifier | required; never derived from the child's name | Admin-visible; the only child identifier the admin sees | — |

**Related Use Cases:** `UC-ADM-block-content` (the other admin control); `UC-SHLF-kid-add-note` (a safety-flagged reflection is one possible trigger, if the client confirms it); `UC-REC-parent-review` (a suspended child receives no recommendations)\
**Assumptions:** Suspension is not deletion; the child's data stays on record. Reinstatement is not covered here and would need its own use case.\
**Open Issues:**
- **Authority:** No source says an admin may suspend an account. `OI-16` covers only the automatic 24-hour rule, and it is unconfirmed.
- **Grounds:** Whether a safety flag, an unreviewed 24-hour window, or both can suspend an account is undecided.
- **Reinstatement:** How and by whom a suspended account is restored is not specified.
- **Notification channel:** Whether the parent is notified in-app only or also by email is not specified (`CI-in-app-alerts`).

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

| Property name | Data type | Validation rule | Security or access concerns | Glossary reference |
|---|---|---|---|---|
| Date range | start and end dates | required; end not before start | Admin-only | — |
| Aggregate figures | counts and rates | each figure must meet the small-cell threshold in 3b | Admin-only; no child identifiers, names, ages, or grades | Recommender |
| Small-cell threshold | integer | 5 (team proposal; client to confirm) | Not shown to the admin | — |

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

| Property name | Data type | Validation rule | Security or access concerns | Glossary reference |
|---|---|---|---|---|
| Date range | start and end dates | required; end not before start | Admin-only | — |
| Account counts | integers | parent accounts overall; child accounts per parent | Admin-only; parent credentials are not shown here | — |
| Active account counts | integers | a figure below 5 is shown as "not enough data" (team proposal) | Admin-only | — |

**Related Use Cases:** `UC-ADM-view-recommender-stats` (sister page); `UC-PAR-onboarding` and `UC-PAR-create-kid-account` (the source of account records)\
**Assumptions:** "Active" means a session in the date range; the definition is a team proposal.\
**Open Issues:**
- The figure list, and the definition of "active," need client input.
- The success metrics in `vision-and-scope.md` §2.3 have no targets yet, so this page has no thresholds to report against.

---

_**Gap:** admin review of flagged reflections and of reflections pending deletion (`UC-SHLF-kid-add-note`) has no use case yet. It may belong in this area, and the admin must not see reflection content until `OI-15` is settled._

---

## Working these with your agent

_[Delegate: drafting the main success scenario once you have the trigger and the goal; proposing extensions you have not thought of, which it is genuinely good at; turning a filled-in use case into a first set of test cases; checking that every `BR-*` you cite exists in [business-rules.md](business-rules.md).]_

_Keep human: whether this is one use case or three, what the priority is, and whether an extension the agent proposed is a real path in your client's business or a generic one it has seen elsewhere. "The system handles concurrent edits" is a real requirement for some projects and invented complexity for others, and only you have met the client._

_The verification that catches the most: read the main success scenario aloud to someone who has not read the document, and stop wherever they ask a question. Every question is a missing step or a missing extension._

_**Checklist for each use case:** Does the name start with a verb? Can the system test every precondition? Does every step alternate actor and system? Is there at least one extension per step that can fail? Does every business rule appear as an identifier only? Could a tester write test cases from this without asking you anything?_
