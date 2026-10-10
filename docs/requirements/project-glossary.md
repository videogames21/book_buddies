# Project Glossary

**Project:** BookBuddies
**Team:** Team 05 — BookBuddies
**Client:** Dr. Yang Yang
**Version:** 0.5

---

> **What changed in v0.5.** The 2026-09-24 client meeting, Dr. Yang's 2026-09-21 written answers, and the follow-up flowchart cut the teacher role, reading groups, Buddy Picks, Stretch My Reader, the Achievement Page and the in-app reading test. Those terms now live under **Retired Terms** at the bottom, so nobody builds against them. Live definitions were rewritten to match business-rules v0.2, vision-and-scope v0.4, SRS v0.2 and use-cases v0.9. The Reading Level visibility conflict from v0.4 is now settled: the app never assesses a child's level and never shows it to the child.

## Revision History

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-09-08 | 0.1 | Initial template | Iid Maxamuud |
| 2026-09-13 | 0.2 | Replaced worked examples with real BookBuddies terms from the team one-pager, the feature brief, and Dr. Yang's follow-up design notes (9/12). | Iid Maxamuud |
| 2026-09-13 | 0.3 | Checked every term against the actual meeting-1 transcript (2026-09-10). Confirmed "Buddy Picks" as client vocabulary; added terms that surfaced live (Shiny App, 24-Hour Review, Achievement Page, Rating); flagged a direct conflict between what Dr. Yang said live and wrote afterward on Reading Level visibility. | Iid Maxamuud |
| 2026-09-17 | 0.4 | Corrected the Recommender entry's citation to point at OPEN-ISSUES.md `OI-2` instead of the (template) interview guide file | Team 05 |
| 2026-10-07 | 0.5 | Applied the 2026-09-21 written answers, the 2026-09-24 meeting, and the flowchart. Moved cut terms (Achievement Page, Buddy Picks, In-App Reading Test, Reading Group, Social Boundary, Stretch My Reader, Teacher) to a new Retired Terms section as permanently out of scope. Rewrote Rating (4-option scale), Reading Level (parent-entered, never shown to the child), Recommender (rule-based scoring, recommender mode), Seed Catalog (pre-tagged Kaggle/GitHub dataset), and Report Function. Added terms used by the use cases and design: Main Parent, Sub Parent, Starting Reader Profile, Book Domains, Shelf categories, Recommendation Reaction, Decline Reason, Recommendation Batch, Parent Suggestion, Reflection, Pending Deletion, Safety Flag, Custom Tag, System Admin, Catalog and Content Admin, Recap, Active User, Age Band, Area Code, Manual Search, MVP. | Iid Maxamuud |

---

## Definitions

### 24-Hour Review

The parent-side compliance mechanism Dr. Yang proposed on 2026-09-10: within 24 hours, a parent must confirm they have reviewed what the child did in the app ("I have read whatever my kid is doing on this app in the past 24 hours. I have no objection."). Missing the window temporarily suspends the child's account.

_**⚠️ Status unconfirmed:** none of the 2026-09-24 sources mention it again, and one raw note from that meeting says "take out parent approval option." Do not build it or drop it until the client answers — see `OI-16` and `BR-24hr-review-window`._

_**Not to be confused with:** per-book approval ("parents do not need to approve every decision a kid makes about book choices"), **Parent Review** of a recommendation batch, or **Pending Deletion** (a different 24-hour window, for a child's own reflection)._

### Accelerated Reader (AR / ATOS)

A reading-level scale (ATOS is the AR book-level number) used, along with Lexile and others, to tag book difficulty and as one of the scales a parent may use to enter a child's optional **Reading Level**. Parents who don't know their child's level may be pointed to AR Bookfinder for reference.

### Active User

Dr. Yang's working definition (2026-09-21) for admin usage statistics: an account that did something meaningful in the period — logged in, used the recommender, viewed a book's details, saved or dismissed a recommendation, updated a reading profile, or completed an engagement activity. Automatic messages, background processes and account setup don't count. Used by `UC-ADM-view-usage-stats`.

### Adult Influence

A parent's private note about a child (e.g., a growth theme such as "building confidence") that quietly shapes which books surface, without the child ever seeing the note (`BR-adult-influence-hidden`).

_**⚠️ Status unclear:** the 2026-09-24 meeting removed "direct/bias content controls" from the MVP, which may mean this feature. Confirm with the client (`FEAT-adult-influence-notes`)._

_**Not to be confused with:** a **Parent Suggestion**, whose optional note the child *does* see._

### Age Band

An age range used to tag a book's age fit in the **Seed Catalog**, e.g., 6–8, 7–10, 9–12. It is one of the **Book Domains**. It is not the child's age; the child's actual age and grade are stored on the **Child Profile**.

### Area Code

The short prefix that groups use cases and features by area: `PAR` (parent accounts and oversight), `SHLF` (shelf, ratings, reflections, manual search), `REC` (recommendations), `ADM` (system admin). Use case IDs take the form `UC-<AREA>-<slug>`. A `GRP` (groups) area was proposed in the team's 9/21 email and dropped when groups were cut.

### Book Domains (BookBuddies Coding)

The fixed set of characteristics every catalog book is tagged with, so the **Recommender** can match a child's answers to books (`FEAT-book-tagging`, `DI-book-tags`):

| Domain | Values |
|---|---|
| Genre/Subject | funny, mystery, adventure, animals, fantasy |
| Mood | silly, heartwarming, exciting, spooky-but-safe |
| Format | comic/graphic novel, picture book, chapter book |
| Themes | friendship, courage, resilience, family, problem-solving, animals |
| Length | quick read, longer story |
| Age/Interest Fit | **Age Band**, e.g., 6–8, 7–10, 9–12 |
| Reading Level / Challenge | Lexile or AR level, from sources such as Scholastic Book Wizard or the publisher |

_**Source:** Dr. Yang's 2026-09-21 notes (Table 2); flowchart slide 2._ These values are called **standard tags**. Admins may also add **Custom Tags**.

### Catalog and Content Admin

A possible second admin role Dr. Yang proposed on 2026-09-21: someone who maintains the book catalog, book metadata and recommender rules, with **no** access to family or child accounts. She asked whether this should be separate from the **System Admin** to limit access to children's information.

_**Status:** proposed, not decided. Use cases currently have a single admin role._

### Child Profile (Child Account)

A child's account, created only by a parent and always linked to a parent account (`BR-parent-creates-kid-account`, `BR-parent-account-linked`). It has two layers:

- **Stored:** real name, age, grade, and a reading level only if the parent gives one (`BR-kid-data-stored`). The real name is kept so the platform can report to law enforcement when required. In the design, identifying details live only in the **Child Identity Store** (`KD-pii-segregation`).
- **Displayed:** nickname and character avatar only — see **Kid-Facing Profile**.

The parent sets the child's username, and the system generates the password, which is shown to the parent once (`UC-PAR-create-kid-account`).

### COPPA

The Children's Online Privacy Protection Act (U.S. federal law). As of 2026-09-24 the client wants COPPA compliance "built in from the start," starting with recorded parental consent at account creation (`BR-coppa-parental-consent`). Dr. Yang is sending the team the COPPA rules link; add further rules only from that source.

_**Note:** the team is designing toward COPPA-aligned practice, not formal certification, which would need legal review (`AS-coppa-adjacent-only`)._

### Custom Tag

A free-form label an admin adds to a catalog book on top of the standard **Book Domains** tags (e.g., "Cute," "Scary but Warming"). Custom tags are trimmed, case-normalized, and shared across the catalog (`UC-ADM-add-content`).

_**Open:** whether children see custom tags, whether the recommender or **Manual Search** uses them, and who may rename or delete them._

### Data Boundary

The rule for what the recommender may learn from: anonymous, behavior-only signals across every registered user — never demographic traits (`BR-similarity-data-boundary`). A child's notes may feed the recommender without being shown to other children.

_**Status:** applies once the recommender uses cross-user data (post-MVP); the MVP rules recommender uses only the child's own profile and quiz answers._

### Decline Reason

The optional reason a child gives when they tap "Not for me" on a recommended book: *Not interested in topic*, *Too easy / too short*, *Too hard / too long*, *Not my style*, or *Other* (flowchart slide 1; `UC-REC-kid-review`).

_**Open:** whether the parent sees decline reasons, and whether a declined book can come back later._

### Gamification Badge

A badge a child earns for a pattern in their reading, shown as part of their reader identity, never as a count, level, or comparison with other kids (`FEAT-reading-identity-badges`, `BR-kid-no-metrics`). Dr. Yang's 2026-09-21 design: after 3 meaningful interactions (save, read, like) in a category, the matching badge unlocks. There are three badge types:

| Type | Trigger | Example |
|---|---|---|
| Interest/Genre | Repeated engagement with a topic or genre | "Animal Explorer" |
| Exploration | Tries books outside usual preferences | "Genre Traveler" |
| Creator | Uses a book as inspiration for their own story or drawing | "Story Maker" |

_**Status:** post-MVP (`UC-SHLF-view-badges`). The final badge list is still open (`OI-14`). Per 2026-09-24, any logged reading hours behind a badge need parent approval, to stop kids gaming the system. Parents can see their child's badges ("See Badge" in the flowchart's Parent Review)._

### Kid-Facing Profile

What a child (and the app) displays: nickname, character avatar, color, and earned **Gamification Badges**. It never shows the child's real name, reading level, reading streaks, book or page counts, or any comparison with other children (`BR-kid-anonymous-profile`, `BR-kid-no-metrics`).

_**Not to be confused with:** the stored **Child Profile**, which holds the real name, age and grade but never displays them._

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

An adult end user who manages one or more child accounts. A parent may: create and manage child profiles; set the starting reader profile; see the child's shelf, likes and dislikes, reflections, badges, recommendations and reading history; suggest books; remove books from the shelf; and remove flagged content. A parent may **not** see system or admin information, other families' data, or the recommender's algorithm or logs. Comes in two kinds: **Main Parent** and **Sub Parent**. Parents and kids are the only end-user roles (`BR-user-roles`).

### Parent Review

The step where a parent sees a **Recommendation Batch** before the child does and may remove any book they object to. The parent doesn't have to approve each book; remaining books are released to the child (`UC-REC-parent-review`, `BR-parent-ultimate-say`). The flowchart also uses "Parent Review" for the parent's whole view of the child's shelf, notes, badges and growth over time.

_**Not to be confused with:** the **24-Hour Review**._

### Parent Suggestion

A specific catalog book a parent recommends to their child, with an optional personal note the child sees (e.g., "I think you will like this because it's by the same author as…"). It goes on the child's recommendation list, never directly on the shelf; the child can accept, save for later, or decline it like any other recommendation (`BR-parent-rec-not-forced`, `UC-PAR-suggest-book`).

### Pending Deletion

The 24-hour state a child's own reflection enters when they delete it. It's hidden from the child and parent, and the child can restore it during that window; afterwards it is deleted. Only an *unflagged* reflection can be deleted (`UC-SHLF-kid-add-note`).

_**Open:** no client source yet confirms the 24-hour length or the restore right._

### Rating

A child's reaction to a book they've finished, chosen from **four options: Loved it / Liked it / It was okay / Not for me** (flowchart step 7; Dr. Yang's 2026-09-21 notes). This is the "child feedback loop" in the MVP goals and feeds the recommender. Ratings are per child; the community-wide aggregate rating ("five kids rated it five stars") was dropped with the social layer.

_**Decision:** the team adopted the four-option scale on 2026-10-07, over the 9/24 note's "stars or thumbs." Close `OI-17` and update `FR-RATE-rating`._

_**Not to be confused with:** a **Recommendation Reaction** (Yes / Maybe later / Not for me), which happens *before* reading. Both include "Not for me," so UI copy and data fields must keep them distinct._

### Recap (Weekly/Monthly Recap, Growth Report)

An optional weekly or monthly summary of a child's reading, shown only to the parent, as a short qualitative snapshot — no counts, streaks, charts or progress bars (`FEAT-recap-adult`, `BR-recap-qualitative-only`, `UC-PAR-view-growth-report`). The flowchart's "See growth/journey over time" is understood to mean this.

_**Status:** post-MVP pending client confirmation._

### Reading Level

A child's reading ability on a scale the parent already knows — Lexile, AR/ATOS, DRA, Guided Reading Level, or a grade-level range. It is **optional and parent-entered** at sign-up (`BR-reading-level-parent-entered`, `FEAT-reading-level-input`). If the parent is unsure, the app may link to outside tools (AR Bookfinder, Scholastic Book Wizard) for reference only.

- **Never assessed:** BookBuddies must not test, estimate, infer or assign a reading level (`BR-no-reading-level-assessment`). This replaces the in-app reading test from 2026-09-10 (see **Retired Terms**).
- **Not the main signal:** age and grade are the main recommendation signals. A reading level, when given, is used to match book difficulty (`BR-reading-level-proxy`).
- **Never shown to the child** (`BR-kid-no-metrics`). The v0.4 conflict about showing it on the Achievement Page is moot now that page is retired. Recommend closing `OI-6`.

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
5. *(Post-MVP)* Use AI on kids' ratings, liked/disliked options and notes to weight future picks ("BookBuddies Learns" in the flowchart).

**Recommender mode** is one system-wide setting — *rules* (MVP) or *AI* (post-MVP). Only the system changes it, never a child or parent, and a request never falls back from one mode to the other.

_**Client intent:** Dr. Yang wants AI eventually, based on her **Shiny App**; the 9/21 and 9/24 sources agree on rules first, ML later (`FEAT-ai-recommendation`, `RI-scope-creep-ai`). The exact MVP rules and batch size are still `OI-2`._

### Reflection (Note)

An optional piece of writing a child adds after reading a book — why they liked or disliked it, quotes, ideas, or who they'd recommend it to (`FEAT-kid-reflections`, `UC-SHLF-kid-add-note`). It is always visible to the parent, and children ages 5–12 can't make private notes (`BR-notes-visible-to-parent`). It can feed the recommender. During onboarding, the child is told that harmful content is reported (`FR-NOTE-disclosure`).

_**Superseded:** Dr. Yang's 2026-09-21 notes mention "private notes the child chooses not to share." The later 2026-09-24 meeting removed private notes, and that governs._

### Report Function

How unsafe content gets surfaced. There are two paths:

- **Automatic:** a **Safety Flag** on a child's reflection or review.
- **Parent-initiated:** a parent may remove flagged words or content and report abuse or self-harm signals (`BR-parent-content-removal`).

_**Open:** the 2026-09-24 wording says content is reported to "parents and authorities." What reporting to authorities would involve is `OI-18`._

### Safety Flag

A marker the system sets on a child's reflection or review that contains violent or self-harm content. It is saved in the same transaction as an immediate in-app alert to the parent and the **System Admin** (`BR-note-safety-flagging`, `SAF-flag-delivery`). A flagged reflection can't be deleted. Admins handle flags through `UC-ADM-flag-review`, the one exception to `BR-admin-limited-view`.

_**Open:** exactly what the admin sees (`OI-15`), and how the content is detected (no open issue yet)._

### Seed Catalog

The 30–50 elementary-level books BookBuddies launches with, across genres including comics and graphic novels, each tagged with the **Book Domains**. As of 2026-09-24 the source is a **pre-tagged children's-book dataset from Kaggle or GitHub**, loaded by an offline import (`AS-book-data-source`, `KD-catalog-import-offline`). Admins can add or block single books afterwards (`UC-ADM-add-content`, `UC-ADM-block-content`).

_**Superseded:** the earlier ideas of using Google Books (2026-09-10) or Open Library plus Dr. Yang's own hand-coding (2026-09-21). **Still open:** which dataset — none has been named or approved (`OI-1`)._

### Shelf (My Bookshelf)

A child's personal list of books, in four categories: **Reading Now**, **Want to Read**, **Maybe Later**, **Finished** (flowchart step 6; `FEAT-shelf`). Books arrive through a **Recommendation Reaction** or a parent-approved **Manual Search** request. A parent can view the shelf and remove books, and the child gets an in-app notice when that happens (`BR-parent-shelf-removal`). A parent can't add books to the shelf directly.

_**Superseded categories:** want-to-read / read / recommend (9/10); want to read / reading / recommended to friends / don't want to read (9/24)._

### Shiny App

Dr. Yang's earlier prototype, built in R Shiny. It logged books her daughter read and her comments about them, then ran an AI tool over the comments for sentiment analysis to guide selection. It's the personal inspiration for the BookBuddies **Recommender** — she wants BookBuddies to be "much fancier."

### Similarity ("Similar Kids")

The basis for future collaborative filtering: children count as "similar" only by shared behavior (saved +, loved it ++, rated highly ++, skipped −), never by age, location or other demographics (`BR-similarity-signal-weights`).

_**Status:** post-MVP, deferred until there are enough users. The "recommended to a peer (+++)" signal is gone with peer sharing, and the 9/24 meeting asked for low rating weights early on — weights need reconfirming._

### Starting Reader Profile (Onboarding Profile)

The profile built when a child account is set up, from: age, grade, an optional reading level, reading interests (subjects, genres), and a few favorite books already read, chosen from the catalog (`FEAT-onboarding-profile`, `UC-REC-kid-onboarding`). The parent enters it. It is the starting input for the **Recommender** and is updated over time by ratings and reflections.

_**Synonyms:** "reading profile" in Dr. Yang's 9/21 notes._

### Sub Parent

A second parent or guardian added to a family by the **Main Parent**. A Sub Parent has the same access to the children as the Main Parent, except that they cannot create or delete accounts. The Sub Parent gets an email invitation and sets their own username and password (`UC-PAR-create-sub-parent-account`).

_**Synonyms:** secondary parent (business-rules, SRS)._

### System Admin

The platform-wide operator role. It manages accounts and roles, the catalog, recommender settings, system configuration, notifications, audit logs, usage analytics, and data export and retention, and it receives **Safety Flag** alerts. A System Admin sees parent credentials and the number of child accounts per parent, but **not** a child's details (`BR-admin-limited-view`). Children are identified to admins by internal profile ID only. Admin use cases: suspend account, add or block content, view recommender and usage stats, flag review.

_**Open:** whether flagged-content review is the only exception to the no-child-details rule (`OI-15`), whether the admin may suspend accounts at all, and whether a separate **Catalog and Content Admin** role is needed._

---

## Retired Terms

_These terms appeared in earlier client material but were **permanently removed from the project** on 2026-09-24. They are not deferred features. Kept here so older documents and meeting notes still make sense. Don't build against them unless the client reopens them._

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
