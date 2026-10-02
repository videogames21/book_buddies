# Use Cases

**Project:** Book Buddies\
**Team:** Team 5\
**Client:** Yang Yang, Research Scientist IBR/Knight D Research\
**Version:** 0.5

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
| `SHLF`    | Shelf — tracking and rating what a child has read (`FEAT-shelf`, `FEAT-ratings`, `FEAT-manual-search`)                    | `UC-SHLF-parent-view-shelf`, `UC-SHLF-kid-view-shelf`, `UC-SHLF-kid-move-book`, `UC-SHLF-kid-remove-book`, `UC-SHLF-kid-rate-book`, `UC-SHLF-kid-add-note`, `UC-SHLF-parent-remove-book` |
| `REC`     | Recommend — picture-quiz and (later) AI-assisted recommendations (`FEAT-recommendation-quiz`, `FEAT-reading-level-baseline`, `FEAT-ai-recommendation`) | `UC-REC-kid-onboarding`, `UC-REC-recommend-quiz-rules`, `UC-REC-recommend-quiz-ai`, `UC-REC-parent-review`, `UC-REC-kid-review`                                    |
| `ADM`     | Admin — PII-segregated content and system oversight (`FEAT-admin-pii-segregation`)                                        | `UC-ADM-suspend-account`, `UC-ADM-add-content`, `UC-ADM-block-content`, `UC-ADM-view-recommender-stats`, `UC-ADM-view-usage-stats`                                 |

Notes on the table above:

- `UC-PAR-create-sub-parent-account` is the identifier already specified in section 4 below; it replaces an earlier, inconsistent name for the same use case (`UC-PAR-create-second-parent-account`) that appeared in a draft version of this list. Per the identifier rule in this document, the already-specified name wins and is never renamed.
- `UC-PAR-suggest-book` and `UC-PAR-view-growth-report` correspond to `FEAT-adult-influence-notes` and `FEAT-recap-adult` respectively. Both features are defined in `vision-and-scope.md` §4.2 but are not yet placed in either the in-scope or out-of-scope list in §4.3 — flag this gap with the client rather than assuming MVP inclusion.
- The `REC` use cases form two alternative flows that converge on the same downstream steps: `UC-REC-recommend-quiz-rules` → `UC-REC-parent-review` → `UC-REC-kid-review`, and `UC-REC-recommend-quiz-ai` → `UC-REC-parent-review` → `UC-REC-kid-review`. `FEAT-ai-recommendation` (and therefore `UC-REC-recommend-quiz-ai`) is explicitly out of scope for the MVP per §4.3 — carry that priority into the detailed use case.
- `UC-ADM-add-content` and `UC-ADM-block-content` depend on `FEAT-book-tagging`, which `vision-and-scope.md` §4.3 lists as out of scope for the MVP pending `OI-1`/`OI-2`. Scope these as low priority until the seed-catalog source and tagging scheme are settled.

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
**Description:** A parent creates the Main Parent account that every linked child account will hang off of. This is the first use case in the system for any new family, since `BR-parent-account-linked` requires every child account to be linked to a parent account.

**Preconditions:**

- PRE-1. No existing parent account is registered under the email address the user supplies.

**Postconditions:**

- POST-1. A new Main Parent account exists, linked to the supplied email.
- POST-2. The parent is logged in.
- POST-3. At least one child account exists, linked to the new parent account — a parent account cannot exist without a linked child, so the system carries the Parent directly into `UC-PAR-create-kid-account` before this use case is considered complete.

**Main Success Scenario:**

1. The Parent taps "Create Account."
2. The system displays a sign-up form requesting name, email, and password.
3. The Parent enters their name, email, and password, and submits the form.
4. The system validates the email format and checks that it is not already registered.
5. The system creates the Main Parent account and logs the Parent in.
6. The system immediately invokes `UC-PAR-create-kid-account`, since a parent account cannot exist without at least one linked child.
7. Use case ends once `UC-PAR-create-kid-account` completes successfully.

**Extensions:**

- 3a. The Parent cancels before submitting. Use case ends; no account is created.
- 4a. The email is already registered to an existing account. The system displays an error and offers a sign-in or password-reset link instead; returns to step 3.
- 4b. The email is not a valid email format. The system displays an inline validation error; returns to step 3.
- 4c. The password does not meet the minimum strength policy. The system displays an inline validation error; returns to step 3.
- 5a. The system fails to persist the new account (e.g., database timeout). The system displays an error and does not log the parent in; no partial account record is left behind.
- 6a. The Parent abandons the flow during `UC-PAR-create-kid-account` (e.g., closes the app, navigates away) before a child account is created. The system keeps the Main Parent account but does not treat onboarding as finished — on the Parent's next login, the system routes them straight back into `UC-PAR-create-kid-account` before allowing access to anything else, rather than restarting this use case.

**Priority:** High — nothing else in the `PAR` area can happen without a parent account.\
**Frequency of Use:** Once per family, at signup; rare after that.\
**Business Rules:** `BR-parent-account-linked`

**Associated Information:**

| Property name | Data type | Validation rule | Security or access concerns | Glossary reference |
|---|---|---|---|---|
| Parent name | string | required | Visible to the parent and any linked sub parent; never visible to the system admin (`BR-admin-no-pii`) | — |
| Email | string | required; valid email format; unique across parent accounts | Used for login and account recovery only | — |
| Password | string | required; meets a minimum strength policy (exact rule TBD) | Stored hashed; never visible to anyone, including admin | — |

If account creation fails partway (step 5a), the operation rolls back completely — no row is written for the account, so a retry with the same email does not collide with a half-created record.

**Related Use Cases:** `UC-PAR-create-kid-account` (invoked immediately, in step 6, as a mandatory continuation of this use case — not optional)\
**Assumptions:** none beyond what's listed in Open Issues.\
**Open Issues:** `OI-8` is now resolved — `vision-and-scope.md` §2.7 `AS-parent-account-first` confirms (2026-09-24) that a parent account always exists before any child account, a child cannot self-register, and one parent account can manage multiple children. This use case's parent-first ordering is therefore the client-confirmed design, not an assumption.

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
- PRE-2. The Parent has a Main or Sub Parent account in good standing (not suspended under `BR-24hr-review-window`). *Whether account suspension for a missed 24-hour review still exists at all is itself unresolved as of `vision-and-scope.md` v0.4 — see `OI-16` and the Open Issues note below.*

**Postconditions:**

- POST-1. A child profile exists, linked to the Parent's account.
- POST-2. The child profile includes the child's name, age, grade, and avatar; it includes a reading level only if the Parent chose to enter one.

**Main Success Scenario:**

1. The Parent arrives at this use case either straight from `UC-PAR-onboarding` (first child) or by tapping "Add a Child" from the account dashboard (additional child).
2. The system displays a form requesting the child's name, age, grade, an optional reading level, and an avatar/character selection.
3. The Parent enters the child's name, age, and grade; optionally enters the child's reading level, or skips it; and selects an avatar.
4. The system validates the entered values.
5. The system creates the child profile, linked to the Parent's account, with the entered name, age, grade, and (if given) reading level available to the recommender.

**Extensions:**

- 1a. The Parent cancels before completing the form. If this is the family's first child (arrived via `UC-PAR-onboarding`), the use case ends without a profile, which triggers `UC-PAR-onboarding`'s extension 6a on the Parent's next login. If this is an additional child (arrived via "Add a Child"), the use case simply ends with no new profile created.
- 4a. The child's name is empty. The system displays an inline validation error; returns to step 3.
- 4b. The age entered is outside the product's target age band (roughly 6–11, per `vision-and-scope.md` §2.4). The system warns the Parent but does not necessarily block the entry (see Open Issues — whether a sibling outside the target band should be allowed is unconfirmed).
- 4c. The grade entered is not a recognized school grade. The system displays an inline validation error; returns to step 3.
- 4d. The Parent enters a reading level that does not match the expected scale or range. The system displays an inline validation error and shows the accepted scale/format; returns to step 3. Skipping the field entirely is not an error, per `FEAT-reading-level-input`.
- 5a. The system fails to persist the child profile (e.g., database timeout). The system displays an error; no partial child record is left behind.

**Priority:** High — a family cannot use any `SHLF` or `REC` feature without a child profile, and per `UC-PAR-onboarding` a parent account cannot exist without one either.\
**Frequency of Use:** Once per family immediately after onboarding (first child), with occasional repeats for additional children.\
**Business Rules:** `BR-parent-account-linked`, `BR-admin-no-pii` (the child's name and age are now real identifying information collected at creation, so admin-side PII segregation must hold at the data layer, not just the UI — see Open Issues, since whether admin sees any PII at all is itself now contradicted in the client's own notes)

**Associated Information:**

| Property name | Data type | Validation rule | Security or access concerns | Glossary reference |
|---|---|---|---|---|
| Child's name | string | required | PII; visible to the parent; never visible to the system admin (`BR-admin-no-pii`), pending `OI-15` | — |
| Age | integer | required; expected range roughly 6–11 (see 4b and Open Issues) | PII-adjacent; visible to the parent; used by the recommender; never visible to the system admin (`BR-admin-no-pii`), pending `OI-15` | — |
| Grade | string/enum (e.g., K–6) | required; must be a recognized school grade | Visible to the parent; used by the recommender; never visible to the system admin (`BR-admin-no-pii`), pending `OI-15` | — |
| Reading level | string/number (scale TBD — see Open Issues) | optional; manually entered by the parent, or skipped, per `FEAT-reading-level-input`; not assessed by the system | Visible to the parent; used by the recommender if given; never visible to the system admin (`BR-admin-no-pii`), pending `OI-15` | Lexile (Lexile Framework), Accelerated Reader (AR) |
| Avatar | enum / image reference | required; selected from a provided set | Visible to the parent and child | Kid-Facing Profile |

**Related Use Cases:** `UC-PAR-onboarding` (invokes this use case immediately for the first child)\
**Assumptions:** Assumes no hard limit on the number of children one parent account can link; not yet confirmed with the client.\
**Open Issues:**
- The earlier conflict here — manual parent entry vs. an in-app baseline test — is now **resolved in this use case's favor**: `vision-and-scope.md` v0.4 withdrew `FEAT-reading-level-baseline` (no in-app test, confirmed 2026-09-24) in favor of `FEAT-reading-level-input` (optional parent-entered reading level), matching this use case. `business-rules.md` §2.1 still carries the older flag describing the in-app test as the confirmed design — it has not caught up to this revision and should be corrected.
- `FEAT-onboarding-profile` in `vision-and-scope.md` §4.2 — the feature this use case implements — also lists **reading interests** and **favorite books already read** as part of the onboarding profile, alongside age/grade/reading level. Neither field is currently captured by this use case. Needs a decision: fold them into this form, or split them into a separate onboarding/profile-quiz use case (e.g., in the `REC` area) that runs right after this one.
- `OI-15`: the client's own 2026-09-24 notes disagree with each other on whether the system admin can see any PII at all (one note says admin sees "personal data, user credentials"; another says admin sees only parent credentials and a child-account count). This use case's `BR-admin-no-pii` citations assume the stricter reading and should be revisited once `OI-15` is answered.
- `OI-16`: whether the 24-hour review/suspension rule (cited in PRE-2) still applies at all is unresolved — absent from every 2026-09-24 source, with one raw client note saying "take out parent approval option." If it's removed, PRE-2 needs to drop the suspension clause.
- Which reading-level scale or format the manual input should accept (Lexile, AR, a grade-equivalent number, a simple low/medium/high picker, etc.) is not specified anywhere in the current requirements docs.
- Whether this use case, and the product generally, needs to support a child outside the roughly 6–11 target age band (see extension 4b) is not specified.
- Dropping the nickname/avatar-only requirement removes the premise behind `BR-kid-anonymous-profile` in `business-rules.md` §2.1 (hiding a child's identity from other users), now reinforced by `vision-and-scope.md` v0.4 confirming the peer-feed and groups features it protected against are withdrawn entirely. That business rule should be revisited or retired rather than left standing unchanged.

---

### UC-PAR-suggest-book: Suggest a Book to a Child

**UC ID and Name:** `UC-PAR-suggest-book`: Suggest a Book to a Child\
**Created By:** _Claude_\
**Date Created:** _2026-10-01_\
**Primary Actor:** A Parent\
**Secondary Actors:** A Child (recipient of the suggestion)\
**Trigger:** The Parent taps "Suggest to [child]" from a book's detail page or search results.\
**Description:** A parent directly suggests a specific catalog book to their child, surfacing it in the child's recommendations or shelf without exposing the parent's private reasoning to the child. This use case corresponds to `FEAT-adult-influence-notes`, which `vision-and-scope.md` §4.2 defines but §4.3 does not yet place in or out of MVP scope.

**Preconditions:**

- PRE-1. The Parent is logged in.
- PRE-2. The Parent has at least one linked child account.
- PRE-3. The book being suggested exists in the seed catalog.

**Postconditions:**

- POST-1. The book appears to the child, labeled as a suggestion from their grown-up.
- POST-2. Any private note the Parent entered is stored but never surfaced to the child, per `BR-adult-influence-hidden`.

**Main Success Scenario:**

1. The Parent finds a book and taps "Suggest to [child]."
2. The system displays a confirmation screen with an optional private note field.
3. The Parent confirms the suggestion, with or without a note.
4. The system records the suggestion against the child's profile.
5. The system surfaces the book to the child the next time they view recommendations or their shelf, labeled only as a grown-up suggestion — any note text is withheld.

**Extensions:**

- 1a. The Parent has more than one linked child. The system asks which child to suggest the book to before continuing.
- 3a. The Parent cancels before confirming. Use case ends; no suggestion is recorded.
- 4a. The book is already on the child's shelf. The system notifies the Parent and asks whether to suggest it anyway or cancel.
- 5a. The child never logs in to see the suggestion. The suggestion remains pending indefinitely; no expiry is currently defined (see Open Issues).

**Priority:** Low-to-Medium, pending the scope confirmation noted below.\
**Frequency of Use:** Occasional; whenever a parent spots a book they think fits their child.\
**Business Rules:** `BR-adult-influence-hidden`

**Associated Information:**

| Property name | Data type | Validation rule | Security or access concerns | Glossary reference |
|---|---|---|---|---|
| Book reference | reference | required; must exist in the seed catalog | Visible to parent and child (as a suggestion only) | Seed Catalog |
| Private note | string | optional, free text | Parent-only; never shown to the child (`BR-adult-influence-hidden`); never visible to the system admin (`BR-admin-no-pii`) | Adult Influence |

**Related Use Cases:** `UC-SHLF-kid-view-shelf`, `UC-REC-recommend-quiz-rules` (suggestions surface alongside regular recommendations)\
**Assumptions:** none beyond what's listed in Open Issues.\
**Open Issues:** This use case depends on `FEAT-adult-influence-notes`, which is defined in `vision-and-scope.md` §4.2 but not yet placed in the in-scope or out-of-scope MVP list in §4.3 — raise with the client before committing engineering time. Whether a pending suggestion ever expires is also undefined. Recommend filing both as new entries in `OPEN-ISSUES.md`.

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

---

## Working these with your agent

_[Delegate: drafting the main success scenario once you have the trigger and the goal; proposing extensions you have not thought of, which it is genuinely good at; turning a filled-in use case into a first set of test cases; checking that every `BR-*` you cite exists in [business-rules.md](business-rules.md).]_

_Keep human: whether this is one use case or three, what the priority is, and whether an extension the agent proposed is a real path in your client's business or a generic one it has seen elsewhere. "The system handles concurrent edits" is a real requirement for some projects and invented complexity for others, and only you have met the client._

_The verification that catches the most: read the main success scenario aloud to someone who has not read the document, and stop wherever they ask a question. Every question is a missing step or a missing extension._

_**Checklist for each use case:** Does the name start with a verb? Can the system test every precondition? Does every step alternate actor and system? Is there at least one extension per step that can fail? Does every business rule appear as an identifier only? Could a tester write test cases from this without asking you anything?_
