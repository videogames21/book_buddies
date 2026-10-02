# Business Rules

**Project:** BookBuddies
**Team:** Team 05
**Client:** Yang Yang
**Version:** 0.2

---

## Revision History

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-09-13| 0.1 | Initial rules from the client brief and first client meeting | McKenzie Mitchell-Richardson |
| 2026-10-01 | 0.2 | Updated document based off of notes, transcript, flowcharts, and slide deck from second meeting with Yang. | McKenzie Mitchell-Richardson |
---

## 1. Introduction

### 1.1 Purpose
This document collects the policies, privacy/compliance obligations, and computational formulas that govern how BookBuddies must operate as an application — independent of any particular screen or feature design — so that the specification can cite them rather than restate them.

### 1.2 Scope

This version covers rules that could be attributed to Yang Yang's concept brief, the BookBuddies Profiles notes, and the PM Core Experience deck. It does not cover the product/UX decisions documented in the PM deck under the heading "PRODUCT DECISION" (e.g., using a rules-only recommender for v1, treating the Shelf as non-tracking, making typed comments optional) — those are choices the team made and can renegotiate, so they belong in the specification, not here

---

## 2. Rules

### 2.1 Account and Profile Structure

**BR-user-roles:** BookBuddies has two end-user roles, parent and kid, plus the system admin. There is no teacher role. Source: Meeting 2 notes, "Scope Simplification: Dropping Teacher Layer."
**BR-parent-account-linked:** A child account must be linked to a parent account. Source: client concept brief, "Parental Controls, Privacy, and Account Structure" section; confirmed in Meeting 2 notes, "Parent and Kid Roles." (v0.2: account-creation flag resolved by BR-parent-creates-kid-account.)
**BR-parent-creates-kid-account:** Only a parent may create a kid account; a kid may not self-register. The parent creates the child profile and enters the child's onboarding information. Source: Meeting 2 notes, "Parent and Kid Roles"; MTG2 flowchart deck, slide 1 ("Kid onboarding (set up by Parent)") and slide 3.
**BR-parent-account-structure:** A family has one primary parent account; a secondary parent may be added, and one parent account may manage multiple kid accounts. Source: Meeting 2 notes, "Parent and Kid Roles."
**BR-kid-anonymous-profile:** A child's profile must use a nickname and character avatar only; no real identifying information is displayed on the child's profile. Source: client concept brief, "Parental Controls, Privacy, and Account Structure" section. (v0.2 note: the child's real name is now stored (see BR-kid-data-stored), but this rule still governs what is displayed.)

**BR-kid-data-stored:** For each child, the system stores the child's real name, age, and grade, and the reading level only if the parent provides one. The real name is kept so the platform can report to law enforcement when required. Source: Meeting 2 notes, "Costs, Compliance, and Next Steps."
BR-admin-limited-view: The system admin may see parent account credentials and the number of child accounts under each parent, but not the child's details. Source: Meeting 2 notes, "Costs, Compliance, and Next Steps." Flagged — conflict: BR-note-safety-flagging routes flagged notes "to system admin and parents," which would show the admin a child's note content. Ask Yang Yang whether flagged notes are an exception to this rule, and exactly what the admin sees when a flag fires.

**BR-coppa-parental-consent:** Parental consent must be obtained at account creation, in line with COPPA. Source: Meeting 2 notes, "Costs, Compliance, and Next Steps" ("COPPA compliance: build in from the start"). Flagged — incomplete: Yang Yang is sending the team the COPPA rules link. Add further COPPA rules here only as they are attributed to that source, not from general knowledge.

**BR-no-reading-level-assessment:** BookBuddies must not assess, estimate, calculate, infer, or assign a child's reading level. There is no in-app reading test. Source: MTG2 flowchart deck, slide 1 ("Design rule") and slide 2; Meeting 2 notes, "Recommendation Algorithm." (v0.2: resolves the v0.1 flag, which assumed an in-app test. The client has reversed that.)

**BR-reading-level-parent-entered:** A reading level is optional. If one is given, the parent/guardian enters it at sign-up using a system they already know (e.g., Lexile, AR/ATOS, DRA, Guided Reading Level, or a grade-level range). If the parent is unsure, the app may show referral links to external resources (e.g., AR Bookfinder, Scholastic Book Wizard) for reference only. Source: MTG2 flowchart deck, slides 2–3. (Meeting 2 notes said "kids asked to find their level externally"; the later deck assigns this to the parent, so the deck governs.)

Flagged — not a business rule: the brief states reading-level baseline is set via an in-app test at account creation "(not a self-reported field)." No policy or regulation is cited for it — only a rationale ("some schools don't test until 2nd or 3rd grade"). The 2026-09-10 meeting transcript shows the team and Dr. Yang converging on this together live (project-glossary.md, "Reading Level"), so it is a confirmed product decision, not an open question — but it is still the team's design choice rather than a client-mandated policy, so it belongs in vision-and-scope.md (`FEAT-reading-level-baseline`) and not in this file.
Flagged — likely a team decision, not a rule: the brief notes email is "preferred over phone number for data collection ease." The stated reason is operational convenience, not policy or regulation. Recommend moving this to the specification as a design decision unless Yang Yang says otherwise.

### 2.2 Parental Oversight and Review

**BR-parent-ultimate-say:** A parent has final authority over which books their child may access but is not required to approve each book the child selects; purchasing a book is treated as implicit approval. Source: client concept brief, "Parental Controls, Privacy, and Account Structure" section; Meeting 2 notes, "Parent and Kid Roles."

**BR-parent-shelf-removal:** A parent may remove books from their child's shelf. When a book is removed, the child receives an in-app notice. Source: Meeting 2 notes, "Parent and Kid Roles" and "Shelf and Notifications."

**BR-parent-rec-not-forced:** A book a parent recommends is added to the child's recommendation list, not placed on the child's shelf. The child may accept or veto it. Source: Meeting 2 notes, "Recommendation Algorithm" and "Parent and Kid Roles."

**BR-notes-visible-to-parent:** A child's notes and reflections are visible to the parent by default, and children in the 5–12 age group cannot make private notes. Source: Meeting 2 notes, "Book Notes and Privacy" (parent confirmed they would reserve the right to read a child's notes).

**BR-24hr-review-window:** A parent must confirm they have reviewed their child's activity within 24 hours; failure to do so results in temporary suspension of the child's account. Source: client concept brief, "Parental Controls, Privacy, and Account Structure" section (noted by the client as COPPA-adjacent compliance). Flagged — reconfirm: Meeting 2's list of notifications (a kid is told when a book is removed; a parent is alerted when a note is flagged) includes no review reminder, and the meeting simplified scope elsewhere. Ask Yang Yang whether this rule still stands for the MVP.

**BR-parent-content-removal:** A parent may remove flagged words or content from their child's account and may report abuse or self-harm signals. Source: client concept brief, "Parental Controls, Privacy, and Account Structure" section.

### 2.3 Group and Social Safety
[v0.2: Meeting 2 dropped peer-to-peer social sharing from the MVP ("too complicated for now"). The group rules below remain client policy for when social features return, so they are marked Deferred rather than retired.]
**BR-no-open-discovery:** The child-facing product must not include open messaging, a public child profile, or stranger search; discovery of other readers happens only through adult-approved groups. Source: client concept brief, "What's not included in adult-facing profile"; corroborated in the PM Core Experience deck's Safety Boundary slide (Screen 5).

**BR-group-adult-approval:** Every member added to a reading group requires adult approval; a child may not add connections to a group themselves. Source: BookBuddies Profiles notes, "Adult-facing profile" section; corroborated in the PM Core Experience deck's Safety Boundary slide (Screen 5). Status: Deferred (Meeting 2 notes, "MVP Scope for December").

**BR-buddy-visibility-boundary:** A child's recommendations are visible to another child only within a group that an adult has approved for both children — i.e., only when the recommending child's parent has approved the pick being shared and the receiving child's parent has approved that group membership. Source: BookBuddies Profiles notes, "Recommender" section ("Social boundary"). Status: Deferred (Meeting 2 notes, "MVP Scope for December").

**BR-similarity-data-boundary:** The recommendation model may compute behavioral similarity across any registered user on the platform, regardless of group membership or geography; this data-level computation is independent of the visibility boundary in BR-buddy-visibility-boundary. A child's notes may feed the recommendation algorithm without being shown to other children. Source: BookBuddies Profiles notes, "Recommender" section ("Data boundary"); Meeting 2 notes, "Book Notes and Privacy."
### 2.4 Privacy and Data Minimization

**BR-note-safety-flagging:** If a child's note contains violent or self-harm content, it must be flagged immediately to the system admin and the child's parents, and the parent receives an in-app alert. Source: Meeting 2 notes, "Book Notes and Privacy" and "Shelf and Notifications." See the conflict flagged on BR-admin-limited-view.

**BR-recap-qualitative-only:** Weekly and monthly recaps shown to a parent must remain short, qualitative, narrative snapshots — no day-count tallies, charts, progress bars, or performance summaries. Source: BookBuddies Profiles notes, "Oversight & Visibility" section. Flagged — confirm scope: "See growth/journey over time" (MTG2 flowchart deck, slide 1) could be read as a chart or progress view. Confirm it is meant to stay qualitative.

**BR-kid-no-metrics:** The kid-facing profile must not display reading streaks, book or page counts, the child's reading level, or any comparison/leaderboard against other children. Source: BookBuddies Profiles notes, "Kid-facing profile" section. Flagged — possible conflict: badges and achievement lists (Meeting 2 notes, "MVP Scope for December"; MTG2 flowchart deck, slide 1, "See Badge") may display counts. Confirm what a badge may show a child.

### 2.5 Recommendation Computation

**BR-reading-level-proxy:** Recommendations use a child's age and grade as the primary signal. A parent-entered reading level, when present, is one input used to match book difficulty; when it is absent, age and grade stand in for it. Source: Meeting 2 notes, "Recommendation Algorithm"; MTG2 flowchart deck, slide 2.

**BR-similarity-signal-weights:** Similarity between two users for recommendation purposes is computed from a weighted set of behavioral signals only — never from age, location, or other demographic traits — using the following relative weights: saved (+), loved it (++), rated highly (++), recommended to a peer (+++), skipped/ignored (−). Source: BookBuddies Profiles notes, "Recommender" section. Flagged — needs reconfirmation:

Meeting 2 says rating weight should be "kept low, especially early on with small user base," which conflicts with the ++ weights on "loved it" and "rated highly."
"Recommended to a peer" depends on peer sharing, which is deferred (see §2.3).
User-to-user similarity belongs to the collaborative-filtering phase that Meeting 2 deferred until scale allows. Note that the "never from age" clause governs similarity between users only; it does not conflict with BR-reading-level-proxy, which matches books to a child.

**BR-adult-influence-hidden:** When an adult records a private growth/theme note about a child (e.g., "building confidence"), that note may influence which books surface for the child, but the underlying theme or note text must never be shown to the child; the child continues to select only by the mood/length criteria visible to them. Source: BookBuddies Profiles notes, "Adult Influence" section. Flagged — possibly deferred: Meeting 2 confirmed "direct/bias content controls" as removed from the MVP, which may refer to this feature. Note also that parent book suggestions do carry a note the child sees (MTG2 flowchart deck, slide 1: "I think you will like this because..."); that is a separate, visible note and is not governed by this rule. Confirm with Yang Yang.

**Status of flagged rules:** Two rules above are flagged because they fail the "does the client control this, or does the team" test; the reading-level-baseline item is resolved as a design decision rather than a rule. The 2026-09-10 meeting transcript is in the repo at [client-interview-2026-09-10.md](client-interview-2026-09-10.md); use it, plus [OPEN-ISSUES.md](OPEN-ISSUES.md), to close the remaining flags.
Open items for Yang Yang (v0.2): admin visibility of flagged notes (BR-admin-limited-view); COPPA rules link (BR-coppa-parental-consent); whether the 24-hour review rule still stands (BR-24hr-review-window); disclosure wording (BR-flagging-disclosure); logged hours, growth views, and badges vs. the privacy rules (BR-no-behavioral-analytics, BR-recap-qualitative-only, BR-kid-no-metrics); signal weights (BR-similarity-signal-weights); adult influence notes (BR-adult-influence-hidden); email vs. phone (§2.1). Also fill in the dates for the Meeting 2 notes and the MTG2 flowchart deck in §1.2.
