# Project Glossary

**Project:** BookBuddies
**Team:** Team 05 — BookBuddies
**Client:** Dr. Yang Yang
**Version:** 0.11

---

> **What changed in v0.7.** Added Book Report, Child Identity Store, Consent Record, Dangerous Content List, Per-Child Exclusion and Shelf Request, which the use cases and architecture already rely on, and cleared notes about open issues that have since been filed or closed.
>
> **What changed in v0.5.** The 2026-09-24 client meeting, Dr. Yang's 2026-09-21 written answers, and the follow-up flowchart cut the teacher role, reading groups, Buddy Picks, Stretch My Reader, the Achievement Page and the in-app reading test. Those terms now live under **Retired Terms** at the bottom, so nobody builds against them. Live definitions were rewritten to match business-rules v0.2, vision-and-scope v0.4, SRS v0.2 and use-cases v0.9. The Reading Level visibility conflict from v0.4 is now settled: the app never assesses a child's level and never shows it to the child.

## Revision History

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-09-08 | 0.1 | Initial template | Iid Maxamuud |
| 2026-09-13 | 0.2 | Replaced worked examples with real BookBuddies terms from the team one-pager, the feature brief, and Dr. Yang's follow-up design notes (9/12). | Iid Maxamuud |
| 2026-09-13 | 0.3 | Checked every term against the actual meeting-1 transcript (2026-09-10). Confirmed "Buddy Picks" as client vocabulary; added terms that surfaced live (Shiny App, 24-Hour Review, Achievement Page, Rating); flagged a direct conflict between what Dr. Yang said live and wrote afterward on Reading Level visibility. | Iid Maxamuud |
| 2026-09-17 | 0.4 | Corrected the Recommender entry's citation to point at OPEN-ISSUES.md `OI-2` instead of the (template) interview guide file | Team 05 |
| 2026-10-07 | 0.5 | Applied the 2026-09-21 written answers, the 2026-09-24 meeting, and the flowchart. Moved cut terms (Achievement Page, Buddy Picks, In-App Reading Test, Reading Group, Social Boundary, Stretch My Reader, Teacher) to a new Retired Terms section as permanently out of scope. Rewrote Rating (4-option scale), Reading Level (parent-entered, never shown to the child), Recommender (rule-based scoring, recommender mode), Seed Catalog (pre-tagged Kaggle/GitHub dataset), and Report Function. Added terms used by the use cases and design: Main Parent, Sub Parent, Starting Reader Profile, Book Domains, Shelf categories, Recommendation Reaction, Decline Reason, Recommendation Batch, Parent Suggestion, Reflection, Pending Deletion, Safety Flag, Custom Tag, System Admin, Catalog and Content Admin, Recap, Active User, Age Band, Area Code, Manual Search, MVP. | Iid Maxamuud |
| 2026-10-20 | 0.6 | Rewrote the COPPA entry from the FTC COPPA Rule text the client supplied (`docs/coppa/coppa-full`), replacing the "client is sending the rules link" placeholder; added Personal information and Verifiable parental consent as related terms. | Grayson Whittingham, Claude |
| 2026-10-25 | 0.7 | Added Book Report, Child Identity Store, Consent Record, Dangerous Content List, Per-Child Exclusion and Shelf Request; added parent book reports to Report Function; marked `OI-6` and `OI-17` closed and pointed Safety Flag detection at `OI-19`. | Team 05 (cleanup with Claude) |
| 2026-10-26 | 0.8 | Safety flags apply to reflections only; flagged-content review recorded as the one admin exception (team position, `OI-15`); retired terms are removed until further notice rather than permanently; the MVP recommender's own-data inputs include ratings and reflections; the dangerous content list also receives flagged reflections from a block (`OI-24`). | Team 05 (cleanup with Claude) |
| 2026-10-26 | 0.9 | System Admin: the client is the admin in practice; the admin may suspend and reinstate accounts and unblock books; parent "credentials" are names, usernames and emails, never passwords. | Team 05 (cleanup with Claude) |
| 2026-10-26 | 0.10 | Trimmed System Admin to the powers the use cases give it, and named what is a deployment setting or a parent's tool instead; added editing books, parent-account suspension and the audit log. | Team 05 (cleanup with Claude) |
| 2026-10-29 | 0.11 | Applied the client's 2026-10-28 answers (`docs/external/client-answers-10-28-2026.md`): added Child Dashboard, Finish Confirmation, Interest Profile, Internal Child ID, Parent Dashboard, Parent Note, Usage Data, Weekly Check-in and Word List; withdrew 24-Hour Review, Pending Deletion and Reflection (children write no free text); the child's real name is no longer stored; Safety Flag applies to parent notes; Seed Catalog is the curated spreadsheet; System Admin gains the child lookup by internal ID; Decline Reason, Rating, Recap, Recommender, Parent, Shelf and the other entries updated to match. | Team 05 (with Claude) |

---

## Definitions

### 24-Hour Review

The parent-side compliance mechanism Dr. Yang proposed on 2026-09-10: within 24 hours, a parent must confirm they have reviewed what the child did in the app ("I have read whatever my kid is doing on this app in the past 24 hours. I have no objection."). Missing the window temporarily suspends the child's account.

_**Withdrawn 2026-10-28:** the client dropped it, because it was meant for reviewing a child's free-text notes, which no longer exist. No account is suspended for a missed review (`OI-16` resolved; `BR-24hr-review-window` retired). The weekly check-in and the dashboards replace it as engagement features._

_**Not to be confused with:** per-book approval ("parents do not need to approve every decision a kid makes about book choices"), **Parent Review** of a recommendation batch, or **Pending Deletion** (a different 24-hour window, for a child's own reflection, also withdrawn)._

### Accelerated Reader (AR / ATOS)

A reading-level scale (ATOS is the AR book-level number) used, along with Lexile and others, to tag book difficulty and as one of the scales a parent may use to enter a child's optional **Reading Level**. Parents who don't know their child's level may be pointed to AR Bookfinder for reference.

### Active User

Dr. Yang's working definition (2026-09-21) for admin usage statistics: an account that did something meaningful in the period — logged in, used the recommender, viewed a book's details, saved or dismissed a recommendation, updated a reading profile, or completed an engagement activity. Automatic messages, background processes and account setup don't count. Used by `UC-ADM-view-usage-stats`. For the client's V1 measure, a family is a **weekly active family** when it has at least one meaningful action in a week: a rating, a shelf save or a "not for me" response (client answers 2026-10-28, Q14).

### Adult Influence

A parent's private note about a child (e.g., a growth theme such as "building confidence") that quietly shapes which books surface, without the child ever seeing the note (`BR-adult-influence-hidden`).

_**⚠️ Status unclear:** the 2026-09-24 meeting removed "direct/bias content controls" from the MVP, which may mean this feature. Confirm with the client (`FEAT-adult-influence-notes`)._

_**Related:** the optional **Parent Note** of 2026-10-28 is also a parent-written note that feeds the recommender and is never shown to the child, so it may cover this feature. Confirm with the client._

_**Not to be confused with:** a **Parent Suggestion**, whose optional note the child *does* see._

### Age Band

An age range used to tag a book's age fit in the **Seed Catalog**, e.g., 6–8, 7–10, 9–12. It is one of the **Book Domains**. It is not the child's age; the child's actual age and grade are stored on the **Child Profile**.

### Area Code

The short prefix that groups use cases and features by area: `PAR` (parent accounts and oversight), `SHLF` (shelf, ratings, parent-confirmed finishes, the child dashboard, manual search), `REC` (recommendations), `ADM` (system admin). Use case IDs take the form `UC-<AREA>-<slug>`. A `GRP` (groups) area was proposed in the team's 9/21 email and dropped when groups were cut.

### Book Domains (BookBuddies Coding)

The fixed set of characteristics every catalog book is tagged with, so the **Recommender** can match a child's answers to books (`FEAT-book-tagging`, `DI-book-tags`):

| Domain                    | Values                                                                           |
|---------------------------|----------------------------------------------------------------------------------|
| Genre/Subject             | funny, mystery, adventure, animals, fantasy                                      |
| Mood                      | silly, heartwarming, exciting, spooky-but-safe                                   |
| Format                    | comic/graphic novel, picture book, chapter book                                  |
| Themes                    | friendship, courage, resilience, family, problem-solving, animals                |
| Length                    | quick read, longer story                                                         |
| Age/Interest Fit          | **Age Band**, e.g., 6–8, 7–10, 9–12                                              |
| Reading Level / Challenge | Lexile or AR level, from sources such as Scholastic Book Wizard or the publisher |

_**Source:** Dr. Yang's 2026-09-21 notes (Table 2); flowchart slide 2._ These values are called **standard tags**. Admins may also add **Custom Tags**.

### Book Report (Reported Book)

A parent's report that a catalog book is unsuitable for one of their children, made from a **Recommendation Batch** under **Parent Review** or from the child's **Shelf**. The parent gives a reason and confirms after a warning that false reports may be punished. The report is final: it creates a **Per-Child Exclusion**, removes the book from the child's batch and shelf with a removal notice that gives no reason, and puts the book on the admin's list of reported books, where the admin may block it for everyone, discard the report, or warn the parent (`BR-parent-report-book`, `UC-PAR-report-book`, `UC-ADM-block-content`).

_**Not to be confused with:** an admin **block** (`UC-ADM-block-content`), which removes a book for every child, or a parent simply removing a book from the shelf (`UC-SHLF-parent-remove-book`), which does not stop it being recommended again._

### Catalog and Content Admin

A possible second admin role Dr. Yang proposed on 2026-09-21: someone who maintains the book catalog, book metadata and recommender rules, with **no** access to family or child accounts. She asked whether this should be separate from the **System Admin** to limit access to children's information.

_**Status:** proposed, not decided. Use cases currently have a single admin role._

### Child Dashboard

The screen a child opens from the shelf with three sections: parent-approved recommended books, a radar chart of their current reading interests, and their shelf activity and history. It shows words and time groups only, with no numbers, scale marks, percentages, comparisons or badges (`UC-SHLF-kid-dashboard`; client answers 2026-10-28, Q10). It is built from the child's own data under the **Internal Child ID**.

_**Open:** whether it complies with `BR-kid-no-metrics` (`OI-31`)._

_**Not to be confused with:** the **Parent Dashboard**, or the Achievement Page (retired)._

### Child Identity Store

The one part of the design that holds a child's identifying details: age, grade and optional reading level (`KD-pii-segregation`, `DI-pii-segregation`). The system holds no real name for the child (client answers 2026-10-28, Q3). Everything else refers to the child by an opaque ID, nickname and avatar. Only two paths read it: the recommender (age, grade and reading level, never the name) and the admin's flagged-content review (`KD-admin-flag-review`, pending `OI-15`). An architecture term; see architecture-of-record §5.2.

### Child Profile (Child Account)

A child's account, created only by a parent and always linked to a parent account (`BR-parent-creates-kid-account`, `BR-parent-account-linked`). It has two layers:

- **Stored:** the items in the inventory of `BR-kid-data-stored`, such as nickname, avatar, **Internal Child ID**, username, age, grade, and a reading level only if the parent gives one. The real or legal name is **not** stored (client answers 2026-10-28, Q3; `OI-23` resolved). In the design, identifying details live only in the **Child Identity Store** (`KD-pii-segregation`).
- **Displayed:** nickname and character avatar only — see **Kid-Facing Profile**.

The parent sets the child's username, and the system generates the password, which is shown to the parent once (`UC-PAR-create-kid-account`).

### Consent Record

The stored proof of a parent's verifiable parental consent: the parent and family, the version of the notice shown, the acknowledgment and confirmation dates, the method (parent consent plus email confirmation, accepted for V1 and kept configurable, `OI-21`), and any separately consented third-party disclosure (`BR-coppa-parental-consent`, `DI-consent-record`, `UC-PAR-onboarding`). It is kept while the child account exists, is visible to the parent, and shows the admin only that consent exists.

### COPPA

The Children's Online Privacy Protection Act (U.S. federal law), implemented by the FTC's COPPA Rule (16 CFR 312). It covers online services directed to children under 13, so it covers BookBuddies' 6–11 audience. As of 2026-09-24 the client wants COPPA compliance "built in from the start." In practice that means: verifiable parental consent before anything is collected from a child (`BR-coppa-parental-consent`), a direct notice to the parent and an online privacy notice (`BR-coppa-notice`), parent rights to review, stop and delete (`BR-coppa-parent-rights`), collecting only what is needed (`BR-coppa-minimization`), a written retention policy (`BR-coppa-retention`), and no sharing of a child's data with third parties without separate consent (`BR-coppa-no-third-party-disclosure`).

_**Source:** the FTC rule text the client supplied, `docs/coppa/coppa-full`; the team's reading of it is in `docs/coppa/coppa-design-requirements.md`._

_**Note:** the team is designing to the COPPA Rule's requirements but cannot claim formal compliance or certification, which would need legal review (`AS-coppa-adjacent-only`, `OI-20`)._

_**Related terms:** **Personal information** under COPPA includes a child's name, any persistent identifier such as an account ID, and anything the child provides that is linked to one, so quiz answers, shelf and ratings on a child account all count. **Verifiable parental consent** is consent given by a method that reasonably confirms the person is the child's parent._

### Custom Tag

A free-form label an admin adds to a catalog book on top of the standard **Book Domains** tags (e.g., "Cute," "Scary but Warming"). Custom tags are trimmed, case-normalized, and shared across the catalog (`UC-ADM-add-content`).

_**Open:** whether children see custom tags, whether the recommender or **Manual Search** uses them, and who may rename or delete them._

### Dangerous Content List

The admin-only record of flagged parent notes, saved when flagged-content review leads to a suspension, with its flag category and classification (breaks only the app's conduct rules, or breaks the law and is marked for escalation) (`UC-ADM-flag-review`). It holds copies of flagged content about a child, so it is the most sensitive store in the system and is protected like the child's own data. Team decision, 2026-10-15: only the admin may view it. Its retention period and whether it can be exported are `OI-27`. `OI-24` (a block keeping a flagged reflection) is moot, since children write no reflections.

### Data Boundary

The rule for what the recommender may learn from: anonymous, behavior-only signals across every registered user — never demographic traits (`BR-similarity-data-boundary`). A parent's note about a child may feed the recommender without being shown to other children.

_**Status:** applies once the recommender uses cross-user data (post-MVP); the MVP rules recommender uses only the child's own data under the internal child ID: profile, quiz answers, their choices and ratings, shelf history, and the parent's note (2026-09-24 notes; client answers 2026-10-28)._

### Decline Reason

The optional reason a child gives when they tap "Not for me" on a recommended book: *Not interested in topic*, *Too easy / too short*, *Too hard / too long*, *Not my style*, or *Other* (flowchart slide 1; `UC-REC-kid-review`). It is always picked from this fixed list; the child types nothing (`BR-child-structured-responses`).

_**Open:** whether the parent sees decline reasons, and whether a declined book can come back later._

### Finish Confirmation (Confirmed-Finished Icon)

A parent's confirmation that their child really finished a book the child moved to Finished. Until a parent confirms, the book is grayed out on the Finished shelf without the icon and the child cannot rate it. Once confirmed, the book carries the confirmed-finished icon wherever the child later moves it, and the confirmation is kept even if the book leaves the shelf. If the parent says "not finished yet," the book returns to its earlier category and the child sees a notice. After confirming, the parent may add a **Parent Note** (`UC-SHLF-par-finish-book`, `UC-SHLF-kid-rate-book`; team decision 2026-10-29).

### Gamification Badge

A badge a child earns for a pattern in their reading, shown as part of their reader identity, never as a count, level, or comparison with other kids (`FEAT-reading-identity-badges`, `BR-kid-no-metrics`). Dr. Yang's 2026-09-21 design: after 3 meaningful interactions (save, read, like) in a category, the matching badge unlocks. There are three badge types:

| Type           | Trigger                                                   | Example           |
|----------------|-----------------------------------------------------------|-------------------|
| Interest/Genre | Repeated engagement with a topic or genre                 | "Animal Explorer" |
| Exploration    | Tries books outside usual preferences                     | "Genre Traveler"  |
| Creator        | Uses a book as inspiration for their own story or drawing | "Story Maker"     |

_**Status:** post-MVP (`UC-SHLF-view-badges`). The final badge list is still open (`OI-14`). Per 2026-09-24, any logged reading hours behind a badge need parent approval, to stop kids gaming the system. Parents can see their child's badges ("See Badge" in the flowchart's Parent Review)._

### Interest Profile (Reading Interests)

The set of a child's reading interests with a relative strength for each, derived from the interests chosen at setup and the child's later choices, ratings and shelf activity (`UC-REC-kid-onboarding`, `UC-SHLF-kid-dashboard`). It drives recommendations and the child's radar chart. The child sees it only as a chart with no numbers; the parent can see it; the admin reaches it only through the lookup by **Internal Child ID**. How the strengths are worked out is part of the rules-based recommender and is not yet specified (`OI-2`).

### Internal Child ID

An opaque identifier the system gives each child profile when it is created, unique and never reused. It links a child's reading interests, choices, responses, shelf history, ratings and usage over time without using a name, and it is how an authorized admin looks up one child's usage data (`BR-kid-data-stored`, `BR-admin-limited-view`, `UC-PAR-create-kid-account`, `UC-ADM-view-usage-stats`; client answers 2026-10-28, overall comment 4, Q3, Q5, Q14). It is never shown to the child.

### Kid-Facing Profile

What a child (and the app) displays: nickname, character avatar, color, and earned **Gamification Badges**. It never shows a real name (the system holds none), the reading level, reading streaks, book or page counts, or any comparison with other children (`BR-kid-anonymous-profile`, `BR-kid-no-metrics`).

_**Not to be confused with:** the stored **Child Profile**, which holds the age and grade but never displays them._

### Lexile (Lexile Framework)

A reading-level scale used, along with AR, to tag book difficulty and as one of the scales a parent may use to enter a child's optional **Reading Level**.

### Main Parent

The primary parent (guardian) account for a family. It is created first, records COPPA consent, and is the only account that can create or delete child accounts and **Sub Parent** accounts. One Main Parent may manage several children (`BR-parent-account-structure`, `UC-PAR-onboarding`).

_**Synonyms:** primary parent; guardian._

### Manual Search

Keyword search of the active catalog, without using the recommender (`FEAT-manual-search`, `UC-SHLF-manual-search`). A child can ask to add a found book to their shelf, and a linked parent must confirm or deny the request before it is added.

_**Open:** the flowchart doesn't show Manual Search. Confirm it is still in the MVP._

### MVP (December Showcase)

The minimum product the team demonstrates in December 2026: "bare-bones: working recommendation flow + basic parent and kid profiles," web-first. Dr. Yang's top 3 goals for it (2026-09-21) are: (1) a working book recommender, (2) a basic family account structure, and (3) a child feedback loop (the four-option **Rating**). The MVP feature list is in vision-and-scope.md §4.3.

### Parent (Guardian)

An adult end user who manages one or more child accounts. A parent may: create and manage child profiles; set the starting reader profile; see the child's shelf, likes and dislikes, ratings, badges, recommendations and reading history; suggest books; confirm finished books; add an optional note about the child's reading interests; remove books from the shelf; and remove flagged content. A parent may **not** see system or admin information, other families' data, or the recommender's algorithm or logs. Comes in two kinds: **Main Parent** and **Sub Parent**. Parents and kids are the only end-user roles (`BR-user-roles`).

### Parent Dashboard

The weekly view for a parent of their child's reading journey, changing interests, bookshelf activity and progress over time, built from the child's data under the **Internal Child ID** (`UC-PAR-view-growth-report`; client answers 2026-10-28, Q10). It is an engagement feature. It began as the **Recap**, which was qualitative only.

_**Status:** in the MVP (team decision 2026-10-29)._

_**Open:** what it may show, given `BR-recap-qualitative-only` (`OI-31`)._

### Parent Note

An optional free-text note of at most 250 characters from a parent about their child's reading interests, to help BookBuddies recommend more relevant books. A parent may write one when creating the child's profile and after confirming a finished book. It is shown with a prompt not to include personal, identifying, sensitive or confidential information, is visible to the parent and the recommender, and is never shown to the child. An internal **Word List** checks it, and a match is flagged for human review by an authorized admin (`BR-parent-note`, `BR-note-safety-flagging`, `UC-PAR-create-kid-account`, `UC-SHLF-par-finish-book`).

_**Not to be confused with:** a **Parent Suggestion**'s personal note, which the child sees._

### Parent Review

The step where a parent sees a **Recommendation Batch** before the child does and may remove any book they object to. The parent doesn't have to approve each book; remaining books are released to the child (`UC-REC-parent-review`, `BR-parent-ultimate-say`). The flowchart also uses "Parent Review" for the parent's whole view of the child's shelf, notes, badges and growth over time.

_**Not to be confused with:** the **24-Hour Review** (withdrawn)._

### Parent Suggestion

A specific catalog book a parent recommends to their child, with an optional personal note the child sees (e.g., "I think you will like this because it's by the same author as…"). It goes on the child's recommendation list, never directly on the shelf; the child can accept, save for later, or decline it like any other recommendation (`BR-parent-rec-not-forced`, `UC-PAR-suggest-book`).

### Pending Deletion

_**Withdrawn 2026-10-28:** children write no reflections, so nothing enters this state (`UC-SHLF-kid-add-note` was removed). Kept so older documents make sense._

The 24-hour state a child's own reflection enters when they delete it. It's hidden from the child and parent, and the child can restore it during that window; afterwards it is deleted. Only an *unflagged* reflection can be deleted (`UC-SHLF-kid-add-note`).

_**Open:** no client source yet confirms the 24-hour length or the restore right._

### Per-Child Exclusion

The permanent record, created by a **Book Report**, that a book must never again appear for that one child: not in recommendations, not in **Manual Search**, and not on the shelf (`BR-parent-report-book`, `KD-book-exclusion`, `DI-report-exclusion`). It has no undo, and an admin discarding the report does not remove it. It affects no other child.

_**Not to be confused with:** a catalog **block**, which is global and set only by the admin (`UC-ADM-block-content`)._

### Rating

A child's reaction to a book they've finished, once a parent has confirmed the finish (**Finish Confirmation**), chosen from **four options: Loved it / Liked it / It was okay / Not for me** (flowchart step 7; Dr. Yang's 2026-09-21 notes). This is the "child feedback loop" in the MVP goals and feeds the recommender. Ratings are per child; the community-wide aggregate rating ("five kids rated it five stars") was dropped with the social layer.

_**Decision:** the team adopted the four-option scale on 2026-10-07, over the 9/24 note's "stars or thumbs." `OI-17` is closed and `FR-RATE-rating` follows it. The client's 2026-10-28 wording "taps their stars" is read as this scale._

_**Not to be confused with:** a **Recommendation Reaction** (Yes / Maybe later / Not for me), which happens *before* reading. Both include "Not for me," so UI copy and data fields must keep them distinct._

### Recap (Weekly/Monthly Recap, Growth Report)

An optional weekly or monthly summary of a child's reading, shown only to the parent, as a short qualitative snapshot — no counts, streaks, charts or progress bars (`FEAT-recap-adult`, `BR-recap-qualitative-only`, `UC-PAR-view-growth-report`). The flowchart's "See growth/journey over time" is understood to mean this.

_**Status:** the client asked for a weekly parent dashboard on 2026-10-28 (Q10); see **Parent Dashboard**. It is in the MVP (team decision 2026-10-29); its contents are `OI-31`._

### Reading Level

A child's reading ability on a scale the parent already knows — Lexile, AR/ATOS, DRA, Guided Reading Level, or a grade-level range. It is **optional and parent-entered** at sign-up (`BR-reading-level-parent-entered`, `FEAT-reading-level-input`). If the parent is unsure, the app may link to outside tools (AR Bookfinder, Scholastic Book Wizard) for reference only.

- **Never assessed:** BookBuddies must not test, estimate, infer or assign a reading level (`BR-no-reading-level-assessment`). This replaces the in-app reading test from 2026-09-10 (see **Retired Terms**).
- **Not the main signal:** age and grade are the main recommendation signals. A reading level, when given, is used to match book difficulty (`BR-reading-level-proxy`).
- **Never shown to the child** (`BR-kid-no-metrics`). The v0.4 conflict about showing it on the Achievement Page is moot now that page is retired, and `OI-6` is closed.

### Recommendation Batch

The set of books one recommendation request produces for a child. It's stored with its source (rules or AI) and status (pending, released, or empty), and it goes through **Parent Review** before the child sees it (`UC-REC-recommend-quiz-rules`). The target size is five books (Dr. Yang's "recommend the top 5"); the final number is still `OI-2`.

### Recommendation Quiz

The short set of button choices a child makes **every time** they want new recommendations, not just at onboarding (`FEAT-recommendation-quiz`, `FR-REC-every-request`). The child picks values from the **Book Domains** (e.g., funny + animals + quick read). Answers filter that request only and are never stored as a reading-level estimate.

_**Synonyms:** earlier documents say "picture-based quiz." Current wording is "button options, not free text." Final UI to be confirmed._

### Recommendation Reaction

A child's response to each recommended book: **Yes** (goes on the shelf as Reading Now), **Maybe later** (goes on the shelf as Maybe Later), or **Not for me** (declined, with an optional **Decline Reason**). This is the only way a recommended book reaches the shelf (`UC-REC-kid-review`). The SRS calls the same three choices accept / defer / decline (`FR-REC-react`).

### Recommender (BookBuddies Recommender)

The system that turns the **Seed Catalog**, a child's **Starting Reader Profile** and quiz answers into a **Recommendation Batch**. The MVP recommender is rules-based (`CO-rules-first-recommender`), following Dr. Yang's 2026-09-21 steps:

1. The child picks values in a few **Book Domains**.
2. **Filter:** drop books that clearly don't fit the child's age or reading level.
3. **Score:** give points for each match (+2 per matching value in her example).
4. **Recommend the top 5**, with a short reason ("We picked these because you wanted something funny, fast, and full of animals").
5. *(Post-MVP)* Use AI on kids' ratings, liked/disliked options and the parent's notes to weight future picks ("BookBuddies Learns" in the flowchart).

**Recommender mode** is one system-wide setting — *rules* (MVP) or *AI* (post-MVP). Only the system changes it, never a child or parent, and a request never falls back from one mode to the other.

_**Client intent:** Dr. Yang wants AI eventually, based on her **Shiny App**; the 9/21 and 9/24 sources agree on rules first, ML later (`FEAT-ai-recommendation`, `RI-scope-creep-ai`). The client accepted rule-based V1 on 2026-10-28 (Q7): the recommender learns from the child's choices and ratings, the parent's input and optional note, and shelf history over time. The exact MVP rules and batch size are still `OI-2`._

### Reflection (Note)

_**Withdrawn 2026-10-28:** the client removed free text from the child side so children cannot enter identifying or sensitive information (`BR-child-structured-responses`, `OI-28`). A parent may write an optional **Parent Note** instead. Kept so older documents make sense._

An optional piece of writing a child adds after reading a book — why they liked or disliked it, quotes, ideas, or who they'd recommend it to (`FEAT-kid-reflections`, `UC-SHLF-kid-add-note`). It is always visible to the parent, and children ages 5–12 can't make private notes (`BR-notes-visible-to-parent`). It can feed the recommender. During onboarding, the child is told that harmful content is reported (`FR-NOTE-disclosure`).

_**Superseded:** Dr. Yang's 2026-09-21 notes mention "private notes the child chooses not to share." The later 2026-09-24 meeting removed private notes, and that governs._

### Report Function

How unsafe content gets surfaced. There are two paths:

- **Automatic:** a **Safety Flag** on a parent's note, set by the **Word List**.
- **Parent-initiated:** a parent may remove flagged words or content and report abuse or self-harm signals (`BR-parent-content-removal`).
- **Parent book report:** a parent reports an unsuitable catalog book for their child, which goes to the admin's list of reported books (see **Book Report**).

_**Open:** the 2026-09-24 wording says content is reported to "parents and authorities." What reporting to authorities would involve is `OI-18`._

### Safety Flag

A marker the system sets on a **Parent Note** that matches the **Word List**. It is saved in the same transaction as an in-app alert, carrying no note content, to the **System Admin**, who reviews it as a human (`BR-note-safety-flagging`, `SAF-flag-delivery`). Nothing happens automatically and nothing is sent to an outside service or party. Admins handle flags through `UC-ADM-flag-review`, the one exception to `BR-admin-limited-view` (team position 2026-10-26, client to confirm, `OI-15`). Ratings and the child's other choices are never flagged; they carry no text.

_**Open:** client confirmation of what the admin sees (`OI-15`); a stronger detector and any reporting outside wait for testing and legal advice (`OI-18`, `OI-19`)._

### Seed Catalog

The elementary-level books BookBuddies launches with, each tagged with the **Book Domains**. As of 2026-10-28 the source is the client's curated `BookBuddies_Seed_Catalog.xlsx` (134 tagged books), loaded by an offline import (`AS-book-data-source`, `KD-catalog-import-offline`, `OI-1` resolved). Each book gets an internal book ID; the ISBN and Open Library ID are only for matching to outside records; the Status field controls which books can be recommended; and series name and number are stored. The spreadsheet's "Kid Testing Reaction" column is test-profile data, not catalog data. Admins can add, edit or block single books afterwards (`UC-ADM-add-content`, `UC-ADM-edit-content`, `UC-ADM-block-content`). The catalog is meant to grow later through Open Library, and the verified seed can serve as a reference set for checking automated tagging.

_**Superseded:** the earlier ideas of using Google Books (2026-09-10), Open Library plus Dr. Yang's own hand-coding (2026-09-21), and a Kaggle or GitHub dataset (2026-09-24, dropped by the client on 2026-10-28)._

### Shelf (My Bookshelf)

A child's personal list of books, in four categories: **Reading Now**, **Want to Read**, **Maybe Later**, **Finished** (flowchart step 6; `FEAT-shelf`). Books arrive through a **Recommendation Reaction** or a parent-approved **Manual Search** request. A book the child moves to Finished waits for a parent's **Finish Confirmation** before the child can rate it. A parent can view the shelf and remove books, and the child gets an in-app notice when that happens (`BR-parent-shelf-removal`). A parent can't add books to the shelf directly.

_**Superseded categories:** want-to-read / read / recommend (9/10); want to read / reading / recommended to friends / don't want to read (9/24)._

### Shelf Request

A child's request, made from **Manual Search**, to put a book on their shelf in a chosen category. Nothing is added until a linked parent approves it; the parent may also decline it. Its status is pending, approved, declined, cancelled, or already satisfied (`UC-SHLF-manual-search`, `DI-shelf-requests`).

_**Open:** no business rule governs the approval yet, no use case covers the parent's side of it, and expiry is undefined (`UC-SHLF-manual-search` Open Issues)._

### Shiny App

Dr. Yang's earlier prototype, built in R Shiny. It logged books her daughter read and her comments about them, then ran an AI tool over the comments for sentiment analysis to guide selection. It's the personal inspiration for the BookBuddies **Recommender** — she wants BookBuddies to be "much fancier."

### Similarity ("Similar Kids")

The basis for future collaborative filtering: children count as "similar" only by shared behavior (saved +, loved it ++, rated highly ++, skipped −), never by age, location or other demographics (`BR-similarity-signal-weights`).

_**Status:** post-MVP, deferred until there are enough users. The "recommended to a peer (+++)" signal is gone with peer sharing, and the 9/24 meeting asked for low rating weights early on — weights need reconfirming._

### Starting Reader Profile (Onboarding Profile)

The profile built when a child account is set up, from: age, grade, an optional reading level, reading interests (subjects, genres), and a few favorite books already read, chosen from the catalog (`FEAT-onboarding-profile`, `UC-REC-kid-onboarding`). The parent enters it. It is the starting input for the **Recommender** and is updated over time by the child's choices, ratings and shelf activity (the **Interest Profile**).

_**Synonyms:** "reading profile" in Dr. Yang's 9/21 notes._

### Sub Parent

A second parent or guardian added to a family by the **Main Parent**. A Sub Parent has the same access to the children as the Main Parent, except that they cannot create or delete accounts. The Sub Parent gets an email invitation and sets their own username and password (`UC-PAR-create-sub-parent-account`).

_**Synonyms:** secondary parent (business-rules, SRS)._

### System Admin

The platform-wide operator role. It manages the catalog (add, edit, block and unblock books), reviews reported books and flagged parent notes, suspends and reinstates child and parent accounts, views recommender and usage statistics and the audit log, and receives **Safety Flag** alerts. It does not have screens for the recommender mode or other system configuration, which are deployment settings (architecture §8.2.6); retention is enforced by the scheduled cleanup; data export belongs to parents (`UC-PAR-review-child-data`); an authorized admin may look up one child's **Usage Data** by **Internal Child ID** (`UC-ADM-view-usage-stats`); and admin accounts are created by hand (`UC-ADM-add-admin` is post-MVP). In practice the client is the system admin (team decision 2026-10-26). A System Admin sees parents' and Sub Parents' names, usernames and emails (never passwords) and the number of child accounts per parent, but **not** a child's details (`BR-admin-limited-view`), except in flagged-content review, where every view is recorded (`UC-ADM-flag-review`). Children are otherwise identified to admins by internal child ID only, and the system holds no child real name. Admin use cases: add, edit, block or unblock content; suspend a child or parent account, or reinstate one; view recommender and usage stats, including the child lookup; view the audit log; flag review.

_**Open:** client confirmation that flagged-content review is the only exception to the no-child-details rule (`OI-15`), and whether a separate **Catalog and Content Admin** role is needed._

### Usage Data (Usage Record)

The record of what a child did in the app, kept under the **Internal Child ID**: sign-ins and meaningful actions such as recommendation responses and decline reasons, shelf activity and ratings, each with a time. It supports the client's V1 engagement measures and the admin's lookup of one child. It is not identifying data, and the lookup never shows a name (`BR-kid-data-stored`, `BR-admin-limited-view`, `UC-ADM-view-usage-stats`).

_**Open:** per-child session length is not stored until a purpose and a retention period are set._

### Weekly Check-in

A weekly notification to the parent only, asking whether the child has finished a book ("Has [Child Profile Name] finished [book]? Tap to let them rate it."). Tapping it opens the parent's **Finish Confirmation**; after the child rates the book, the child sees 3 books to read next (`FR-NOT-weekly-reminder`, `UC-SHLF-par-finish-book`, `UC-SHLF-kid-rate-book`; client answers 2026-10-28, Q5, Q14).

_**Open:** the channel (the client says push; the architecture is in-app only), the day and time, and which shelves trigger it (`OI-30`)._

### Word List

The internal list of words and phrases that flags a **Parent Note** for human review. It runs inside the app, sends nothing to an outside service, and takes no automatic action (`BR-note-safety-flagging`). Each flag records the detection method and version, so a better detector can replace it later (`UC-ADM-flag-review`).

_**Open:** the words and the flag categories are not yet written (`OI-19`)._

---

## Retired Terms

_These terms appeared in earlier client material but were **removed from the project until further notice** on 2026-09-24 (team position confirmed 2026-10-26). They are not on any roadmap. Kept here so older documents and meeting notes still make sense. Don't build against them unless the client reopens them._

### Achievement Page — WITHDRAWN

A Duolingo-style weekly or monthly page showing books read, genres, and reading-level progress (e.g., "reading level 3.2"), proposed in the 2026-09-10 meeting. Withdrawn because a child never sees their reading level or counts (`BR-kid-no-metrics`). The ideas it carried now belong to **Gamification Badge** (for the child) and **Recap** (for the parent). `FEAT-achievement-pages`.

### Buddy Picks (Peer Feed, Peer Picks) — WITHDRAWN 2026-09-24

The feed of books recommended by other children in a child's adult-approved reading group. Removed with all peer-to-peer social sharing ("too complicated for now"). `FEAT-peer-feed`, `CO-no-social`.

### In-App Reading Test (Reading-Level Baseline) — WITHDRAWN 2026-09-24

An online reading test at account creation, agreed live on 2026-09-10. The client reversed it: the app must never assess reading level. Replaced by the optional, parent-entered **Reading Level**. `FEAT-reading-level-baseline` → `FEAT-reading-level-input`.

### Reading Group — WITHDRAWN 2026-09-24

A user-started reading community of about 2–20 children (family, class, or friends) that decided whose recommendations showed in Buddy Picks. Removed along with peer sharing, including the rule that an adult approves every group member. `FEAT-groups`, `FEAT-group-sharing-controls`, `BR-group-adult-approval`.

### Social Boundary — WITHDRAWN 2026-09-24

The rule that a child's name on a recommendation was visible only within their own adult-approved Reading Group (`BR-buddy-visibility-boundary`). Moot now that children never see each other. The separate **Data Boundary** still applies.

### Stretch My Reader — WITHDRAWN 2026-09-24

An opt-in prompt on the Achievement Page offering harder but age-appropriate books after a milestone. Client: "No stretch my reader option." `FEAT-stretch-my-reader`.

### Teacher — WITHDRAWN 2026-09-24

A third adult role that could flag content as age-inappropriate and comment on a group's reading, but not restrict books. Removed to keep the project focused: the only roles now are parent, kid, and system admin (`BR-user-roles`). `FEAT-teacher-flagging`.

_**Note:** Dr. Yang's 2026-09-21 notes still asked whether a child profile could later be linked to more than one authorized adult without restructuring the database. That is a design-flexibility question, not a requirement._
