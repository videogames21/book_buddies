# Business Rules

**Project:** BookBuddies
**Team:** _[Team NN]_
**Client:** Yang Yang
**Version:** 0.1

---

_**How to use this template.** Instructions appear in italic square brackets. Fill in underneath them and leave them in place until the document is stable._

_**What a business rule is.** A corporate policy, a government regulation, a law, an industry standard, or a computational formula. Business rules are a rich source of requirements, because they dictate properties your system must have in order to conform to them._

_**What a business rule is not: a software requirement.** This is the distinction students get wrong, so read it twice. A rule is a property of the **business**. It exists whether or not your software does, it was true before you arrived, and it will still be true if the project is cancelled. "A student may only submit a peer evaluation during an active week" is a rule the course had before anyone wrote code._

_What belongs to your software is the **enforcement** of that rule, and that is a functional requirement, written in the specification and cited back here. Keeping the two apart is what lets you answer the question that comes up every semester: "who decided this, and can we change it?" If it is a rule, the client's organization decides and you comply. If it is a requirement, your team decides and you can negotiate._

## How to hear one in a meeting

_[Rules almost never arrive announced. They surface in the middle of a story about something else, usually in one of these shapes:]_

- _"Must comply with..."_
- _"Only `<someone>` may `<do something>`"_
- _"If `<condition>`, then `<something happens>`"_
- _"Must be calculated according to..."_
- _"...unless it has been more than a year."_

_Examples of a client stating a rule without knowing it: "A new client must pay 30 percent of the estimated consulting fee and travel expenses in advance." "Time-off approvals must comply with the company's vacation policy."_

_When you hear one, write it down in the meeting. You will not reconstruct it afterward, and the exact wording matters because the rule is someone else's sentence, not yours._

## The five shapes a rule takes

_[Useful for recognizing rules, not for organizing this document. Sections below are grouped by topic, not by these categories.]_

| Shape | What it does | Example |
|---|---|---|
| **Fact** | States something always true about the business | Every senior design team belongs to exactly one course section. |
| **Constraint** | Restricts what may be done, or by whom | Only a course admin may create a course section. |
| **Action enabler** | Triggers an action when a condition holds | If a student has not completed safety training in 12 months, the request is refused. |
| **Inference** | Derives a new fact from known facts | A team with no submissions for two consecutive weeks is at risk. |
| **Computation** | Defines how a value is calculated | The peer evaluation score is the mean of all scores received that week. |

_Computations are the ones teams forget are rules. A formula the client uses today is a rule you must reproduce exactly, not a design decision you get to make. Ask for the spreadsheet._

## What a rule turns into

_[One rule usually propagates into several requirements of different kinds. This is why the document exists as its own artifact rather than being scattered through the specification.]_

| Requirement type | How the rule shows up | Example |
|---|---|---|
| Business requirement | A regulation drives a business objective | The system must enable compliance with all federal and state chemical reporting regulations within five months. |
| User requirement | A privacy policy dictates who may do what | Only laboratory managers may generate chemical exposure reports for anyone other than themselves. |
| Functional requirement | A company policy becomes system behavior | If an invoice is received from an unregistered vendor, the system shall email the vendor the supplier intake form and the W-9. |
| Quality attribute | A safety regulation becomes a checked property | The system must maintain safety training records and check them before a user can request a hazardous chemical. |

## Identifiers and traceability

_Each rule carries a stable `BR-<slug>` identifier, a name-based slug coined from the rule's gist: `BR-active-weeks`, `BR-section-admin-only`, `BR-artifact-key-unique`. Never renumber, rename, or repoint one. The thematic grouping into sections below is organizational only and does not affect a rule's identity, so moving a rule between sections is free and renaming it is not._

_**Cite rules, do not copy them.** When a use case is governed by a rule, its Business Rules field carries the identifier only, never the rule's text. One rule, one home. A rule copied into three use cases will be updated in one of them._

_A rule may cite another rule by identifier where one depends on another._

## Every rule needs a source

_[The column teams leave blank, and the one that matters most. For each rule, record where it comes from: a named policy document, a regulation, a page of the client's handbook, or the person who told you and the date.]_

_A rule you cannot attribute is usually not a rule. It is your team's design decision wearing a rule's clothes, and it belongs in the specification where it can be argued with. The test: if you asked your client to change it tomorrow, who would have to approve? If the answer is "you", it was never a rule._

_Where a rule is expected to change, say so and say when. Rules change on the business's schedule, not on yours._

## Where your AI teammate helps, and where it is dangerous

_[Delegate: turning your meeting notes into candidate rules, spotting sentences in a transcript that have the shape of a rule, and finding use cases in your specification that a given rule ought to govern but does not cite.]_

_**Do not let it invent rules.** This section is the single most dangerous place in your requirements for fabricated content, because an invented rule reads exactly like a real one. "Passwords must be at least 8 characters." "Records must be retained for 7 years." Both are plausible, both are common, and neither is your client's policy unless your client said so. A fabricated rule then propagates into functional requirements, tests that pass, and code that enforces something nobody asked for._

_The Source column is the defense. Every rule traces to a document or a person, or it does not go in the file. When your agent proposes a rule, the only question is: who told us this?_

## Revision History

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-09-13| 0.1 | Initial rules from the client brief and first client meeting | McKenzie Mitchell-Richardson |

---

## 1. Introduction

### 1.1 Purpose
This document collects the policies, privacy/compliance obligations, and computational formulas that govern how BookBuddies must operate as an application — independent of any particular screen or feature design — so that the specification can cite them rather than restate them.

### 1.2 Scope

This version covers rules that could be attributed to Yang Yang's concept brief, the BookBuddies Profiles notes, and the PM Core Experience deck. It does not cover the product/UX decisions documented in the PM deck under the heading "PRODUCT DECISION" (e.g., using a rules-only recommender for v1, treating the Shelf as non-tracking, making typed comments optional) — those are choices the team made and can renegotiate, so they belong in the specification, not here

---

## 2. Rules

_[Group rules under topic headings that fit your project. The Project Pulse headings are one example, not a required set: Course Administration, Teams and Assignment, Access and Ownership, Identity and Uniqueness, Editing and Locking, Deletion Integrity, Review and Submission._

_Format each rule as a bold identifier, the rule in one sentence, then its source. Worked examples:]_

### 2.1 Account and Profile Structure

**BR-kid-anonymous-profile:** A child's profile must use a nickname and character avatar only; no real identifying information is displayed on the child's profile. Source: client concept brief, "Parental Controls, Privacy, and Account Structure" section.
BR-admin-no-pii: The system admin role must not have access to any personally identifiable information. Source: client concept brief, "Parental Controls, Privacy, and Account Structure" section.
**BR-parent-account-linked:** A child account must be linked to a parent account. Source: client concept brief, "Parental Controls, Privacy, and Account Structure" section. Flagged — unconfirmed: the brief adds that the parent "likely" creates the account first. That word signals the PM's own expectation, not a stated client requirement. Confirm the actual account-creation order with Yang Yang before treating it as a rule.
Flagged — needs a source, not yet a confirmed rule: the brief states reading-level baseline is set via an in-app test at account creation "(not a self-reported field)." This reads as a firm constraint, but no policy or regulation is cited for it — only a rationale ("some schools don't test until 2nd or 3rd grade"). Ask Yang Yang directly: is this a requirement she is imposing, or a design option the team can still weigh against self-reporting? Until answered, do not cite this as a business rule in the specification.
Flagged — likely a team decision, not a rule: the brief notes email is "preferred over phone number for data collection ease." The stated reason is operational convenience, not policy or regulation — the test from the template ("if you asked your client to change it tomorrow, who would approve?") points to the team here. Recommend moving this to the specification as a design decision unless Yang Yang says otherwise.

### 2.2 Parental Oversight and Review

**BR-parent-ultimate-say:** A parent has final authority over which books their child may access, but is not required to approve each individual book selection. Source: client concept brief, "Parental Controls, Privacy, and Account Structure" section.

**BR-24hr-review-window:** A parent must confirm they have reviewed their child's activity within 24 hours; failure to do so results in temporary suspension of the child's account. Source: client concept brief, "Parental Controls, Privacy, and Account Structure" section (noted by the client as COPPA-adjacent compliance).

**BR-parent-content-removal:** A parent may remove flagged words or content from their child's account and may report abuse or self-harm signals. Source: client concept brief, "Parental Controls, Privacy, and Account Structure" section.

**BR-teacher-flag-only:** A teacher may flag content as age-inappropriate but may not restrict a child's access to a book outright; that authority belongs to the parent (see BR-parent-ultimate-say). Source: client concept brief, "Parental Controls, Privacy, and Account Structure" section.

### 2.3 Parental Oversight and Review

**BR-group-adult-approval:** Every member added to a reading group requires adult approval; a child may not add connections to a group themselves. Source: BookBuddies Profiles notes, "Adult-facing profile" section; corroborated in the PM Core Experience deck's Safety Boundary slide (Screen 5).

**BR-buddy-visibility-boundary:** A child's recommendations are visible to another child only within a group that an adult has approved for both children — i.e., only when the recommending child's parent has approved the pick being shared and the receiving child's parent has approved that group membership. Source: BookBuddies Profiles notes, "Recommender" section ("Social boundary").

**BR-similarity-data-boundary:** The recommendation model may compute behavioral similarity across any registered user on the platform, regardless of group membership or geography; this data-level computation is independent of the visibility boundary in BR-buddy-visibility-boundary. Source: BookBuddies Profiles notes, "Recommender" section ("Data boundary").

**BR-no-open-discovery:** The child-facing product must not include open messaging, a public child profile, or stranger search; discovery of other readers happens only through adult-approved groups. Source: client concept brief, "What's not included in adult-facing profile"; corroborated in the PM Core Experience deck's Safety Boundary slide (Screen 5).

### 2.4 Privacy and Data Minimization

**BR-no-behavioral-analytics:** The system must not collect or expose granular engagement-tracking data — including time spent reading, pages completed, frequency/streak patterns, or comparisons to peers or the child's own past activity. Source: BookBuddies Profiles notes, "What's not included in adult-facing profile" section (stated as a COPPA-related concern).

**BR-recap-qualitative-only:** Weekly and monthly recaps shown to a parent must remain short, qualitative, narrative snapshots — no day-count tallies, charts, progress bars, or performance summaries. Source: BookBuddies Profiles notes, "Oversight & Visibility" section.

**BR-kid-no-metrics:** The kid-facing profile must not display reading streaks, book or page counts, the child's reading level, or any comparison/leaderboard against other children. Source: BookBuddies Profiles notes, "Kid-facing profile" section.

### 2.5 Recommendation Computation

**BR-similarity-signal-weights:** Similarity between two users for recommendation purposes is computed from a weighted set of behavioral signals only — never from age, location, or other demographic traits — using the following relative weights: saved (+), loved it (++), rated highly (++), recommended to a peer (+++), skipped/ignored (−). Source: BookBuddies Profiles notes, "Recommender" section.

**BR-adult-influence-hidden:** When an adult records a private growth/theme note about a child (e.g., "building confidence"), that note may influence which books surface for the child, but the underlying theme or note text must never be shown to the child; the child continues to select only by the mood/length criteria visible to them. Source: BookBuddies Profiles notes, "Adult Influence" section.

_[That third entry is deliberate. Flag rules you are not sure about rather than dropping them; deciding whether something is a rule or a requirement is a conversation to have with your client, and it is worth having.]_

_**Checklist:**: Does every rule have a source? Could Yang Yang change it without asking the team? Is it stated as a fact about the business rather than about the software? — Three items above are flagged specifically because they failed one of these tests; resolve them with Yang Yang (ideally via the pending meeting transcript) before the next revision.
