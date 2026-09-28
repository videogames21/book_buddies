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
| 2026-09-17 | 0.2 | Reconciled flagged rules against the meeting transcript and OPEN-ISSUES.md: resolved the reading-level-baseline flag as a confirmed design decision, cross-referenced the account-order flag to `OI-8`, fixed a mis-duplicated section heading (2.3 was titled the same as 2.2), and standardized bold rule-ID formatting | Team 05 |

---

## 1. Introduction

### 1.1 Purpose
This document collects the policies, privacy/compliance obligations, and computational formulas that govern how BookBuddies must operate as an application — independent of any particular screen or feature design — so that the specification can cite them rather than restate them.

### 1.2 Scope

This version covers rules that could be attributed to Yang Yang's concept brief, the BookBuddies Profiles notes, and the PM Core Experience deck. It does not cover the product/UX decisions documented in the PM deck under the heading "PRODUCT DECISION" (e.g., using a rules-only recommender for v1, treating the Shelf as non-tracking, making typed comments optional) — those are choices the team made and can renegotiate, so they belong in the specification, not here

---

## 2. Rules

### 2.1 Account and Profile Structure

**BR-kid-anonymous-profile:** A child's profile must use a nickname and character avatar only; no real identifying information is displayed on the child's profile. Source: client concept brief, "Parental Controls, Privacy, and Account Structure" section.
**BR-admin-no-pii:** The system admin role must not have access to any personally identifiable information. Source: client concept brief, "Parental Controls, Privacy, and Account Structure" section.
**BR-parent-account-linked:** A child account must be linked to a parent account. Source: client concept brief, "Parental Controls, Privacy, and Account Structure" section. Flagged — unconfirmed: the brief adds that the parent "likely" creates the account first. That word signals the PM's own expectation, not a stated client requirement, and the 2026-09-10 meeting did not settle it either — Dr. Yang was not fully committed to an order. Tracked as `OI-8` in OPEN-ISSUES.md; do not treat account-creation order as a rule until she confirms it.
Flagged — not a business rule: the brief states reading-level baseline is set via an in-app test at account creation "(not a self-reported field)." No policy or regulation is cited for it — only a rationale ("some schools don't test until 2nd or 3rd grade"). The 2026-09-10 meeting transcript shows the team and Dr. Yang converging on this together live (project-glossary.md, "Reading Level"), so it is a confirmed product decision, not an open question — but it is still the team's design choice rather than a client-mandated policy, so it belongs in vision-and-scope.md (`FEAT-reading-level-baseline`) and not in this file.
Flagged — likely a team decision, not a rule: the brief notes email is "preferred over phone number for data collection ease." The stated reason is operational convenience, not policy or regulation. Recommend moving this to the specification as a design decision unless Yang Yang says otherwise.

### 2.2 Parental Oversight and Review

**BR-parent-ultimate-say:** A parent has final authority over which books their child may access, but is not required to approve each individual book selection. Source: client concept brief, "Parental Controls, Privacy, and Account Structure" section.

**BR-24hr-review-window:** A parent must confirm they have reviewed their child's activity within 24 hours; failure to do so results in temporary suspension of the child's account. Source: client concept brief, "Parental Controls, Privacy, and Account Structure" section (noted by the client as COPPA-adjacent compliance).

**BR-parent-content-removal:** A parent may remove flagged words or content from their child's account and may report abuse or self-harm signals. Source: client concept brief, "Parental Controls, Privacy, and Account Structure" section.

**BR-teacher-flag-only:** A teacher may flag content as age-inappropriate but may not restrict a child's access to a book outright; that authority belongs to the parent (see BR-parent-ultimate-say). Source: client concept brief, "Parental Controls, Privacy, and Account Structure" section.

### 2.3 Group and Social Safety

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

**Status of flagged rules:** Two rules above are flagged because they fail the "does the client control this, or does the team" test; the reading-level-baseline item is resolved as a design decision rather than a rule. The 2026-09-10 meeting transcript is in the repo at [client-interview-2026-09-10.md](client-interview-2026-09-10.md); use it, plus [OPEN-ISSUES.md](OPEN-ISSUES.md), to close the remaining flags.
