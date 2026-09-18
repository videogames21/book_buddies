# Client Interview — Meeting 1

**Project:** BookBuddies
**Team:** Team 05
**Client:** Dr. Yang Yang
**Meeting:** Meeting 1 of several, 2026-09-10

---

> **Note on sourcing.** This pass is built from the actual meeting transcript, plus Dr. Yang's written follow-up (`BookBuddies_Profiles.docx`, sent 9/12 — two days after this meeting) and the team's own pitch/brief documents. The transcript is missing roughly the first 5–6 minutes, so section 1 is thin. Everywhere the transcript and the written follow-up **disagree**, both are shown, flagged, and carried into Open Questions rather than silently reconciled — see especially sections 9 and 15 on reading level.

_**How it actually went:** at least three teammates spoke and asked substantive questions throughout (labeled Speaker 1, Speaker 3, Speaker 4 in the transcript — Speaker 1 appears to be "Mckenzie," addressed by name once). Several team members had each prepared their own question list rather than one merged list, and multiple people asked overlapping questions live. Worth tightening to the lead/scribe/observer split next time — please confirm real names/roles for the record._

## Meeting record

| | |
| --- | --- |
| **Date** | 2026-09-10 (Thursday) |
| **Time and location** | At 4pm on Zoom |
| **Client participants** | Dr. Yang Yang |
| **Team participants** | Iid Maxamuud, McKenzie Mitchell-Richardson, Tam Nguyen, Ethan Paredez, Jayapradeep Jayaraman Srinivas, Grayson Whittingham. |
| **Recording** | Granted — full transcript available (missing roughly the first 5–6 minutes) |
| **Photos of screens or forms** | Not captured during this meeting! |

_**How it actually went:** this meeting ran out the clock before sections 14 or 15 happened — the transcript ends mid-sentence with "we literally are going to get locked out in one minute." See sections 14 and 15._

---

## Opening

### 1. Get to know your client

**What they said:** _[This is exactly the part the transcript is missing — the first 5–6 minutes weren't recorded. What we can infer from later remarks: Dr. Yang has a personal, hands-on connection to the problem — she built an earlier "Shiny app" herself (an R Shiny prototype) to log her own daughter's reading and comments, and does health research professionally, which came up when discussing email vs. text for data collection ("whenever we try to send something via text message... it's not easy to collect data ... if it's email, it's usually easier"). Ask this directly next time, or send us your notes from the opening minutes if you have any.]_

---

## The business

### 2. Context and domain

**What they said:** Age band is **6 through 11, elementary school kids**. On who's involved: teacher involvement is explicitly "the end goal," but **right now it's just a parent** — or more precisely "any adult... basically it's adult, like kind of help monitor the content," so the near-term scope is adult-monitored, not specifically parent-only, but teachers are out of scope for now. Dr. Yang's own frame of reference is her earlier personal prototype: an R **Shiny app** that logged her daughter's books and her comments about them, then ran an unspecified AI tool over those comments to do sentiment analysis and power selection — she wants BookBuddies to do something similar but "much fancier."

**Terms for the glossary, in their words:**
- **Shiny app** — Dr. Yang's own earlier R Shiny prototype: logged books her daughter read plus her comments, then used an AI tool to sentiment-analyze the comments to inform book selection. The direct inspiration for BookBuddies' recommender.
- **Buddy** — Dr. Yang used this word herself, unprompted, when discussing privacy ("protect the identity of a kid... also the peers, the buddy's identity"), which is independent support for **Buddy Picks** as her own vocabulary rather than a team invention. (The early feature brief's "peer feed" wording never came up in her own words.)
- **COPPA** — note: Dr. Yang did **not** name COPPA in this meeting. A team member asked generally about "laws or regulations," and she answered only in terms of privacy/confidentiality, saying the idea "is not commercialized" so privacy/confidentiality is priority #1. The word "COPPA" first appears in her later written follow-up (9/12) — worth confirming she means the actual statute and not just "privacy laws in general."
- **Baseline reading test** — a proposed onboarding step (see section 9) to establish a child's reading level, as an alternative to a parent typing it in.
- **Achievement page** — a weekly/monthly page shown to kids (and shared with parents) summarizing progress/milestones, explicitly modeled on Duolingo-style engagement.

### 3. Business drivers and objectives

**What they said:** Not asked directly in the recorded portion (may have been covered in the missing opening minutes). What surfaced indirectly: Dr. Yang wants the achievement/gamification layer explicitly "to keep users engaged," praising it as "a very, very good idea in terms of keep users engaged," and agreed enthusiastically with a teammate's Duolingo comparison. No numeric success metric or baseline was stated anywhere in the meeting.

**Candidate objectives (`BO-<slug>`), with baselines where you got them:**
- `BO-personalized-discovery` — books matched to interest/mood/ability, not just age. Baseline unknown, `OI-baseline-metrics` still open.
- `BO-engagement` — new, from this meeting: keep kids engaged with reading via a weekly/monthly achievement page, explicitly compared to Duolingo. Baseline unknown.
- `BO-advanced-reader-support` — via "Stretch My Reader" (see section 9). Baseline unknown.

---

## The process

### 4. How it works today

**What they said:** Not directly answered — this is genuinely thin here. The meeting opens (in the recorded portion) with a reference to **Goodreads** ("If a child wants to— Yes, Goodreads... So, will there be like a search engine?"), suggesting the team was comparing BookBuddies to Goodreads-style search, but no one walked through an actual current process end to end. Recommend asking this explicitly next meeting — it may have been covered in the missing first 5–6 minutes.

**Artifacts they showed us:** The team's own pitch slides and feature brief (already in hand). Dr. Yang referenced, but did not share live, her personal **Shiny app** prototype — the team explicitly asked for the slides and "the link to your demo app, the Shiny app" so they could see it; not yet confirmed whether it was sent.

### 5. What is hard about it

**What they said:** Not asked directly as "what's hard" — but the underlying pain point came through in how enthusiastically Dr. Yang engaged with the age/mood/interest-vs-level framing already in the team's brief, and in how much time was spent on the advanced-reader / reading-level questions (sections 9 and the transcript's later half), which is where her attention clearly went.

**Rules heard (candidate `BR-*`):**
- `BR-24hr-parent-review` — **new, high-value.** "Adult need to review the content and approves it... within 24 hours, adult have to review it, make sure it's good to go. Otherwise, it would temporarily suspend the account." Clarified further: this is **not** per-book approval — it's a periodic acknowledgment: _"The parent have to say, 'I have read whatever my kid is doing on this app in the past 24 hours. I have no objection.'"_ Miss that acknowledgment and the account is temporarily suspended.
- `BR-no-per-book-approval` — explicit and important, and easy to over-build against: _"parents do not need to approve every decision a kid makes about book choices."_ Parents have ultimate authority (can suspend/close the account, can moderate a kid's written comments, must have a report function for abuse/self-harm/harm-to-others) but do **not** gate each individual book pick.
- `BR-teacher-feedback-not-restriction` — teachers may comment ("this isn't appropriate for this age") but must not impose rules on what a student reads: _"I don't think they should impose strict rules, but teachers should be able to share feedback."_
- `BR-independent-per-kid-rating` — one kid's star rating never affects another kid's personal recommendations, but ratings do aggregate at the book level across the whole community (see the **Rating** glossary entry — this is a different thing from kid-vs-kid comparison, which stays excluded).

### 6. What already works

**What they said:** Not asked directly. The closest equivalent is Dr. Yang's evident attachment to her own Shiny-app pattern (logging a book + the kid's own comment about why they liked it) as the seed of the recommender — she wants that preserved and extended, not replaced.

### 7. Volumes and scale

**What they said:** Seed catalog: **30–50 elementary-reading-level books**, spanning multiple genres including "comic books, graphic novels, yada yada yada." Sourcing is not firm — she floated pulling from "Google," possibly meaning the Google Books API, but was visibly unsure ("I don't really— I thought, is that Google has a library of books?"). Reading groups: **2 to about 20** members, explicitly "loosely termed, not strictly defined." No number was given for total expected users, families, or classrooms — `OI-volume-scale` narrowed but not closed.

### 8. Who the users are

**What they said:** Two user types — kids (6–11) and "any adult" who monitors content, though the near-term scope is parents specifically, with teachers explicitly deferred ("that's the end goal... but right now, I think just a parent"). No discussion in this meeting of testing with real child users before handover.

**Can we reach real users? If not, why, and what is the risk:** Not addressed. `RI-child-user-testing` still open — testing with children under 13 typically needs parental/guardian consent; raise this directly next time.

---

## The boundaries

### 9. Constraints and rules

**What they said:** Data privacy and safety is named as the #1 constraint, in two parts: (1) the ability to **delete a record on parent request**, and (2) protecting the identity of a kid **and their peers/buddies**, not just the account holder. Dr. Yang floated — as a question to the team, not a settled requirement — whether it's technically possible for **no system administrator to see any identifying information**, only the user themself: _"I don't know. Is that possible?"_ Treat this as a design question the team needs to answer for her, not yet a confirmed requirement.

On regulation specifically, when asked directly "is there any laws or regulations we should know about," she did **not** cite COPPA (or any named law) — she said only that since the idea "is not commercialized," privacy and confidentiality are priority #1, and proposed the 24-hour parent-review rule (section 5) as her own compliance mechanism ("that might be make this us like comply with the law").

⚠️ **Reading-level visibility conflict — needs reconciliation.** Two things Dr. Yang said or wrote directly contradict each other:
- **In this meeting:** on the weekly/monthly achievement page, she proposed showing the kid (and sharing with the parent) a specific reading-level number — _"we can say, 'Oh, they have reading level 3.2'"_ — then optionally offering harder-book recommendations from there.
- **In her written follow-up two days later (9/12):** reading level is described as staying private, adult-side only, and **never shown to the child**.
- She also said, at the end of this exact discussion: _"I need to keep thinking about the parents' privilege. I wanted to think about it, and I may give you something else after this meeting."_ **Her 9/12 written follow-up is almost certainly that promised follow-up** (sent the Saturday before the team's Sunday requirements meeting) — so it may represent her updated, superseding position. Confirm directly rather than assuming either version wins.

**Constraint candidates (`CO-<slug>`):**
- `CO-data-deletion-on-request` — must support deleting a child's record on parent request.
- `CO-buddy-identity-protection` — must protect the identity of peers/buddies, not just the account holder.
- `CO-admin-blind-identifiers` (open design question, not yet confirmed as required) — can the system be built so admins never see identifying info, only the user?

### 10. External dependencies

**What they said:** Not firmly settled. Dr. Yang mentioned "Google" as a possible book-data source but wasn't sure of the specifics; her own Shiny app used an unnamed AI tool for sentiment analysis, and she doesn't know what kind of AI it was. Both count as open, not confirmed, dependencies.

### 11. Lifetime and who maintains it

**What they said:** Not addressed in this meeting. `OI-post-graduation-ownership` still fully open — high priority for the next meeting.

### 12. Other stakeholders

**What they said:** Not addressed beyond parents/teachers already covered in sections 2 and 8. One name surfaced procedurally, not as a project stakeholder: **Dr. Wei**, who a team member said would need to be asked about adding Dr. Yang to the team's Slack.

---

## The close

### 13. Anything else

**What they said:** Not reached before time ran out.

### 14. The read-back

**What we read back, and what they corrected:** _[This didn't happen — the transcript shows no read-back moment before the meeting was cut off. That's a real miss worth naming plainly to the team: do this first next time, before working through the rest of the agenda, so it can't get crowded out again.]_

### 15. Before you leave the room

- [ ] **Next meeting on the calendar** — ❌ **not done.** The meeting was cut off ("we literally are going to get locked out in one minute") before a specific date/time was set. Dr. Yang explicitly asked "is this a reoccurring meeting?" and the team could only say yes in principle, with cadence "figure that out" left open. `OI-next-meeting-date` raised — close this fast, by email, before it costs two weeks.
- [ ] **Cadence agreed:** loosely discussed as **roughly every two weeks**, to show progress — not confirmed as final.
- [x] **Contact channel and how fast they reply.** **Email**, confirmed by Dr. Yang directly. Slack was discussed as a possible addition (the team offered to add her to a dedicated channel) but is pending her advisor Dr. Wei's approval, and email remains the fallback either way.
- [ ] **Who to contact between meetings** — not named individually.
- [x] **Copies requested** — the team asked for the pitch slides and a link to her Shiny app demo; confirm both were actually sent.
- [ ] **Introductions requested** — none made (Dr. Wei was mentioned, not introduced).
- [ ] **Say what happens next** — not reached; the meeting ended mid-sentence on Dr. Yang's side ("I also wanted—").

---

## After the meeting

### Initial ideas

- **AI-powered recommendation from her own Shiny-app pattern:** Dr. Yang explicitly wants AI recommendation power, modeled on her prior prototype — log a book plus the kid's own comment about it, then run sentiment analysis over the comment to power future picks. This is a direct, repeated ask from the client, not a team assumption — but it sits in tension with the project's own engineering guidance to avoid ML/AI unless it has a clear benefit over simpler rules. Worth an explicit scoping conversation: is a rule-based v1 acceptable as a stepping stone she's already bought into (per her later written follow-up's staged rules-then-ML plan), or does she expect AI in the very first demo?
- **Admin-blind identifiers:** her own idea, floated as a question — could the system be built so no admin/system-administrator role can see identifying information, only the user themselves? Not yet confirmed as a requirement; needs a technical feasibility answer back to her.
- **Kid Gmail-style account, parent-managed:** her working mental model for login is a child's own Gmail-like account that a parent can access and manage (as she does for her own daughter) — open question whether the parent needs their own separate account to do this, and whether parent-first or kid-first account creation is easier. A teammate separately floated a TCU-style "send an invite to add a parent" flow as an alternative worth researching.
- **Tiered achievement page with reading-level disclosure:** show a kid's current numeric reading level on a weekly/monthly achievement page, then optionally offer next-level book recommendations — see the reading-level conflict flagged in section 9 before building this.
- **Community-level book ratings:** independent per-kid ratings that also aggregate into a community-wide rating per book (distinct from any kid-vs-kid comparison, which stays excluded).

### Disagreements and hesitations

- **Reading-level visibility:** what Dr. Yang said live (show a number like "3.2" on the achievement page) conflicts with what she wrote two days later (never show reading level to the child). Likely her thinking evolved — she said mid-meeting she needed to "keep thinking about the parents' privilege" — but this needs a direct confirmation, not an assumption either way.
- **AI scope:** the team's working assumption going in was "no AI recommendations," stated almost as a confirmation question — Dr. Yang corrected this immediately and enthusiastically ("I hope to have a AI-powered kind of recommendation"). A real expectation gap between the team and the client going into this project.
- **Account hierarchy (parent-first vs. kid-first):** Dr. Yang initially wasn't sure whether an adult needs an account at all, moved toward "parent probably makes the account" only after a teammate pointed out the risk of a kid with no linked parent, and never fully committed. Watch for this resurfacing.
- **Book/data sourcing:** "Google" as a source was said with visible uncertainty ("I don't really— I thought, is that Google...") — don't treat this as a confirmed integration decision.

### Open questions

- `OI-baseline-metrics` — what number(s) define success, and what's the baseline today? (still fully open)
- `OI-volume-scale` — total expected users/families/classrooms at launch and at scale? (catalog size and group size are now known; overall traffic is not)
- `OI-real-user-testing` — can the team reach real child users for testing, and what consent process applies?
- `OI-post-graduation-ownership` — who maintains/hosts BookBuddies after the team graduates, and what's the hosting budget?
- `OI-badge-taxonomy` — final badge list and award criteria (still "forming" per her written follow-up)
- `OI-reading-level-source-and-visibility` — is reading level set by an onboarding baseline test, an adult-entered field, or both — **and** is the resulting level ever shown to the child (achievement page) or never (written follow-up)? This is the single highest-priority item to close given the direct conflict.
- `OI-ai-recommender-scope` — does the MVP need AI-powered recommendations from day one (her stated hope), or is a rule-based v1 acceptable as an explicit first stage of her own staged rules→ML plan?
- `OI-admin-blind-identifiers` — is it technically feasible/intended that no admin role can see identifying information?
- `OI-account-hierarchy` — must a parent account exist before a child account can be created, and is a later "invite a parent" flow acceptable instead?
- `OI-next-meeting-date` — no firm next meeting was set; close this immediately by email rather than letting it drift.

_All of the above except `OI-next-meeting-date` (a scheduling item, not a requirements question) are filed in [OPEN-ISSUES.md](OPEN-ISSUES.md) under their numeric IDs (`OI-1` through `OI-14`); each row there cross-references the slug used here._
