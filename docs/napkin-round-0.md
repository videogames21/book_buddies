# The Napkin — Book Buddies

*Twenty-minute rough judgment, done before requirements work starts.*

---

## 1. Shape

**A CRUD application with a recommendation layer and a permissions system bolted on top — not a data pipeline, not real-time, not ML-native.**

* **Boxes:**  
  1. **Child-facing app** — quiz, shelf, recommend, buddy feed (mostly reads and writes against a books/users/shelves schema)  
  2. **Parent-facing app** — review dashboard, content flagging, 24-hour compliance check  
  3. **Recommendation engine** — starts as rules/filters over tagged metadata (genre, mood, reading level), *not* ML on day one  
  4. **Identity & permissions layer** — parent↔child account linking, anonymous child profiles, group membership (2–20 kids)  
  5. **Seed content store** — 30–50 books sourced from Google Books or similar, tagged for genre/level/mood

This is closer to a moderated social app for kids (think a scoped-down Goodreads + parental controls) than it is a recommender-systems project. The AI-powered recommendation mentioned in the deck is a *stretch feature*, not the MVP's hard part.

---

## 2. The hard part

**Modeling and enforcing the parent/child/teacher trust boundary correctly — not the book recommendations.**

Anyone can build a quiz that filters a book list by genre and mood in a weekend. What's genuinely hard here:

* Kids are **anonymous inside the product** (nicknames, avatars) but **identifiable to a parent** and reportable to admins for safety events — that's two different identity models coexisting in one schema, and getting the boundary wrong is a COPPA problem, not just a bug.  
* The **24-hour parental review window** is a stateful compliance workflow (suspend-on-non-compliance), not a UI checkbox — it needs a scheduler, a suspension state on the account, and a resume path.  
* "System admin should not see any PII" is an architectural constraint on *every* table and every debugging/support workflow, decided on day one, not retrofitted later.  
* Groups are user-initiated (kids form them) but oversight is adult-owned (parents/teachers monitor) — the authorization model has to support a minor creating a social structure that an adult can see into and moderate, without the adult needing to approve every action.

If this project fails, it fails here — in the permission model quietly leaking something it shouldn't — not in the recommendation quiz being mediocre.

---

## 3. Bottleneck

**It breaks first under a five-person team building the permissions/safety layer, not under user load.**

* Traffic-wise, this is a small-cohort app (classrooms, friend groups) — no meaningful scale problem for a long time.  
* The real bottleneck is **team bandwidth against COPPA-adjacent compliance work**: age-appropriate content review, flagging/reporting pipelines, abuse/self-harm signal detection, and the review-window suspension logic all have to be right *before* any real child's data touches the system, and none of that is glamorous or fast to build.  
* Secondary bottleneck: **content sourcing and tagging**. Even 30–50 books need consistent genre/mood/reading-level metadata for the quiz to feel personalized — if that tagging is inconsistent, the "AI-powered" recommendation feels random regardless of how the matching logic is written.  
* Tertiary: scope creep from the deck's "AI used to analyze comments and ratings" language — a five-person team can burn its whole timeline chasing that instead of shipping the loop.

---

## 4. Stack

**Boring, boxed default: a standard server-rendered or lightly-SPA web app, a relational database, and off-the-shelf auth — nothing novel.**

* **Backend + DB:** A conventional framework (e.g., Node/Express or Django) over **PostgreSQL**. Relational is the right call because the domain is inherently relational — users, parent-child links, shelves, ratings, groups, group membership — and you need real foreign-key integrity for a system where "who can see whose data" is the whole point.  
* **Frontend:** A standard SPA framework (React) for the kid-facing app, since it needs to feel playful and responsive (large tap targets, picture-based quiz, animations) — but no need for anything beyond that; this is not a real-time or offline-first product.  
* **Auth:** Email-based parent accounts with a managed auth provider (e.g., Auth0/Clerk/Firebase Auth) rather than hand-rolled auth — COPPA-adjacent products should not be rolling their own session/password security from scratch. Child profiles are *not* independently authenticated; they're scoped sub-accounts under the parent.  
* **Recommendation logic:** Plain filtering/scoring queries against tagged metadata (SQL WHERE/ORDER BY on genre, mood, level, peer-rating aggregates). No ML, no vector DB — the seed library is 30–50 books; a similarity index is solving a problem that doesn't exist yet.  
* **Hosting:** A single deployable web app + managed Postgres (e.g., Render/Railway/Fly.io) — no microservices. One team, one small domain, one service.

Reasoning throughout: nothing about this product needs a distributed system, a message queue, or a specialized data store. The complexity budget should go entirely into the permissions/safety model, not the infrastructure.

---

## 5. Kill risks

Each stated as a mechanism, not a category:

1. **A child's identifiable info (real name, school, precise location) gets exposed to another user, a group member outside the intended circle, or a system admin through a support/debug tool** — because the anonymous-profile boundary wasn't enforced at the data layer (e.g., PII sits in the same table/API response as the public profile instead of being segregated with row-level access control).  
2. **The 24-hour parental review window fails to actually suspend non-compliant accounts** — because the compliance check is implemented as a UI reminder instead of a server-enforced state machine, so a parent who never opens the app leaves a child account fully active indefinitely.  
3. **A flagged or reported piece of content (comment, book recommendation, abuse/self-harm signal) doesn't reach a parent or admin in time** — because reporting is built as a passive log a parent has to go check, rather than a push notification/alert path, turning a safety feature into a paper trail nobody reads until after something's gone wrong.

(A fourth, lower-severity one worth naming: the AI-recommendation feature scope-creeps the five-person team past the Sunday requirements meeting without a locked MVP boundary, because "AI-powered" is in the original deck language and nobody explicitly deferred it.)

---

## 6. Verdict

**Feasible for a five-person team in one term — but only if the MVP is scoped to the core loop and the safety/permission model, with the AI recommendation engine and teacher role explicitly deferred.**

**What to cut first if time runs short:**

1. "Stretch My Reader" level-up prompts (nice-to-have engagement layer, not core loop)  
2. AI-driven comment/rating analysis for recommendations — ship the rules-based filter/quiz instead  
3. Teacher role and class-based group management (deck already scopes current phase to parents only)  
4. Achievement pages / Duolingo-style progress tracking (retention feature, not proof-of-loop)

**What must not be cut:** anonymous child profiles, parent-child linking, the 24-hour review/suspension workflow, and PII segregation from admin visibility — these are the architectural spine, and the whole point of the verdict being "yes" depends on tackling them early rather than bolting them on after the fun parts are built.
