# Client Interview — Meeting 2

**Project:** BookBuddies
**Team:** Team 05
**Client:** Dr. Yang Yang
**Meeting:** Meeting 2, 2026-09-24 (the other project documents cite it as "Meeting 2 notes")

> Source: team meeting notes from the Sep 24 meeting (`Client_Meeting-Sep24.md`, the Granola-generated notes). We do not have the full transcript, so sections the notes do not cover are marked **Not captured in notes**. Content is paraphrased from the notes unless marked as quoted.

---

## Meeting record

| | |
| --- | --- |
| **Date** | 2026-09-24 (Thursday). The notes do not state the year; 2026 is taken from the other project documents. |
| **Time and location** | Not captured in notes |
| **Client participants** | Dr. Yang Yang |
| **Team participants** | Not captured in notes |
| **Recording** | Not available to us. Notes only. The Granola meeting link in the notes gives access to the transcript chat. |
| **Photos of screens or forms** | None recorded. |

---

## Opening

### 1. Get to know your client

**What they said:**
Not captured in notes.

---

## The business

### 2. Context and domain

**What they said:**
- Scope was simplified in this meeting. The teacher role was removed entirely. Final user roles are **kids and parents only**. Rationale: simpler, cleaner, and easier to build.
- Peer-to-peer social sharing was dropped as too complicated for now.
- Direct and bias content controls were confirmed as removed from the MVP.
- Platform: **web app first.** Choosing web avoids Apple's $100/month developer fee and the Mac-only testing requirement. A mobile app comes in a later phase, and the codebase should be largely transferable.
- Recommendation approach: **rule-based first.** ML and AI come in a later phase.

**Terms for the glossary, in their words:**
- **Book notes:** post-reading reflections by kids, not in-margin annotations. Prompts: why they liked or disliked the book, whether they would recommend it, and to whom.
- **Shelf categories (Goodreads-style):** want to read, reading, recommended to friends, don't want to read.
- **Onboarding quiz:** button-based choices for favorite books and genres or subjects. Not free text.
- **Stretch My Reader:** not described in this set of notes. It was in the earlier notes as an opt-in level-up prompt on achievement pages. Confirm whether it is still in the MVP.
- **Gamification:** badges and achievement lists. Included conceptually, with parent approval of logged reading hours to prevent abuse.

### 3. Business drivers and objectives

**What they said:**
- Recommendations should be driven by the kid's own ratings and reflections, not only by age.
- Parents want visibility into what their child reads and writes, and the ability to steer what is on the shelf.
- Cost must stay low. Database cost is near zero initially. AI or API cost is under $200/month for a small user base, if a lightweight model is used.
- No baselines or metrics were given.

**Candidate objectives (`BO-<slug>`), with baselines where you got them:**
- `BO-kids-love-the-books`: recommendations lead to books kids enjoy, measured by ratings and reflections. Baseline: none given.
- `BO-parent-visibility`: parents can view their child's shelf and notes, and act on flagged content. Baseline: none given.
- `BO-mvp-december`: a working recommendation flow with basic parent and kid profiles, delivered for a December milestone. Baseline: none given.

---

## The process

### 4. How it works today

**What they said:**
Not captured in notes.

**Artifacts they showed us:**
- None recorded at the meeting.
- Next step recorded: the team creates an app flowchart and step-by-step flow covering account creation and the full recommender flow (quiz to list to shelf). This was an action for the team, not a client artifact.

### 5. What is hard about it

**What they said:**
- Recommendations must work without a reading-level test. Some schools do not test until 2nd or 3rd grade, and the app will not run its own test. Kids are asked to find their level externally if they need to.
- Rating weight should stay low, especially early on, because the user base is small.
- Collaborative filtering (Netflix or Facebook style) is worth exploring once the user base can support it.

**Rules heard (candidate `BR-*`):**
- `BR-parent-creates-kids`: parents create and manage kid accounts. Kids cannot self-register. One primary parent account, with an optional secondary parent. Multiple kids per parent account.
- `BR-parent-notes-visibility`: notes are visible to parents by default. There are no private notes for this age group. The parent confirmed they would reserve the right to read a child's notes.
- `BR-parent-shelf-control`: parents can remove books from a kid's shelf. The kid gets an in-app pop-up when this happens.
- `BR-parent-recommend`: parents can recommend specific books. These appear in the kid's recommendation list, not on the shelf. The kid can accept or veto them.
- `BR-no-kid-approval`: no parent approval step for kid book selections. Purchasing is treated as implicit approval.
- `BR-flag-violence-selfharm`: violent or self-harm content in notes is flagged immediately to the system admin and parents. Kids are told upfront that certain content will be reported to parents and authorities.
- `BR-coppa-consent`: COPPA compliance is built in from the start. Parental consent is required at account creation. Note flagging must be disclosed upfront.
- `BR-notifications-inapp`: in-app notifications only for the web app. Kids get a pop-up when a parent removes a book. Parents get an alert when a kid's note is flagged. No SMS or push for the web app. Mobile push is deferred.
- `BR-admin-sees-minimal`: the system admin sees parent credentials and the number of child accounts, not child details. **Conflicts with the flagging rule above. See Open questions.**
- `BR-kid-real-name`: the platform stores each kid's real name, for law enforcement reporting. **Conflicts with the anonymous-profile requirement. See Open questions.**

### 6. What already works

**What they said:**
Not captured in notes. The only existing work referenced is the original concept (PowerPoint) and the Shiny app demo from the earlier notes. We have not seen either yet.

### 7. Volumes and scale

**What they said:**
- The recommendation approach is designed for a small user base at first.
- Database cost scales with data volume and query speed.
- AI or API cost is under $200/month for a small user base.
- Book seed library: earlier notes said 30–50 elementary-level books. This set does not restate the number.
- No user counts or traffic targets were given.

### 8. Who the users are

**What they said:**
- **Kids:** the notes give the age range for book notes as **5–12**. The earlier notes said the app targets **6–11**. The two need to be reconciled.
- **Parents:** create and manage accounts, review shelves and notes, and can recommend books. They are the only adult users.
- **Teachers:** removed from scope.
- **System admin:** operates the platform. Sees limited information (see `BR-admin-sees-minimal`).

**Can we reach real users? If not, why, and what is the risk:**
Not captured in notes. Testing with children will need a consent and recruitment route, which is tied to the COPPA requirement. This is a gap to raise.

---

## The boundaries

### 9. Constraints and rules

**What they said:**
- COPPA compliance from the start: parental consent at account creation, and upfront disclosure on note flagging. The client will send the COPPA link to the team.
- Kid data stored: real name (for law enforcement reporting), age, grade, and reading level (optional).
- Parents hold oversight, including reading notes and shelf control. Kids cannot self-register.
- Gamified reading hours need parent approval to prevent abuse.
- The system is not an e-reader. Earlier notes said the app is recommendation, tracking, and sharing only.

### 10. External dependencies

**What they said:**
- **Book dataset:** a pre-tagged children's dataset from Kaggle or GitHub, rather than manual entry from Open Library. Needed fields: title, cover image, description, genre, age range, and tags. The team will source it and share it with the client for review.
- **Open Library:** not directly integrated. External links (for example, Amazon) may come later as a monetization feature.
- **AI or API:** lightweight model, under $200/month. Only needed when the algorithm moves beyond rules.
- **Google Books:** earlier notes named it as a source for the seed library. Not mentioned in this set.

### 11. Lifetime and who maintains it

**What they said:**
Not captured in notes.

### 12. Other stakeholders

**What they said:**
- **Parents:** primary adult users, with a primary account and an optional second parent.
- **Dr. Wei:** named in the earlier notes for Slack access. Not mentioned in this set.
- **Authorities and law enforcement:** receive reports of flagged violent or self-harm content, per the disclosure to kids.

---

## The close

### 13. Anything else

**What they said:**
- The team owns three next steps:
  1. Create the app flowchart and step-by-step flow, covering account creation and the full recommender flow (quiz to list to shelf), so the team can build use cases.
  2. Source a children's book dataset from Kaggle or GitHub, with title, description, genre, age range, and tags, and share it with the client for review.
- The client owns one next step:
  1. Send the COPPA rules link to the team (Children's Online Privacy Protection Rules), so compliance can be built in from the start.
- Transcript link in the notes: https://notes.granola.ai/t/a7125703-2bed-430b-a040-e7582c2fb1dc

### 14. The read-back

**What we read back, and what they corrected:**
Not captured in notes.

### 15. Before you leave the room

- [ ] Next meeting on the calendar: **Not captured in notes.**
- [ ] Cadence agreed: **Not captured in notes.** The earlier notes said biweekly check-ins were proposed.
- [ ] Contact channel and how fast they reply: **Not captured in notes.** The earlier notes said Slack, with email as the fallback.
- [ ] Who to contact between meetings: **Not captured in notes.**
- [ ] Copies requested of every artifact shown: **Not captured in notes.**
- [ ] Introductions requested: **Not captured in notes.**
- [x] Said what happens next: **Yes.** The team builds the flowchart and sources the dataset. The client sends the COPPA link.

---

## After the meeting

### Initial ideas

Ideas from the meeting that the team should shape into requirements:
- Rule-based recommendations first, using the onboarding quiz, age and grade, post-reading ratings and reflections, and parent recommendations. ML comes later.
- Reading level is optional. If it is not given, age and grade act as the proxy.
- The recommendation quiz runs for each new request, as the earlier notes described.
- Kids write reflections, with prompts about why they liked or disliked a book, whether they would recommend it, and to whom.
- Shelf categories follow Goodreads: want to read, reading, recommended to friends, don't want to read.

### Disagreements and hesitations

- **Real name vs. anonymous profiles:** the client wants real names stored for law enforcement reporting. The earlier notes set anonymous nicknames and avatars, with no real identifiers, for kids. This is a direct conflict. It needs a decision before design starts.
- **Admin visibility vs. flagged-content routing:** the client wants the admin to see only parent credentials and account counts. The same notes route flagged violent or self-harm content to the admin. The team needs to define what the admin can see when a flag fires.
- **Age range:** the earlier notes say 6–11. This set says 5–12 for book notes. Not a disagreement yet, but it affects the seed library and dataset.
- No other disagreements were recorded in the notes.

### Open questions

1. **Real name storage:** is a real name stored for every kid, or only when a flag is raised? Storing it for everyone conflicts with the anonymous-profile requirement and with the principle of minimal child data. Recommend storing it only at the point of a report, or confirming with counsel.
2. **Admin visibility:** what can the admin see when a note is flagged? Recommend that the admin sees only the flag and the account reference, with the parent handling the child details.
3. **COPPA:** the client will send the link. Confirm the consent flow, and whether a verifiable parental consent method is required beyond an email click.
4. **Age range:** confirm the target age range (5–12 or 6–11). This affects the seed library and dataset.
5. **Stretch My Reader:** it is not in this set of notes. Confirm whether it stays in the MVP.
6. **Gamification:** how are reading hours logged, and what does parent approval involve? Confirm it is in the December MVP or a later phase.
7. **Dataset:** confirm the Kaggle or GitHub dataset includes the fields needed (title, cover image, description, genre, age range, tags). Also check the license for commercial use.
8. **Real users:** how will we reach real children and parents for testing, and what consent process applies?
9. **Monetization:** external links such as Amazon are a later feature. Confirm this does not create ad or data-sharing concerns for children.
10. **Reading level:** the earlier notes said reading level comes from an online test. This set says there is no in-app test, and kids find their level externally if needed. Confirm which is final.
