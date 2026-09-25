# Use Cases

**Project:** Book Buddies\
**Team:** Team 5\
**Client:** Yang Yang, Research Scientist IBR/Knight D Research\
**Version:** 0.1

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

| Date           | Version | Description                           | Author                |
|----------------|---------|---------------------------------------|-----------------------|
| _[2026-09-13]_ | 0.1     | File setup and ready for feature list | _Grayson Whittingham_ |
| _[2026-09-17]_ | 0.2     | Added Area Codes                      | _Grayson Whittingham_ |
| _[2026-09-17]_ | 0.3     | Added Scope and First Use Case        | _Grayson Whittingham_ |
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

| Area code | Feature area                | Use cases                                  |
|-----------|-----------------------------|--------------------------------------------|
| _[RUB]_   | _[Rubric, from `FEAT-...`]_ | _[`UC-RUB-...`]_                           |
| [PAR]     | [Parent from `FEAT...`]     | [`UC-PAR-create-sub-parent-account`,`etc`] |
| [SHLF]    | [Shelf, from `FEAT...`]     | [`None`]                                   |
| [REC]     | [Recommend, from `FEAT...`] | [`None`]                                   |
| [ADM]     | [Admin, from `FEAT...`]     | [`None`]                                   |
---

## 4. Use Cases

_[One `###` heading per use case, grouped under a `##` heading per area. Worked example below, taken from Project Pulse. Delete it and write your own.]_

## [PAR] Parent Feature Area

### UC-PAR-create-sub-parent-account: A Parent Creates A Sub Parent Account

**UC ID and Name:** `UC-PAR-create-sub-parent-account`: A Parent Creates A Sub Parent Account\
**Created By:** _Grayson Whittingham_\
**Date Created:** _[2026-09-25]_\
**Primary Actor:** A Parent\
**Secondary Actors:** none\
**Trigger:** The parent taps add sub parent on account management \
**Description:** A parent creates a sub parent account to allow the sub parent to manage the children's reading listed under the Main Parent Account.

**Preconditions:**

- PRE-1. The Parent is logged into system.
- PRE-2. The Parent is the Main Parent.

**Postconditions:**

- POST-1. A Sub Parent account is created.
- POST-2. The Sub Parent can log in to the Sub Parent Account.

**Main Success Scenario:**

1. The Parent taps 'Add Sub Parent Account'.
2. The Parent enters name and email of the Sub Parent.
3. The Parent taps confirm on a pop-up notifying that the Sub Parent will have the same access to the child as you except for creating and deleting accounts.
4. Use case ends.

**Extensions:**

**Priority:** Medium\
**Frequency of Use:** Occasional; mostly at account setup.\
**Business Rules:** `Business Rules are outdated.

**Associated Information:**
n/a

**Related Use Cases:** `UC-PAR-sub-parent-set-up`: A Sub Parent Sets Up A Sub Parent Account\
**Assumptions:** none\
**Open Issues:** none

---

## Working these with your agent

_[Delegate: drafting the main success scenario once you have the trigger and the goal; proposing extensions you have not thought of, which it is genuinely good at; turning a filled-in use case into a first set of test cases; checking that every `BR-*` you cite exists in [business-rules.md](business-rules.md).]_

_Keep human: whether this is one use case or three, what the priority is, and whether an extension the agent proposed is a real path in your client's business or a generic one it has seen elsewhere. "The system handles concurrent edits" is a real requirement for some projects and invented complexity for others, and only you have met the client._

_The verification that catches the most: read the main success scenario aloud to someone who has not read the document, and stop wherever they ask a question. Every question is a missing step or a missing extension._

_**Checklist for each use case:** Does the name start with a verb? Can the system test every precondition? Does every step alternate actor and system? Is there at least one extension per step that can fail? Does every business rule appear as an identifier only? Could a tester write test cases from this without asking you anything?_
