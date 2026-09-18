# Use Cases

**Project:** Book Buddies\
**Team:** Team 5\
**Client:** Yang Yang, Research Scientist IBR/Knight D Research\
**Version:** 0.4

---

## Revision History

| Date           | Version | Description                           | Author                |
|----------------|---|---------------------------------------|-----------------------|
| 2026-09-13 | 0.1 | File setup and ready for feature list | Grayson Whittingham |
| 2026-09-17 | 0.2 | Fixed grammar in the purpose statement, filled in scope with the confirmed MVP feature areas, and replaced the placeholder use-case list with proposed area codes for those features | Team 05 |
| 2026-09-17 | 0.3 | Wrote the full set of use cases for all ten MVP feature areas, cross-referenced to their business rules, features, and open issues | Team 05 |
| 2026-09-17 | 0.4 | Regrouped the ten single-feature area codes into five area codes by related purpose (discovery, shelf, social, account/oversight, admin) and renamed/rewrote the use cases under them | Team 05 |

---

## 1. Introduction

### 1.1 Purpose

BookBuddies is an app that gives kids easy book recommendations based on their own criteria (mood, genre, length), adult input, and what other kids in their group have recommended. Adults add kids to reading groups, can check a child's reading profile, manage accounts and groups, nudge the recommendation system with a private note, remove a child's data on request, and report abuse or self-harm signals. The system-admin role is still a work in progress — see `OI-7` in [OPEN-ISSUES.md](OPEN-ISSUES.md).

### 1.2 Scope

The use cases below cover the ten MVP features confirmed in [vision-and-scope.md](vision-and-scope.md) section 4.3, grouped into five area codes by related purpose rather than one area code per feature:

- **Discovery** (`DSC`) — how a child finds a book: `FEAT-recommendation-quiz`, `FEAT-manual-search`.
- **Shelf** (`SHF`) — how a child tracks and reacts to books: `FEAT-shelf`, `FEAT-ratings`.
- **Social** (`SOC`) — how a child sees and shares with approved peers: `FEAT-peer-feed`, `FEAT-groups`.
- **Accounts and oversight** (`ACC`) — how families are set up and supervised: `FEAT-parent-account-linking`, `FEAT-reading-level-baseline`, `FEAT-parent-review-dashboard`.
- **Admin** (`ADM`) — how the system is administered without exposing children's data: `FEAT-admin-pii-segregation`.

Several use cases below still depend on an item in [OPEN-ISSUES.md](OPEN-ISSUES.md) that is not yet closed; each affected use case names the open issue it is written against rather than guessing at an answer. Deferred features (`FEAT-ai-recommendation`, `FEAT-book-tagging` beyond minimum tagging, `FEAT-ebook-reader`, `FEAT-teacher-flagging`, `FEAT-stretch-my-reader`) have no use case yet.

---

## 2. Use Case List

| Area code | Feature area | Use cases |
|---|---|---|
| DSC | Discovery — `FEAT-recommendation-quiz`, `FEAT-manual-search` | [UC-DSC-take-recommendation-quiz](#uc-dsc-take-recommendation-quiz), [UC-DSC-search-catalog-by-keyword](#uc-dsc-search-catalog-by-keyword) |
| SHF | Shelf — `FEAT-shelf`, `FEAT-ratings` | [UC-SHF-add-book-to-shelf](#uc-shf-add-book-to-shelf), [UC-SHF-rate-and-comment-on-book](#uc-shf-rate-and-comment-on-book) |
| SOC | Social — `FEAT-peer-feed`, `FEAT-groups` | [UC-SOC-view-buddy-picks](#uc-soc-view-buddy-picks), [UC-SOC-create-or-join-group](#uc-soc-create-or-join-group), [UC-SOC-approve-group-member](#uc-soc-approve-group-member) |
| ACC | Accounts and oversight — `FEAT-parent-account-linking`, `FEAT-reading-level-baseline`, `FEAT-parent-review-dashboard` | [UC-ACC-create-linked-accounts](#uc-acc-create-linked-accounts), [UC-ACC-complete-baseline-reading-test](#uc-acc-complete-baseline-reading-test), [UC-ACC-complete-24-hour-review](#uc-acc-complete-24-hour-review), [UC-ACC-flag-or-report-content](#uc-acc-flag-or-report-content) |
| ADM | Admin — `FEAT-admin-pii-segregation` | [UC-ADM-manage-account-without-pii](#uc-adm-manage-account-without-pii) |

---

## 3. Use Cases

### Discovery (`DSC`)

#### UC-DSC-take-recommendation-quiz

**Name:** Take the recommendation quiz

**Actors:** Child (primary); Recommender (supporting)

**Trigger:** The child wants a new book suggestion and opens the quiz — at onboarding or any later time, since the quiz runs on demand, not only once.

**Preconditions:**
- The child has a linked account (`FEAT-parent-account-linking`; see UC-ACC-create-linked-accounts).
- The seed catalog has at least one tagged book (`FEAT-book-tagging`).

**Main flow:**
1. The child taps to start a new recommendation quiz.
2. The app presents a short, picture-based set of questions about genre and mood (per `FEAT-recommendation-quiz`; the quiz is deliberately not text-heavy, so a pre-reader can use it).
3. The child answers by tapping pictures, not typing.
4. The Recommender's rules engine filters the tagged seed catalog by the child's mood/genre answers and the child's reading level, and returns the top matches (Stage 1 of `FEAT-ai-recommendation`; see `BR-similarity-signal-weights` for the later, not-yet-built stages).
5. The app shows the child a small set of recommended books.
6. The child can add any recommended book to their shelf (see UC-SHF-add-book-to-shelf) or dismiss the results and retake the quiz.

**Alternate flows:**
- **3a. Child abandons the quiz partway through:** No recommendation is generated; the child can restart later with no penalty.
- **5a. No books match the child's answers:** The app shows a friendly empty state and suggests broadening the mood/genre choices or trying manual search (UC-DSC-search-catalog-by-keyword) instead.

**Postconditions:** The child has seen a set of recommendations tailored to their quiz answers and reading level; no data about the quiz session is exposed to another user beyond the anonymous behavioral signal it contributes to future similarity computation (`BR-similarity-data-boundary`).

**Related:** `FEAT-recommendation-quiz`, `FEAT-ai-recommendation`, `FEAT-book-tagging`, `BR-similarity-signal-weights`, `BR-similarity-data-boundary`. Whether the MVP needs anything beyond the Stage 1 rules engine is still open — see `OI-2`.

---

#### UC-DSC-search-catalog-by-keyword

**Name:** Search the catalog by keyword

**Actors:** Child (primary)

**Trigger:** The child has a specific title, author, or topic in mind rather than wanting a quiz-driven suggestion.

**Preconditions:** The child has a linked account; the seed catalog is populated.

**Main flow:**
1. The child opens search and types or picks a keyword (`FEAT-manual-search`).
2. The app returns matching books from the seed catalog.
3. The child selects a result to view its details, aggregate rating, and shelf/recommend options (see UC-SHF-add-book-to-shelf).

**Alternate flows:**
- **2a. No results match the keyword:** The app shows a friendly empty state and suggests the recommendation quiz (UC-DSC-take-recommendation-quiz) instead.

**Postconditions:** The child has located a specific book directly, without going through the quiz.

**Related:** `FEAT-manual-search`. Search result quality depends on `FEAT-book-tagging`, whose source is still open — see `OI-1`.

---

### Shelf (`SHF`)

#### UC-SHF-add-book-to-shelf

**Name:** Add a book to the shelf

**Actors:** Child (primary)

**Trigger:** The child finds a book — via the quiz, manual search, or Buddy Picks — that they want to track.

**Preconditions:** The child has a linked account and is viewing a book from the catalog.

**Main flow:**
1. The child selects a book.
2. The child chooses a shelf status for the book: want-to-read, read, or recommend (`FEAT-shelf`).
3. The app saves the book to the child's personal shelf under that status.
4. If the child chooses "recommend," the app treats this as a candidate Buddy Pick, subject to the sharing rules in UC-SOC-view-buddy-picks and `BR-buddy-visibility-boundary`.

**Alternate flows:**
- **2a. Child changes a book's status later** (e.g., want-to-read → read): The app updates the existing shelf entry rather than creating a duplicate.
- **2b. Child removes a book from the shelf:** The book is removed from the child's shelf view; per `BR-no-behavioral-analytics`, no streak, count, or history of the removal is retained or shown to the child or another user.

**Postconditions:** The book appears on the child's shelf under the chosen status; the shelf action becomes one of the behavioral signals the Recommender may use for future similarity computation (`BR-similarity-signal-weights`), but the shelf itself displays no counts, streaks, or comparisons to the child (`BR-kid-no-metrics`).

**Related:** `FEAT-shelf`, `BR-kid-no-metrics`, `BR-no-behavioral-analytics`, `BR-similarity-signal-weights`.

---

#### UC-SHF-rate-and-comment-on-book

**Name:** Rate and comment on a book

**Actors:** Child (primary)

**Trigger:** The child has read a book (shelved as "read") and wants to record their reaction.

**Preconditions:** The book is on the child's shelf.

**Main flow:**
1. The child opens a book they have shelved as "read."
2. The child gives the book a star-and-emoji rating and, optionally, a short comment (`FEAT-ratings`).
3. The app records the rating against the child's own account and updates the book's aggregate community rating (e.g., "five kids rated it five stars, six rated four stars" — see project-glossary.md, "Rating").
4. The child's rating becomes one of the weighted behavioral signals available to the Recommender (`BR-similarity-signal-weights`): "loved it" and "rated highly" carry more weight than a plain save, and a low rating is one of the signals feeding "skipped/ignored."

**Alternate flows:**
- **2a. Child rates without commenting:** The comment field is optional; a rating alone is still recorded and aggregated.
- **3a. Child gives a low rating:** Per project-glossary.md, "Rating," this never suppresses the book in another child's personal recommendations — ratings are computed independently per child even though they aggregate at the book level.

**Postconditions:** The book's community aggregate rating reflects the new rating; the child's own rating history is visible only to that child, never compared to another child's ratings (`BR-kid-no-metrics`).

**Related:** `FEAT-ratings`, `BR-similarity-signal-weights`, `BR-kid-no-metrics`.

---

### Social (`SOC`)

#### UC-SOC-view-buddy-picks

**Name:** View Buddy Picks from the reading group

**Actors:** Child (primary)

**Trigger:** The child wants to see what friends or classmates in their reading group are reading or recommending.

**Preconditions:** The child belongs to at least one adult-approved reading group (see UC-SOC-create-or-join-group).

**Main flow:**
1. The child opens the Buddy Picks feed (`FEAT-peer-feed`; project-glossary.md, "Buddy Picks").
2. The app shows books recommended by other children within the child's adult-approved reading group only — never platform-wide and never from a group the child's own adult has not approved (`BR-buddy-visibility-boundary`; `BR-no-open-discovery`).
3. The child can view a recommended book's details and add it to their own shelf (UC-SHF-add-book-to-shelf).
4. If the recommending child's family has chosen to share their identity within the group, their name appears with the pick; otherwise the pick appears without attribution (`FEAT-group-sharing-controls`).

**Alternate flows:**
- **2a. The child is not yet in any group:** The feed is empty; the app can suggest UC-SOC-create-or-join-group.

**Postconditions:** The child has seen recommendations from their approved peers only, with no open messaging, public profile, or stranger search involved (`BR-no-open-discovery`).

**Related:** `FEAT-peer-feed`, `FEAT-group-sharing-controls`, `BR-buddy-visibility-boundary`, `BR-no-open-discovery`, `BR-similarity-data-boundary` (the recommender's data-level computation is broader than what a child can see here — the two are separate boundaries and must not be conflated; see `RI-pii-boundary-leak`).

---

#### UC-SOC-create-or-join-group

**Name:** Create or join a reading group

**Actors:** Child (primary); Parent (supporting, approval)

**Trigger:** A child wants to read and share recommendations with a specific set of friends or classmates.

**Preconditions:** The child has a linked account.

**Main flow:**
1. The child creates a new reading group (family- or classroom-based, roughly 2–20 members; project-glossary.md, "Reading Group") or requests to join an existing one — groups are user-initiated, not teacher-imposed (`FEAT-groups`).
2. Each child added to the group requires their parent's approval before the membership takes effect (`BR-group-adult-approval`; see UC-SOC-approve-group-member).
3. Once approved, the group appears in the child's account and its members' shared picks become visible in that child's Buddy Picks feed (UC-SOC-view-buddy-picks), subject to `BR-buddy-visibility-boundary`.

**Alternate flows:**
- **1a. A teacher wants to give feedback on a group's reading:** A teacher may comment that content "isn't appropriate for this age" but cannot create, restrict, or impose a group (project-glossary.md, "Reading Group"; `FEAT-teacher-flagging` is deferred in any case).

**Postconditions:** The child belongs to a reading group whose membership was adult-approved.

**Related:** `FEAT-groups`, `BR-group-adult-approval`, `BR-no-open-discovery`.

---

#### UC-SOC-approve-group-member

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

### Accounts and Oversight (`ACC`)

#### UC-ACC-create-linked-accounts

**Name:** Create and link a parent and child account

**Actors:** Parent (primary); Child (supporting)

**Trigger:** A family wants to start using BookBuddies.

**Preconditions:** None — this is typically the first use case for a new family.

**Main flow:**
1. The parent creates a parent account, linked by email rather than phone number (`AS-email-linking`).
2. The parent creates and links one or more child accounts to their parent account (`FEAT-parent-account-linking`; `BR-parent-account-linked`).
3. The child's profile is set up using a nickname and character avatar only — no real identifying information is displayed on the child's profile (`BR-kid-anonymous-profile`).
4. The child completes the baseline reading test as part of setup (see UC-ACC-complete-baseline-reading-test).

**Alternate flows:**
- **1a. A child attempts to start using the app before any parent account exists:** Whether this is allowed at all — i.e., whether a parent account must exist first, or a later "invite a parent" flow is acceptable — is not yet settled; see `OI-8`. Until it closes, this use case assumes the parent creates their account first.

**Postconditions:** A parent account exists, linked to at least one child account with an anonymous kid-facing profile and a recorded baseline reading level.

**Related:** `FEAT-parent-account-linking`, `BR-parent-account-linked`, `BR-kid-anonymous-profile`, `AS-email-linking`. Account-creation order is still open — see `OI-8`.

---

#### UC-ACC-complete-baseline-reading-test

**Name:** Complete the baseline reading test

**Actors:** Child (primary); Parent (supporting, at account setup)

**Trigger:** A new child account is being created and needs a starting reading level.

**Preconditions:** A parent account exists and is in the process of linking a new child account (see UC-ACC-create-linked-accounts).

**Main flow:**
1. At account creation, the app presents the child with a short, free, in-app baseline reading test (`FEAT-reading-level-baseline`) rather than asking the parent to type in a level.
2. The child completes the test.
3. The app computes a reading level (Lexile/AR-based; see project-glossary.md, "Reading Level") and stores it against the child's profile.
4. The stored level feeds the Recommender's reading-ability filtering (UC-DSC-take-recommendation-quiz, step 4) and, later, `FEAT-stretch-my-reader`.

**Alternate flows:**
- **2a. Child cannot complete the test in one sitting:** The app allows resuming rather than forcing a restart (implementation detail; not yet specified).

**Postconditions:** The child's account has a reading level on file. Whether that level is ever shown back to the child — for example on an achievement-style page — is unresolved; see `OI-6`. Until `OI-6` closes, the level is treated as adult-side-only input, consistent with `BR-kid-no-metrics`.

**Related:** `FEAT-reading-level-baseline`, `BR-kid-no-metrics`. Capture method is settled; visibility is not — see `OI-6`.

---

#### UC-ACC-complete-24-hour-review

**Name:** Complete the 24-hour activity review

**Actors:** Parent (primary)

**Trigger:** The recurring 24-hour review window opens for a linked child account.

**Preconditions:** A parent account is linked to at least one child account.

**Main flow:**
1. The app prompts the parent to review their child's recent activity (books read, shelved, rated, and recommended) within the current 24-hour window (`BR-24hr-review-window`).
2. The parent reviews the summary shown on the parent review dashboard (`FEAT-parent-review-dashboard`).
3. The parent confirms they have reviewed the activity and has no objection (project-glossary.md, "24-Hour Review") — this is a periodic acknowledgment, not approval of each individual book choice (`BR-parent-ultimate-say`).
4. The window resets and the child's account remains active.

**Alternate flows:**
- **3a. Parent does not confirm within 24 hours:** The child's account is temporarily suspended until the parent completes the review (`BR-24hr-review-window`).
- **2a. Parent wants to act on something in the activity summary:** The parent proceeds to UC-ACC-flag-or-report-content instead of, or in addition to, confirming.

**Postconditions:** Either the review is confirmed and the child's account stays active, or the review is missed and the child's account is suspended pending review.

**Related:** `FEAT-parent-review-dashboard`, `BR-24hr-review-window`, `BR-parent-ultimate-say`.

---

#### UC-ACC-flag-or-report-content

**Name:** Flag or remove content, or report abuse

**Actors:** Parent (primary)

**Trigger:** While reviewing a child's activity, the parent notices content they want removed, or a signal of abuse or self-harm.

**Preconditions:** A parent account is linked to the child account being reviewed.

**Main flow:**
1. The parent opens the child's activity on the parent review dashboard (`FEAT-parent-review-dashboard`).
2. The parent selects a flagged word, comment, or piece of content and removes it from the child's account (`BR-parent-content-removal`).
3. Separately, if the parent observes a signal of abuse or self-harm, they use the Report Function to report it (project-glossary.md, "Report Function").

**Alternate flows:**
- **1a. A teacher, rather than a parent, notices inappropriate content:** A teacher may flag content as age-inappropriate but may not remove it or restrict the child's access outright — that authority stays with the parent (`BR-teacher-flag-only`; `FEAT-teacher-flagging` is deferred as a stretch goal in any case).

**Postconditions:** Flagged content is removed from the child's account, or an abuse/self-harm report has been filed for follow-up outside the app.

**Related:** `FEAT-parent-review-dashboard`, `BR-parent-content-removal`, `BR-teacher-flag-only`.

---

### Admin (`ADM`)

#### UC-ADM-manage-account-without-pii

**Name:** Administer accounts without access to PII

**Actors:** System admin (primary)

**Trigger:** The admin needs to perform account maintenance (e.g., resetting access, investigating a technical issue) without needing to know who a user is.

**Preconditions:** The admin has admin-level access to the system.

**Main flow:**
1. The admin opens the account or record that needs attention.
2. The system presents only what the admin role is permitted to see, with all personally identifiable information (real names, contact details, and anything that would de-anonymize a child's profile) segregated from admin-visible tables and views (`FEAT-admin-pii-segregation`; `BR-admin-no-pii`).
3. The admin performs the needed maintenance action using non-identifying references only.

**Alternate flows:**
- **2a. A task genuinely requires identifying a user (e.g., responding to a legal request):** Not yet designed; this would need an explicit, audited exception path rather than routine admin visibility.

**Postconditions:** The maintenance task is completed without the admin having viewed PII.

**Related:** `FEAT-admin-pii-segregation`, `BR-admin-no-pii`, `RI-pii-boundary-leak`. Whether full PII blindness is technically feasible as a hard constraint, versus a stretch goal, is still open — see `OI-7`.
