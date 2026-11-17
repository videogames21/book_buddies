# Review child data: handoff

Task: [issue #63](https://github.com/videogames21/book_buddies/issues/63), `UC-PAR-review-child-data`.
Source baseline: `d8beec62e9bd8b631ae2b522726397c44c24f1b5`.
Design: [PAR design](../../design/par.md#reviewexport-sequence-proposed).
Status: proposed design only. No implementation or teammate approval.

## What is ready

The PAR design covers parent authorization, password confirmation, all eleven data categories, component-owned reads, empty and failure states, a proposed JSON download, audit-before-release, and acceptance scenarios for every UC extension. Traceability says proposed, with no code or test-completion claim.

The continued draft fixes the audit target to the reviewed child, includes REC's proposed onboarding save time, and uses OI-41/42 to avoid the OI-37–40 proposed by #96. Those numbers must be rechecked after its merge.

## Review of PR #96

Reviewed head `02fd52f95d0549275a78f8b8491ce95c7b3ac5b1`. Still open when last checked. Neither finding below was posted: GitHub rejected both a formal review and a conversation comment with HTTP 403. The browser is signed out.

1. **High: profile save can survive completed consent revocation.** The consent assumption in `design/rec.md` deliberately does not coordinate with OI-36 and relies on revocation deleting a racing save. Counterexample: Save checks confirmed consent; revocation marks consent revoked and deletes profiles; Save then inserts. The new record survives. Coordinate the insert with revocation through a shared consent-record write inside the transaction, or specify an equivalent ordering guarantee. Test that exact interleaving by pausing Save after its first check, completing revocation, and resuming Save.

2. **Medium: re-onboarding incorrectly assumes exclusions were removed.** The picker decision says reading-data deletion removes per-child exclusions. `UC-PAR-delete-child-data` POST-2 and `BR-parent-report-book` explicitly retain them. A reported active book can be offered and saved again after re-onboarding. Pass child/family context into picker and save-time validation, apply retained exclusions in both, and test a directly submitted excluded book as well as picker visibility.

Integration correction: the claim that `savedAt` has only the aggregate-statistics reader must permit authenticated parent review/export too. It is stored child data.

These are design counterexamples, not executed REC tests; no REC implementation exists.

## Verification in this continuation

- Offline dependency install succeeded using the pinned lockfile; no dependencies changed.
- Unit tests: **31 passed across 6 files**.
- TypeScript, lint, formatting, production build and `git diff --check`: **passed**.
- Full `npm test`: blocked when MongoDB Memory Server tried to listen; the sandbox returned `EPERM`. No integration pass is claimed.
- Fresh demo startup on port 3300: blocked by the same listen restriction.
- Existing earlier demo on localhost:3001 opened the authenticated child-creation form on port 3000. Its desktop screenshot was visually inspected: the heading, notice and visible form controls render normally. This was the earlier child-creation build, not this feature.
- No review/export UI exists; no feature end-to-end or mobile pass is claimed. Earlier results of 73 tests belong to the previous session.

## Remaining gates

1. Following the team's overlap instruction, wait for #96 to merge, then rebase and combine its PAR/REC contracts before opening this design PR. No PR was opened in this continuation.
2. Resolve OI-41 with the parent-onboarding owner: parent credentials and a shared sign-in/reauthentication attempt policy.
3. Resolve OI-27: flagged-note export and Dangerous Content List access.
4. Decide OI-42: export format and requester confirmation, including whether a second password prompt is acceptable.
5. Obtain the required teammate design approvals and merge before implementation.
6. Move issue #63 to In progress when project-board access is available. It was not moved here.

Once the design is merged, implementation must execute the acceptance cases in `par.md`, including opening and parsing the downloaded file, cross-family direct calls, failed late reads, audit failures, revocation/session changes and manual sibling switching. Fixture sessions must not stand in for a real parent-password check.
