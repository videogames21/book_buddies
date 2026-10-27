# Team Decisions

This file is for when the team makes important decisions that need to be logged.

_Backfilled 2026-10-25 from team decisions that other documents already record with a date. Each row names where the decision and its reasoning live; this file is the index, not the reasoning. Decisions marked "client to confirm" are the team's position until the client answers._

| Date | Decision | Status | Recorded in |
|---|---|---|---|
| 2026-10-02 | The top three quality goals, in order: children's data stays private; safety flags reach a parent and the admin immediately; someone other than the team can run and change the system. | Client to confirm | architectural-design.md §1.2 |
| 2026-10-02 | A child signs in with a username the parent chooses and a password the system generates and shows the parent once; no child email. | Accepted (username added 2026-10-06) | architectural-design.md §3; `UC-PAR-create-kid-account`; `FR-ACCT-credentials` |
| 2026-10-05 | One Next.js application and one MongoDB Atlas database, deployed as one Vercel project (`KD-deployment-shape`). | Accepted | architectural-design.md §9.2 |
| 2026-10-05 | TypeScript, Next.js, MongoDB Atlas and Vercel (`KD-tech-stack`). | Accepted | architectural-design.md §9.2; `CO-technology-stack` |
| 2026-10-05 | Auth.js with revocable database sessions, not JWT sessions or a hosted auth service (`KD-auth-sessions`). | Accepted | architectural-design.md §9.2 |
| 2026-10-07 | A child rates a finished book on four options: Loved it / Liked it / It was okay / Not for me. | Accepted (`OI-17` resolved) | project-glossary.md, "Rating"; `FR-RATE-rating` |
| 2026-10-15 | Flagged-content review is the admin's only route to a child's identifying details, with every view audited (`KD-admin-flag-review`). | Team confirmed 2026-10-26; client to confirm (`OI-15`) | architectural-design.md §9.2; `BR-admin-limited-view`; `FR-ADM-flag-review` |
| 2026-10-15 | When the admin blocks a book, a flagged reflection is copied to the dangerous content list before the block deletes ratings and reflections. | Client to confirm (`OI-24`) | architectural-design.md §11 |
| 2026-10-15 | A Sub Parent has the same access to linked children as the Main Parent but cannot create or delete accounts. | Team confirmed 2026-10-26 that Sub Parents cannot create child accounts; client to confirm (`OI-25`) | architectural-design.md §8.1; `UC-PAR-create-kid-account` |
| 2026-10-15 | The parent can reset a child's password and sees the new one once; the child cannot change it. | Client to confirm (`OI-26`) | architectural-design.md §8.1 |
| 2026-10-15 | Only the admin may view the dangerous content list. | Accepted; retention period open (`OI-27`) | architectural-design.md §8.1 |
| 2026-10-15 | Child-facing screens show the child's nickname and avatar only, never the real name. | Accepted; nickname field added to `UC-PAR-create-kid-account` (v0.13) | architectural-design.md §8.2.11; `BR-kid-anonymous-profile` |
| 2026-10-26 | Groups, reading groups and peer sharing are removed from the product until further notice, not deferred to a later phase. | Accepted; returns only if the client reopens social features | business-rules.md §2.3; vision-and-scope.md §4.3; project-glossary.md, Retired Terms |
| 2026-10-26 | The system admin has the authority to suspend and reinstate accounts. In practice the client is the system admin. | Accepted | `UC-ADM-suspend-account`, `UC-ADM-reinstate-account`, `UC-ADM-flag-review`; SRS §2.2 |
| 2026-10-26 | Stage 1 of the recommender filters by the child's age and grade. | Accepted | `OI-2` (Resolved, mechanics); `BR-reading-level-proxy`; `FR-REC-rules` |
| 2026-10-26 | The admin may see the Main Parent's and Sub Parents' names, usernames and emails, never a password; this is what "parent credentials" means. | Accepted | `BR-admin-limited-view`; `SEC-pii-boundary`; use cases' field tables |
| 2026-10-26 | Whether content moderation may use an outside service waits for the client's reply. | Waiting on client (`OI-19`, briefing question 6) | architectural-design.md §8.1 |
