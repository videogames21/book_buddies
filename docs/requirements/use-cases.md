# Use Cases

**Project:** Book Buddies\
**Team:** Team 5\
**Client:** Yang Yang, Research Scientist IBR/Knight D Research\
**Version:** 0.5

---

## Revision History

| Date           | Version | Description                           | Author                |
|----------------|---|---------------------------------------|-----------------------|
| 2026-09-13 | 0.1 | File setup and ready for feature list | Grayson Whittingham |
| 2026-09-17 | 0.2 | Fixed grammar in the purpose statement, filled in scope with the confirmed MVP feature areas, and replaced the placeholder use-case list with proposed area codes for those features | Team 05 |
| 2026-09-17 | 0.3 | Wrote the full set of use cases for all ten MVP feature areas, cross-referenced to their business rules, features, and open issues | Team 05 |
| 2026-09-17 | 0.4 | Regrouped the ten single-feature area codes into five area codes by related purpose (discovery, shelf, social, account/oversight, admin) and renamed/rewrote the use cases under them | Team 05 |
| 2026-09-23 | 0.5 | Reconciled the five area codes against the ones the team actually sent the client by email (`Emails.md`): renamed `DSC`→`REC`, `SHF`→`SHLF`, `SOC`→`GRP`, `ACC`→`PAR` (`ADM` unchanged) and renumbered every use case ID to match. Added `UC-REC-react-to-recommendation` for the "child feedback loop" the client named as a December-showcase priority in her 2026-09-21 written follow-up (`BookBuddiesNotes9.21.2026.pdf`). Split the single admin use case into `UC-ADM-manage-account-without-pii` (System Admin) and `UC-ADM-manage-catalog-and-content` (Catalog & Content Admin), matching the client's proposed role split. Updated the recommendation-quiz use case with the client's exact filter-then-score-then-top-5 mechanism. Confirmed throughout that the teacher role is removed for now rather than merely deferred | Team 05 |

---

## 1. Introduction

### 1.1 Purpose

BookBuddies is an app that gives kids easy book recommendations based on their own criteria (genre, mood, format, theme, length), adult input, and what other kids in their group have recommended. Adults add kids to reading groups, can check a child's reading profile, manage accounts and groups, nudge the recommendation system with a private note, remove a child's data on request, and report abuse or self-harm signals. The system-admin role now has a client-proposed shape (a System Admin role and a separate Catalog & Content Admin role) but whether the System Admin can be fully blind to a child's identity is still a work in progress — see `OI-7` in [OPEN-ISSUES.md](OPEN-ISSUES.md).

### 1.2 Scope

The use cases below cover the MVP features confirmed in [vision-and-scope.md](vision-and-scope.md) section 4.3, grouped into five area codes by related purpose. These area codes were renamed in this revision to match the feature-area codes the team proposed to the client by email (`Emails.md`) rather than the team's own earlier, differently-named grouping:

- **Recommendations** (`REC`, *was* `DSC`) — how a child finds a book and closes the feedback loop on it: `FEAT-recommendation-quiz`, `FEAT-manual-search`, `FEAT-recommendation-feedback`.
- **Shelf** (`SHLF`, *was* `SHF`) — how a child tracks and publicly rates books: `FEAT-shelf`, `FEAT-ratings`.
- **Groups** (`GRP`, *was* `SOC`) — how a child sees and shares with approved peers: `FEAT-peer-feed`, `FEAT-groups`.
- **Parents** (`PAR`, *was* `ACC`) — how families are set up and supervised (the email's `[PAR]` area explicitly covers parents, and teachers only if they were the same role — they are not, since the teacher role is removed for now; see [vision-and-scope.md](vision-and-scope.md) section 2.7): `FEAT-parent-account-linking`, `FEAT-reading-level-baseline`, `FEAT-parent-review-dashboard`.
- **Admin** (`ADM`, unchanged) — how the system is administered without unnecessarily exposing children's data, now split per the client's own 2026-09-21 proposal into System Admin and Catalog & Content Admin: `FEAT-admin-role-segregation`.

Several use cases below still depend on an item in [OPEN-ISSUES.md](OPEN-ISSUES.md) that is not yet closed; each affected use case names the open issue it is written against rather than guessing at an answer. Deferred features (`FEAT-ai-recommendation` beyond Stage 1, `FEAT-book-tagging` beyond minimum tagging, `FEAT-ebook-reader`, `FEAT-teacher-flagging`, `FEAT-stretch-my-reader`, `FEAT-reading-identity-badges`) have no use case yet, since they sit outside the current MVP scope (see [vision-and-scope.md](vision-and-scope.md) section 4.3).

`| Date           | Version | Description                           | Author                |
|----------------|--------|---------------------------------------|-----------------------|
| _[2026-09-13]_ | 0.1    | File setup and ready for feature list | _Grayson Whittingham_ |
| _[2026-09-17]_ | 0.2    | Added Area Codes                      | _Grayson Whittingham_ |
---

## 3. Use Cases

### Recommendations (`REC`)

#### UC-REC-take-recommendation-quiz

**Name:** Take the recommendation quiz

**Actors:** Child (primary); Recommender (supporting)

**Trigger:** The child wants a new book suggestion and opens the quiz — at onboarding or any later time, since the quiz runs on demand, not only once.

**Preconditions:**
- The child has a linked account (`FEAT-parent-account-linking`; see UC-PAR-create-linked-accounts).
- The seed catalog has at least one tagged book (`FEAT-book-tagging`).

**Main flow:**
1. The child taps to start a new recommendation quiz.
2. The app presents a short, picture-based question for each domain the client has confirmed — genre, mood, format, theme, and length (`FEAT-recommendation-quiz`; per Dr. Yang's 2026-09-21 notes, the quiz is deliberately not text-heavy, so a pre-reader can use it).
3. The child answers by tapping pictures, not typing, picking one value per domain.
4. The Recommender (a) filters out books that clearly don't fit the child's age band or reading level, then (b) scores the remaining books by counting how many of the child's chosen domain values each book matches, then (c) returns the top 5 scoring books (Stage 1 of `FEAT-ai-recommendation`, confirmed 2026-09-21; see `BR-similarity-signal-weights` for the later, not-yet-built stages).
5. The app shows the child the top 5 recommended books along with a one-line plain-language reason (e.g., "we picked these because you wanted something funny, fast, and full of animals").
6. The child can add any recommended book to their shelf (see UC-SHLF-add-book-to-shelf), react to it (see UC-REC-react-to-recommendation), or dismiss the results and retake the quiz.

**Alternate flows:**
- **3a. Child abandons the quiz partway through:** No recommendation is generated; the child can restart later with no penalty.
- **5a. No books match the child's answers:** The app shows a friendly empty state and suggests broadening the domain choices or trying manual search (UC-REC-search-catalog-by-keyword) instead.

**Postconditions:** The child has seen a set of recommendations tailored to their quiz answers and reading level; no data about the quiz session is exposed to another user beyond the anonymous behavioral signal it contributes to future similarity computation (`BR-similarity-data-boundary`).

**Related:** `FEAT-recommendation-quiz`, `FEAT-ai-recommendation`, `FEAT-book-tagging`, `BR-similarity-signal-weights`, `BR-similarity-data-boundary`. This is one of the client's three explicit December-showcase priorities ("Working Book Recommender" — see [vision-and-scope.md](vision-and-scope.md) section 4.3.1). Whether the MVP needs anything beyond the Stage 1 rules engine is still open — see `OI-2`.

---

#### UC-REC-search-catalog-by-keyword

**Name:** Search the catalog by keyword

**Actors:** Child (primary)

**Trigger:** The child has a specific title, author, or topic in mind rather than wanting a quiz-driven suggestion.

**Preconditions:** The child has a linked account; the seed catalog is populated.

**Main flow:**
1. The child opens search and types or picks a keyword (`FEAT-manual-search`).
2. The app returns matching books from the seed catalog.
3. The child selects a result to view its details, aggregate rating, and shelf/recommend options (see UC-SHLF-add-book-to-shelf).

**Alternate flows:**
- **2a. No results match the keyword:** The app shows a friendly empty state and suggests the recommendation quiz (UC-REC-take-recommendation-quiz) instead.

**Postconditions:** The child has located a specific book directly, without going through the quiz.

**Related:** `FEAT-manual-search`. Search result quality depends on `FEAT-book-tagging`, whose source is now resolved (Open Library — `OI-1` closed).

---

#### UC-REC-react-to-recommendation

**Name:** React to a book and give feedback

**Actors:** Child (primary); Recommender (supporting)

**Trigger:** The child has read or explored a book — reached from the quiz results, a search result, or their shelf — and BookBuddies invites a quick reaction.

**Preconditions:** The child has a linked account and is viewing a specific book (from quiz results, search, or the shelf).

**Main flow:**
1. The app asks the child for a simple reaction: **loved it**, **liked it**, **it was okay**, or **not for me** (`FEAT-recommendation-feedback`).
2. The child picks one reaction. This step alone is enough to complete the feedback loop.
3. Optionally, the child picks one or more tags describing what they liked or didn't like (e.g., funny, exciting, animals, adventure, great characters, too scary, too many words, great pictures).
4. Optionally, the child adds a short free-text note (no minimum length).
5. The app records the reaction (and any tags/note) against the child's own profile and weights it into future recommendation scoring per `BR-similarity-signal-weights` — a "loved it" and a high star rating are both counted, as separate signals, in future similarity computation.

**Alternate flows:**
- **2a. Child skips the reaction entirely:** No feedback is recorded for that book; nothing else in the app is blocked.
- **3a./4a. Child reacts but skips the optional tags or note:** The reaction alone is still recorded and weighted.

**Postconditions:** The child's reaction (and any optional tags/note) is stored against their own profile only, feeding future recommendation scoring; it is never shown to another child or used to change another child's recommendations directly (`BR-similarity-data-boundary` governs the anonymized, aggregate use of this signal across the platform).

**Related:** `FEAT-recommendation-feedback`, `BR-similarity-signal-weights`, `BR-similarity-data-boundary`. This is one of the client's three explicit December-showcase priorities ("child feedback loop" — see [vision-and-scope.md](vision-and-scope.md) section 4.3.1). **Open question, not yet settled by the client:** whether this reaction is prompted immediately after a quiz recommendation, only after a book is marked "read" on the shelf (see UC-SHLF-add-book-to-shelf), or both. This use case is written to support either trigger so the team does not have to build the flow twice — see [vision-and-scope.md](vision-and-scope.md), `FEAT-recommendation-feedback`.

---

### Shelf (`SHLF`)

#### UC-SHLF-add-book-to-shelf

**Name:** Add a book to the shelf

**Actors:** Child (primary)

**Trigger:** The child finds a book — via the quiz, manual search, or Buddy Picks — that they want to track.

**Preconditions:** The child has a linked account and is viewing a book from the catalog.

**Main flow:**
1. The child selects a book.
2. The child chooses a shelf status for the book: want-to-read, read, or recommend (`FEAT-shelf`).
3. The app saves the book to the child's personal shelf under that status.
4. If the child marks a book "read," the app may invite the reaction flow in UC-REC-react-to-recommendation.
5. If the child chooses "recommend," the app treats this as a candidate Buddy Pick, subject to the sharing rules in UC-GRP-view-buddy-picks and `BR-buddy-visibility-boundary`.

**Alternate flows:**
- **2a. Child changes a book's status later** (e.g., want-to-read → read): The app updates the existing shelf entry rather than creating a duplicate.
- **2b. Child removes a book from the shelf:** The book is removed from the child's shelf view; per `BR-no-behavioral-analytics`, no streak, count, or history of the removal is retained or shown to the child or another user.

**Postconditions:** The book appears on the child's shelf under the chosen status; the shelf action becomes one of the behavioral signals the Recommender may use for future similarity computation (`BR-similarity-signal-weights`), but the shelf itself displays no counts, streaks, or comparisons to the child (`BR-kid-no-metrics`).

**Related:** `FEAT-shelf`, `BR-kid-no-metrics`, `BR-no-behavioral-analytics`, `BR-similarity-signal-weights`, `FEAT-recommendation-feedback`.

---

#### UC-SHLF-rate-and-comment-on-book

**Name:** Rate and comment on a book

| Area code | Feature area                                                                              | Use cases       |
|-----------|-------------------------------------------------------------------------------------------|-----------------|
| _[RUB]_   | _[Rubric, from `FEAT-...`]_                                                               | _[`UC-RUB-...`]_ |
| [PAR]     | [Parent/Teacher (Need to ask for differences between parent and teacher), from `FEAT...`] | [`None`]        |
| [SHLF]    | [Shelf, from `FEAT...`]                                                                   | [`None`]        |
| [GRP]     | [Group, from `FEAT...`]                                                                   | [`None`]        |
| [ADM]     | [Admin, from `FEAT...`]                                                                   | [`None`]        |
| [REC]     | [Recommend, from `FEAT...`]                                                               | [`None`]        |
---

### Groups (`GRP`)

#### UC-GRP-view-buddy-picks

**Name:** View Buddy Picks from the reading group

**Actors:** Child (primary)

**Trigger:** The child wants to see what friends or classmates in their reading group are reading or recommending.

**Preconditions:** The child belongs to at least one adult-approved reading group (see UC-GRP-create-or-join-group).

**Main flow:**
1. The child opens the Buddy Picks feed (`FEAT-peer-feed`; project-glossary.md, "Buddy Picks").
2. The app shows books recommended by other children within the child's adult-approved reading group only — never platform-wide and never from a group the child's own adult has not approved (`BR-buddy-visibility-boundary`; `BR-no-open-discovery`).
3. The child can view a recommended book's details and add it to their own shelf (UC-SHLF-add-book-to-shelf).
4. If the recommending child's family has chosen to share their identity within the group, their name appears with the pick; otherwise the pick appears without attribution (`FEAT-group-sharing-controls`).

**Alternate flows:**
- **2a. The child is not yet in any group:** The feed is empty; the app can suggest UC-GRP-create-or-join-group.

**Postconditions:** The child has seen recommendations from their approved peers only, with no open messaging, public profile, or stranger search involved (`BR-no-open-discovery`).

**Related:** `FEAT-peer-feed`, `FEAT-group-sharing-controls`, `BR-buddy-visibility-boundary`, `BR-no-open-discovery`, `BR-similarity-data-boundary` (the recommender's data-level computation is broader than what a child can see here — the two are separate boundaries and must not be conflated; see `RI-pii-boundary-leak`).

---

#### UC-GRP-create-or-join-group

**Name:** Create or join a reading group

**Actors:** Child (primary); Parent (supporting, approval)

**Trigger:** A child wants to read and share recommendations with a specific set of friends or classmates.

**Preconditions:** The child has a linked account.

**Main flow:**
1. The child creates a new reading group (family- or classroom-based, roughly 2–20 members; project-glossary.md, "Reading Group") or requests to join an existing one — groups are user-initiated, not teacher-imposed (`FEAT-groups`).
2. Each child added to the group requires their parent's approval before the membership takes effect (`BR-group-adult-approval`; see UC-GRP-approve-group-member).
3. Once approved, the group appears in the child's account and its members' shared picks become visible in that child's Buddy Picks feed (UC-GRP-view-buddy-picks), subject to `BR-buddy-visibility-boundary`.

**Alternate flows:**
- **1a. A teacher wants to give feedback on a group's reading:** Not applicable for now — the teacher role is removed, not just deferred, per the client's 2026-09-21 follow-up (see [vision-and-scope.md](vision-and-scope.md), `FEAT-teacher-flagging`).

**Postconditions:** The child belongs to a reading group whose membership was adult-approved.

**Related:** `FEAT-groups`, `BR-group-adult-approval`, `BR-no-open-discovery`.

---

#### UC-GRP-approve-group-member

**Name:** Approve a group member

**Actors:** Parent (primary)

**Trigger:** A child requests to join a group, or another child requests to join a group the parent's child is already in.

**Preconditions:** A pending group-membership request exists that involves the parent's child.

**Main flow:**
1. The parent receives a request to approve their child joining a group, or another child joining a group their child belongs to.
2. The parent reviews the request on the parent review dashboard (`FEAT-parent-review-dashboard`).
3. The parent approves or declines the membership (`BR-group-adult-approval`).
4. If approved, the membership takes effect and the new member's shared picks become visible per `BR-buddy-visibility-boundary`; if declined, the membership does not take effect and no picks are shared.

**Alternate flows:**
- **1a. The child attempts to add the connection themselves without adult approval:** Not permitted — a child may not add group connections without going through this approval flow (`BR-group-adult-approval`).

**Postconditions:** The group membership request is resolved (approved or declined), and visibility between the two children's picks is set accordingly.

**Related:** `FEAT-groups`, `FEAT-parent-review-dashboard`, `BR-group-adult-approval`, `BR-buddy-visibility-boundary`.

---

### Parents (`PAR`)

#### UC-PAR-create-linked-accounts

**Name:** Create and link a parent and child account

**Actors:** Parent (primary); Child (supporting)

**Trigger:** A family wants to start using BookBuddies.

**Preconditions:** None — this is typically the first use case for a new family.

**Main flow:**
1. The parent creates a parent account, linked by email rather than phone number (`AS-email-linking`).
2. The parent creates and links one or more child accounts to their parent account (`FEAT-parent-account-linking`; `BR-parent-account-linked`).
3. The child's profile is set up using a nickname and character avatar only — no real identifying information is displayed on the child's profile (`BR-kid-anonymous-profile`).
4. The child completes the baseline reading test as part of setup (see UC-PAR-complete-baseline-reading-test).

**Alternate flows:**
- **1a. A child attempts to start using the app before any parent account exists:** Whether this is allowed at all — i.e., whether a parent account must exist first, or a later "invite a parent" flow is acceptable — is not yet settled; see `OI-8`. Until it closes, this use case assumes the parent creates their account first.

**Postconditions:** A parent account exists, linked to at least one child account with an anonymous kid-facing profile and a recorded baseline reading level.

**Related:** `FEAT-parent-account-linking`, `BR-parent-account-linked`, `BR-kid-anonymous-profile`, `AS-email-linking`. Account-creation order is still open — see `OI-8`. This is one of the client's three explicit December-showcase priorities ("basic family account structure" — see [vision-and-scope.md](vision-and-scope.md) section 4.3.1). The client has separately asked (2026-09-21) how easily a child profile could later be associated with more than one authorized adult (e.g., a reintroduced teacher role) without restructuring the core database — a new open technical question the team should track (recommend filing as `OI-15`; see `RI-multi-guardian-retrofit`).

---

#### UC-PAR-complete-baseline-reading-test

**Name:** Complete the baseline reading test

**Actors:** Child (primary); Parent (supporting, at account setup)

**Trigger:** A new child account is being created and needs a starting reading level.

**Preconditions:** A parent account exists and is in the process of linking a new child account (see UC-PAR-create-linked-accounts).

**Main flow:**
1. At account creation, the app presents the child with a short, free, in-app baseline reading test (`FEAT-reading-level-baseline`) rather than asking the parent to type in a level.
2. The child completes the test.
3. The app computes a reading level (Lexile/AR-based; see project-glossary.md, "Reading Level") and stores it against the child's profile.
4. The stored level feeds the Recommender's reading-ability filtering (UC-REC-take-recommendation-quiz, step 4) and, later, `FEAT-stretch-my-reader`.

**Alternate flows:**
- **2a. Child cannot complete the test in one sitting:** The app allows resuming rather than forcing a restart (implementation detail; not yet specified).

**Postconditions:** The child's account has a reading level on file. Whether that level is ever shown back to the child — for example on an achievement-style page — is unresolved; see `OI-6`. Until `OI-6` closes, the level is treated as adult-side-only input, consistent with `BR-kid-no-metrics`.

**Related:** `FEAT-reading-level-baseline`, `BR-kid-no-metrics`. Capture method is settled; visibility is not — see `OI-6`.

---

#### UC-PAR-complete-24-hour-review

**Name:** Complete the 24-hour activity review

**Actors:** Parent (primary)

**Trigger:** The recurring 24-hour review window opens for a linked child account.

**Preconditions:** A parent account is linked to at least one child account.

**Main flow:**
1. The app prompts the parent to review their child's recent activity (books read, shelved, rated, recommended, and reacted to) within the current 24-hour window (`BR-24hr-review-window`).
2. The parent reviews the summary shown on the parent review dashboard (`FEAT-parent-review-dashboard`); the summary can show general preference patterns (e.g., "likes funny animal adventures, graphic novels"), books saved/read/liked or disliked, recommendations shown, reading history, and any notes the child has chosen to share — but never systems/admin information, other families' data, the recommender algorithm or system logs, or a private note the child has chosen not to share (per Dr. Yang's 2026-09-21 parent permission table).
3. The parent confirms they have reviewed the activity and has no objection (project-glossary.md, "24-Hour Review") — this is a periodic acknowledgment, not approval of each individual book choice (`BR-parent-ultimate-say`).
4. The window resets and the child's account remains active.

**Alternate flows:**
- **3a. Parent does not confirm within 24 hours:** The child's account is temporarily suspended until the parent completes the review (`BR-24hr-review-window`).
- **2a. Parent wants to act on something in the activity summary:** The parent proceeds to UC-PAR-flag-or-report-content instead of, or in addition to, confirming.

**Postconditions:** Either the review is confirmed and the child's account stays active, or the review is missed and the child's account is suspended pending review.

**Related:** `FEAT-parent-review-dashboard`, `BR-24hr-review-window`, `BR-parent-ultimate-say`.

---

#### UC-PAR-flag-or-report-content

**Name:** Flag or remove content, or report abuse

**Actors:** Parent (primary)

**Trigger:** While reviewing a child's activity, the parent notices content they want removed, or a signal of abuse or self-harm.

**Preconditions:** A parent account is linked to the child account being reviewed.

**Main flow:**
1. The parent opens the child's activity on the parent review dashboard (`FEAT-parent-review-dashboard`).
2. The parent selects a flagged word, comment, or piece of content and removes it from the child's account (`BR-parent-content-removal`).
3. Separately, if the parent observes a signal of abuse or self-harm — in shared activity, or in a private note the child chose to share — they use the Report Function to report it (project-glossary.md, "Report Function").

**Alternate flows:**
- **1a. A teacher, rather than a parent, notices inappropriate content:** Not applicable for now — the teacher role is removed, not merely deferred, per the client's 2026-09-21 follow-up (`AS-teacher-role-deferred`; `FEAT-teacher-flagging`).
- **3a. The concerning content is in a private note the child did not choose to share:** Today, nothing surfaces this to the parent automatically. The client has asked (2026-09-21) whether it is technically possible to automatically flag a private note for language suggesting self-harm or harm to others — an open technical question the team should track (recommend filing as `OI-16`; see `RI-selfharm-detection-gap`). Until it is resolved, the Report Function in the main flow remains the only path, and it depends on the parent noticing shared activity.

**Postconditions:** Flagged content is removed from the child's account, or an abuse/self-harm report has been filed for follow-up outside the app.

**Related:** `FEAT-parent-review-dashboard`, `BR-parent-content-removal`. `BR-teacher-flag-only` is retired along with the teacher role for now; see [vision-and-scope.md](vision-and-scope.md) section 4.2, `FEAT-teacher-flagging`.

---

### Admin (`ADM`)

#### UC-ADM-manage-account-without-pii

**Name:** Administer accounts and systems without unnecessary access to PII

**Actors:** System Admin (primary)

**Trigger:** The admin needs to perform platform-wide account, systems, or analytics maintenance (e.g., resetting access, investigating a technical issue, checking usage analytics or audit logs) without needing to know who a user is.

**Preconditions:** The admin has System Admin access to the platform.

**Main flow:**
1. The admin opens the account, system-configuration screen, or analytics view that needs attention — covering roles & permissions, guardian/parent and child profile administration, system configuration, notifications, audit logs, usage analytics, data export, and data retention (per Dr. Yang's 2026-09-21 module list).
2. The system presents only what the System Admin role is permitted to see. A guardian/parent profile is identified by an internal ID (e.g., "Guardian #987, Child #321, #322"); a child profile shows no view/create/edit access at all beyond deactivation, is identified by internal profile ID rather than personal information, and its relationship to the authorized guardian is visible only when needed for account management or troubleshooting (`FEAT-admin-role-segregation`; `BR-admin-no-pii`).
3. The admin performs the needed maintenance action using non-identifying references only.

**Alternate flows:**
- **2a. A task genuinely requires identifying a user (e.g., responding to a legal request):** Not yet designed; this would need an explicit, audited exception path rather than routine admin visibility.

**Postconditions:** The maintenance task is completed without the admin having viewed a child's identifying information, private notes, or detailed reading activity.

**Related:** `FEAT-admin-role-segregation`, `BR-admin-no-pii`, `RI-pii-boundary-leak`. Whether full PII blindness is technically feasible as a hard constraint, versus a stretch goal, is still open — the client asked the team this directly; see `OI-7`.

---

#### UC-ADM-manage-catalog-and-content

**Name:** Administer the book catalog and recommender content

**Actors:** Catalog & Content Admin (primary)

**Trigger:** The book catalog, book metadata, recommender rules, or gamification/badge configuration needs to be added, updated, or retired.

**Preconditions:** The admin has Catalog & Content Admin access. Per the client's 2026-09-21 proposal, this role does **not** require System Admin access to families and children.

**Main flow:**
1. The admin opens the catalog and content management area: book catalog (bulk import/export), book metadata, recommender rules, or badges/gamification configuration.
2. The admin makes the needed change (e.g., imports a batch of newly tagged books, adjusts a recommender rule, updates a badge's trigger).
3. The change is recorded in the audit log (visible to System Admin, not to this role) and takes effect for future recommendation and badge computations.

**Alternate flows:**
- **1a. The admin needs to see how a rule is performing (e.g., "Fantasy: shown 2,000 times, 30% saved"):** Recommender and badge performance metrics are available in this role's scope, since they describe catalog/content behavior in aggregate, not an individual child's activity.

**Postconditions:** The catalog, metadata, recommender rules, or badge configuration reflect the change, with no guardian or child personal data ever exposed to this role.

**Related:** `FEAT-admin-role-segregation`. Recommended engineering decision, not yet a confirmed requirement: adopt this role split, since the client proposed it herself as a way to reduce how many roles can see family data — see [vision-and-scope.md](vision-and-scope.md), `FEAT-admin-role-segregation`.
