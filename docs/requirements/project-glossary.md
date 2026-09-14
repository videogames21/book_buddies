# Project Glossary

**Project:** BookBuddies
**Team:** Team 05 — BookBuddies
**Client:** Dr. Yang Yang
**Version:** 0.3

---

_**How to use this template.** Instructions appear in italic square brackets. Fill in underneath them and leave them in the file until the document is stable._

_**What this document is for.** Every project has words that mean something specific inside the client's organization and something else outside it, or nothing at all. This file fixes one word to one concept, and commits the team, the client, and the AI teammate to using it. That shared vocabulary is called a **ubiquitous language**: the same term in the client conversation, in the vision and scope, in the use cases, in the class names, and in the database columns._

_**Why the glossary is the first artifact you write and the last one you finish.** It is the cheapest document to start, because your client hands you the terms in the first meeting whether you ask or not, and it is the one that keeps paying: every later document cites it instead of redefining things._

## Why this matters when an agent writes your code

_[Read this once, then delete this section when the document goes stable.]_

_If two words in your project mean the same thing and nothing says so, your team will use both. So will your agent. You will end up with a `Team` class and a `Group` table, a `submitReport` endpoint and a `war_entry` record, and every one of those pairs is a bug waiting for the week you try to join them._

_An agent cannot resolve this on its own. Asked to add a feature, it reads what is in the repository and imitates it. If the repository is inconsistent it will faithfully reproduce the inconsistency, and it will invent a plausible synonym for anything the repository never names. A glossary in the repository is the only thing that stops it, because the repository is the whole of the agent's memory of your project._

_The other half is human. When your client says "cycle" in one sentence and "sprint" in the next, that is your signal to ask which one they mean, in the meeting, while they are in front of you. An agent reading the transcript later cannot ask._

> **BookBuddies has two of these, now confirmed against the actual meeting transcript.** (1) The early feature brief calls the friends'-recommendations feature a "peer feed"; the one-pager and project brief call it "Buddy Picks." Dr. Yang herself used the word "buddy" unprompted in the meeting ("protect... the buddy's identity"), never "peer feed" — this glossary now treats **Buddy Picks** as confirmed client vocabulary. (2) Whether a child's reading level is ever shown to the child is **still an open conflict** — see **Reading Level** below — because Dr. Yang said one thing live in the meeting and wrote something different two days later.

## The entries that earn their place

_[The temptation is to define words your teammates already know. Skip those. The entries worth writing are:]_

- _**Terms two stakeholders use differently.** The highest-value entry in any glossary._
- _**Terms that sound generic but are not.** "Active", "submitted", "complete", "week"._
- _**The client's acronyms**, spelled out._
- _**Terms you invented** that the client does not use._

_Ask the client directly: "Is there a word your team uses here that I would not guess the meaning of?"_

## Conventions

_[The **term itself is the identifier**. There is no separate numbering scheme, because a glossary entry already has a unique, meaningful name: the word. Cite a term by writing it, and keep the spelling identical everywhere it appears._

_Rules:_

- _One entry per concept. If two words mean the same thing, pick one, define it, and list the other as a synonym under it rather than giving it its own entry._
- _Alphabetical order, so a reader can find a term without searching._
- _Define the concept, not the implementation. "A weekly record of what a student did" is a definition; "a row in the `war` table" is not._
- _Use the client's word when the client has one. You are joining their world, not renaming it._
- _If a term has a meaning outside this project that differs from the one here, say so explicitly.]_

## Revision History

| Date | Version | Description | Author |
|---|---|---|---|
| _[YYYY-MM-DD]_ | 0.1 | Initial template | _[Name]_ |
| 2026-09-13 | 0.2 | Replaced worked examples with real BookBuddies terms from the team one-pager, the feature brief, and Dr. Yang's follow-up design notes (9/12). | _[Name]_ |
| 2026-09-13 | 0.3 | Checked every term against the actual meeting-1 transcript (2026-09-10). Confirmed "Buddy Picks" as client vocabulary; added terms that surfaced live (Shiny App, 24-Hour Review, Achievement Page, Rating); flagged a direct conflict between what Dr. Yang said live and wrote afterward on Reading Level visibility. | _[Name]_ |

---

## Definitions

_[One `###` heading per term, alphabetical. Follow the heading with a definition of one to three sentences. Add **Synonyms**, **Not to be confused with**, or **Source** lines where they help.]_

### 24-Hour Review

The parent-side compliance mechanism Dr. Yang proposed as her own answer to "what laws or regulations apply": within 24 hours, an adult must review what the child has done in the app and acknowledge it ("I have read whatever my kid is doing on this app in the past 24 hours. I have no objection."). Missing that window temporarily suspends the child's account.

_**Not to be confused with:** per-book approval. Dr. Yang was explicit that this is a periodic acknowledgment, not gating each individual book choice — "parents do not need to approve every decision a kid makes about book choices."_

_**Source:** meeting transcript, 2026-09-10._

### Accelerated Reader (AR)

A reading-level scale used, alongside Lexile, to tag each book's difficulty for the seed catalog and to feed the recommender's reading-ability filtering.

_**Source:** BookBuddies_Profiles.docx._

### Achievement Page

A weekly or monthly page shown to a child (and shared with the parent) summarizing reading milestones, explicitly modeled on Duolingo-style engagement. Proposed live by Dr. Yang and enthusiastically endorsed ("I agree. Completely agree.").

_**Not to be confused with:** the Weekly Recap / Monthly Recap described in Dr. Yang's later written notes, which frame the same idea as a *qualitative* snapshot rather than a stats page. The live discussion of the Achievement Page explicitly included a numeric reading level ("reading level 3.2") — see **Reading Level** for the conflict this creates._

### Adult Influence

A mechanism by which a parent or teacher privately nudges which books surface for a child, by adding a free-text note or theme to the child's reading profile, without the child ever seeing the note.

_**Source:** BookBuddies_Profiles.docx (written follow-up; not discussed in the 9/10 meeting)._

### Buddy Picks

The feed of books recommended by people within a child's adult-approved reading group.

_**Synonyms:** an earlier feature document (`BookBuddies.pdf`) uses "peer feed" for what looks like the same concept. **This glossary now treats "Buddy Picks" as confirmed** — in the 9/10 meeting, Dr. Yang used the word "buddy" herself, unprompted, when discussing privacy ("protect the identity of a kid... also the peers, the buddy's identity"), and never said "peer feed." Still worth a quick explicit confirmation, but no longer a coin-flip._

### COPPA

The Children's Online Privacy Protection Act. Appears in Dr. Yang's written follow-up (9/12) as the stated reason several features are omitted.

_**Not to be confused with:** what Dr. Yang actually said live, when a teammate asked directly about "laws or regulations" — she did not name COPPA or any specific law. She said only that the project "is not commercialized" so privacy/confidentiality is priority #1, and proposed the 24-Hour Review as her own compliance mechanism. Confirm she means the U.S. federal statute specifically, not "privacy laws" generally._

### Data Boundary

The rule governing what the recommender's similarity model may learn from: anonymous, behavior-only signals (saved, loved, rated, recommended, skipped) across every registered user, never demographic traits.

_**Source:** BookBuddies_Profiles.docx (written follow-up; not discussed in the 9/10 meeting)._

### Gamification Badge

A recognition earned by a child for a pattern of reading behavior, displayed as identity rather than as a count or leaderboard position.

_**Note:** as of Dr. Yang's 9/12 follow-up, badge design is still "forming/underway" — not discussed by name in the 9/10 meeting, though the underlying engagement goal (see **Achievement Page**) was discussed at length._

### Kid-Facing Profile

A child's own profile: avatar, color, display name, and earned Gamification Badges. Deliberately excludes reading streaks, book/page counts, and — per the written follow-up — the child's own reading level.

_**Open conflict:** see **Reading Level**. The written follow-up says level is never shown to the child; the live meeting discussed showing a specific level on the Achievement Page._

### Lexile (Lexile Framework)

A reading-level measurement scale used, alongside Accelerated Reader (AR), to tag book difficulty and power reading-ability matching.

### Rating

A star-and-emoji score a child gives a book they've read. Ratings are computed **independently per child** — one kid's low rating never suppresses that book in another kid's personal recommendations — but they also **aggregate at the book level across the whole community**, e.g., "five kids rated it five stars, six rated four stars." Confirmed directly by Dr. Yang when a teammate asked whether low ratings from one kid affect recommendations for others.

_**Not to be confused with:** kid-vs-kid comparison (leaderboards, "top recommenders"), which the written follow-up explicitly excludes. A book's aggregate community rating is not the same as comparing children to each other — both can be true at once._

### Reading Group

A family- or classroom-based container of roughly 2–20 children ("loosely termed, not strictly defined," per Dr. Yang) that defines whose recommendations can appear in a child's Buddy Picks feed. User-initiated — a kid can join any group they want (e.g., a comics group) — rather than teacher-imposed. Teachers may give feedback on a group's reading ("this isn't appropriate for this age") but may not impose restrictions.

### Reading Level

A measure of a child's reading ability (Lexile/AR-based), used to feed the recommender and Stretch My Reader.

_**⚠️ Open conflict — how it's captured, and whether the child ever sees it:**_
- _**Capture:** in the 9/10 meeting, the team and Dr. Yang converged on an **in-app baseline reading test at account creation** ("maybe we should add a step to allow kids to do some baseline testing... a free online test to determine a reading level"), explicitly because young kids and even their parents often don't know the number and schools may not test until 2nd or 3rd grade. This superseded an initial assumption that parents would simply type the level in._
- _**Visibility:** in that same meeting, Dr. Yang proposed showing a specific level (e.g., "reading level 3.2") on the child's Achievement Page. Her written follow-up two days later instead says reading level "stays a private adult-side input" and is "never shown to the child."_
- _She flagged this exact area herself, mid-meeting, as unresolved: "I need to keep thinking about the parents' privilege... I may give you something else after this meeting" — and the written follow-up arrived the Saturday before the team's Sunday meeting, so it may be her updated, superseding answer. **Confirm directly rather than assuming.**_

### Recommender

The system that turns the seed catalog and a child's profile into book suggestions.

_**Client's stated intent (9/10 meeting):** Dr. Yang wants **AI-powered recommendations from the start**, modeled on her own Shiny App pattern — log a book plus the kid's free-text comment about it, then run sentiment analysis on the comment to power future picks: "I hope to have a AI-powered kind of recommendation... I use that, a certain AI tool, to analyze and then kind of do some sentiment analysis." This directly corrected the team's opening assumption of "no AI recommendations."_

_**Written follow-up (9/12):** describes a **staged** plan instead — rules only, then rules-narrow-ML-ranks, then ML-does-more — which reads as a way to phase in the AI she wants rather than drop it. The project's own engineering guidance favors simple architecture and avoiding ML absent a clear benefit. See `OI-ai-recommender-scope` in the interview guide: this needs a scoping conversation, not a default in either direction._

### Report Function

A required feature letting a parent flag abuse, self-harm, or harm-to-others content encountered in the app.

_**Source:** meeting transcript, 2026-09-10._

### Seed Catalog

The initial set of 30–50 elementary-reading-level books the platform launches with, spanning multiple genres including comics and graphic novels. Sourcing is **not yet confirmed** — Dr. Yang floated "Google" (possibly the Google Books API) but was visibly unsure: "I don't really— I thought, is that Google has a library of books?"

### Shiny App

Dr. Yang's own earlier prototype, built in R Shiny: logged books her daughter read and her comments about them, then ran an unspecified AI tool over those comments for sentiment analysis to inform selection. The direct personal inspiration for BookBuddies' recommender — she wants BookBuddies to be "much fancier" than it. The team asked for a link to it; confirm it was sent.

### Similarity ("Similar Kids")

The basis for the recommender's collaborative-filtering stage: children are "similar" purely based on shared behavior, never demographic traits.

_**Source:** BookBuddies_Profiles.docx (written follow-up; not discussed in the 9/10 meeting)._

### Social Boundary

The rule governing who can see whose name in a recommendation: visible only within a child's own adult-approved Reading Group.

_**Source:** BookBuddies_Profiles.docx (written follow-up; not discussed in the 9/10 meeting)._

### Stretch My Reader

An option that biases a child's recommendations toward more challenging but age-appropriate books. In the 9/10 meeting, Dr. Yang described it as tied to the Achievement Page: show the current level, then optionally ask "are you interested in the next level?" with recommendations to match — which is the same feature that creates the open Reading Level visibility conflict above.

---

_[End of current terms. Add new entries alphabetically as they surface in future meetings, and keep this file's version and revision history in sync with each change.]_
