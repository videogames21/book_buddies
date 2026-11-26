# Coarse estimates: planning-poker sheet

**Status: ranges recorded below, not yet posted to the issues.** Every use case has the same ranges, recorded 2026-11-25: 8–12 h each, 200–300 h for all 25, of which the 23 in `v1.0.0` are 184–276 h.

## How to run a round

1. Pick one use case and read it.
2. Each member writes an hour range for each of the four parts without showing it.
3. Everyone reveals at once.
4. The highest and lowest explain why.
5. The team agrees a range. Use hours, not story points.
6. Post it as a comment on the use case's issue:

```text
Coarse estimate (planning poker, YYYY-MM-DD): clarify a–b h, design a–b h, build and review a–b h, verify a–b h
```

## Use cases not yet designed (25)

An open design pull request does not count as designed until it merges.

| Use case                                         | Issue | Release | Clarify (h) | Design (h) | Build and review (h) | Verify (h) | Posted |
|--------------------------------------------------|-------|---------|-------------|------------|----------------------|------------|--------|
| `UC-REC-parent-review` (design open, #118)       | #72   | v0.2.0  | 0–1         | 3–4        | 5–6                  | 0–1        | ☐      |
| `UC-PAR-create-sub-parent-account`               | #59   | v1.0.0  | 0–1         | 3–4        | 5–6                  | 0–1        | ☐      |
| `UC-PAR-suggest-book` (design open, #120)        | #60   | v1.0.0  | 0–1         | 3–4        | 5–6                  | 0–1        | ☐      |
| `UC-PAR-view-growth-report`                      | #61   | v1.0.0  | 0–1         | 3–4        | 5–6                  | 0–1        | ☐      |
| `UC-PAR-delete-child-data`                       | #64   | v1.0.0  | 0–1         | 3–4        | 5–6                  | 0–1        | ☐      |
| `UC-PAR-revoke-consent`                          | #65   | v1.0.0  | 0–1         | 3–4        | 5–6                  | 0–1        | ☐      |
| `UC-PAR-approve-shelf-request`                   | #68   | v1.0.0  | 0–1         | 3–4        | 5–6                  | 0–1        | ☐      |
| `UC-REC-kid-review`                              | #73   | v1.0.0  | 0–1         | 3–4        | 5–6                  | 0–1        | ☐      |
| `UC-SHLF-kid-dashboard`                          | #76   | v1.0.0  | 0–1         | 3–4        | 5–6                  | 0–1        | ☐      |
| `UC-SHLF-kid-move-book`                          | #77   | v1.0.0  | 0–1         | 3–4        | 5–6                  | 0–1        | ☐      |
| `UC-SHLF-kid-remove-book`                        | #78   | v1.0.0  | 0–1         | 3–4        | 5–6                  | 0–1        | ☐      |
| `UC-SHLF-kid-rate-book`                          | #79   | v1.0.0  | 0–1         | 3–4        | 5–6                  | 0–1        | ☐      |
| `UC-SHLF-par-finish-book`                        | #80   | v1.0.0  | 0–1         | 3–4        | 5–6                  | 0–1        | ☐      |
| `UC-SHLF-parent-remove-book` (design open, #121) | #81   | v1.0.0  | 0–1         | 3–4        | 5–6                  | 0–1        | ☐      |
| `UC-SHLF-manual-search`                          | #82   | v1.0.0  | 0–1         | 3–4        | 5–6                  | 0–1        | ☐      |
| `UC-ADM-edit-content`                            | #84   | v1.0.0  | 0–1         | 3–4        | 5–6                  | 0–1        | ☐      |
| `UC-ADM-unblock-content`                         | #86   | v1.0.0  | 0–1         | 3–4        | 5–6                  | 0–1        | ☐      |
| `UC-ADM-suspend-account`                         | #87   | v1.0.0  | 0–1         | 3–4        | 5–6                  | 0–1        | ☐      |
| `UC-ADM-suspend-parent-account`                  | #88   | v1.0.0  | 0–1         | 3–4        | 5–6                  | 0–1        | ☐      |
| `UC-ADM-reinstate-account`                       | #89   | v1.0.0  | 0–1         | 3–4        | 5–6                  | 0–1        | ☐      |
| `UC-ADM-view-recommender-stats`                  | #90   | v1.0.0  | 0–1         | 3–4        | 5–6                  | 0–1        | ☐      |
| `UC-ADM-view-usage-stats`                        | #91   | v1.0.0  | 0–1         | 3–4        | 5–6                  | 0–1        | ☐      |
| `UC-ADM-view-audit-log`                          | #92   | v1.0.0  | 0–1         | 3–4        | 5–6                  | 0–1        | ☐      |
| `UC-ADM-flag-review`                             | #93   | v1.0.0  | 0–1         | 3–4        | 5–6                  | 0–1        | ☐      |
| `UC-REC-recommend-quiz-ai`                       | #71   | Spring  | 0–1         | 3–4        | 5–6                  | 0–1        | ☐      |

Issue #94 (`UC-SHLF-view-badges`) is left out: the use case has not been written.
