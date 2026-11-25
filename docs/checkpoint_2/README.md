# Checkpoint 2 status

Checked 2026-11-25 against `main` at `d216e89`.

| # | Item                                            | State                                                         | Where                                                  | Still needed                                                |
|---|-------------------------------------------------|---------------------------------------------------------------|--------------------------------------------------------|-------------------------------------------------------------|
| 1 | Slice runs from tag `v0.1.0` with release notes | Notes drafted; **no tag or release yet**                      | [release notes](release-notes-v0.1.0.md)               | Fix Windows check, merge, tag locally, verify, publish      |
| 2 | Settings file with Read deny rules              | Written, **not merged**                                       | [`.claude/settings.json`](../../.claude/settings.json) | Pull request; confirm a `.env` read is refused              |
| 3 | Charter                                         | Both must-not rules already in [`CLAUDE.md`](../../CLAUDE.md) | below                                                  | Only if the team runs more than one agent at a time         |
| 4 | Calibration table                               | Skeleton; **no estimates found, no hours**                    | [calibration](calibration.md)                          | Owners fill from weekly activity reports                    |
| 5 | Coarse estimates on issues                      | Ranges recorded, **not on the issues**                        | [estimate sheet](coarse-estimates.md)                  | Confirm the planning-poker round, then comment on 25 issues |
| 6 | Release plan                                    | Values proposed, **not merged**                               | [traceability §3](../traceability.md)                  | Team agrees them in the pull request                        |
| 7 | Impact list                                     | No client change found                                        | [impact list](impact-list.md)                          | A member confirms                                           |

## 1. Slice checks

Run locally on Windows at `d216e89`, before the documentation and settings changes.

| Check                                                | Result                                                                                           |
|------------------------------------------------------|--------------------------------------------------------------------------------------------------|
| `npm run lint`, `npm run typecheck`, `npm run build` | Pass                                                                                             |
| `npm test`                                           | Pass: 493 tests in 37 files                                                                      |
| `npm run test:e2e`                                   | 42 pass, 4 fail. All 4 are in `onboarding.spec.ts`; Mailpit was not running (Docker was stopped) |
| `npm run test:demo`                                  | Smoke check passes; the shutdown assertion fails (exit code `null`, expected 0)                  |
| `npm run format:check`                               | Fails locally on line endings (`core.autocrlf=true`); passes with `--end-of-line auto`           |

CI on pull requests #111 and #123 passed every job.

**Windows shutdown bug, to be fixed before the tag.** The `npm run test:demo` failure was reproduced on Windows at `cc110a3`. `scripts/check-demo.mjs` stops the demo with a signal, which on Windows force-kills it, so its cleanup never runs, there is no exit code, and a temporary database folder is left behind. The check passes in CI on Linux. The fix goes in its own pull request and must be merged before `v0.1.0` is tagged.

The slice's matrix row reads In progress, partly verified: no one browser test runs from adding a child to onboarding complete. Be ready to say that, and that parent notes are not screened because the word list is empty.

## Tag and release

Start only after the checkpoint pull request (two non-owner approvals) and the Windows shutdown fix are both merged. Tag locally and do not push the tag yet:

```sh
git switch main
git pull
git tag -a v0.1.0 -m "Checkpoint 2: proving slice"
git switch --detach v0.1.0
npm ci
```

Verify the tagged commit on the Windows demo computer, with Docker and Mailpit running:

1. `npm run build`, then `npm run test:e2e`. Every test passes.
2. `npm run test:demo`. Both the smoke check and the shutdown check pass.
3. `npm run demo`. Sign in as the parent, add a child, and save the reading profile (interests and favorite books). Press Ctrl+C and confirm the demo stops.

Only if all three pass, publish:

```sh
git push origin v0.1.0
gh release create v0.1.0 --title "BookBuddies v0.1.0" --notes-file docs/checkpoint_2/release-notes-v0.1.0.md
```

If any step fails, delete the local tag (`git tag -d v0.1.0`), merge the fix, and start again.

Check the merged list before tagging. Anything else merged into `main` first (for example #124 or #125) ships in the tag, so update the notes and release values to match.

## 3. Parallel-agent lines

If the team runs more than one agent at a time, add these to the Workflow section of `CLAUDE.md`, and add `.claude/worktrees/` to `.gitignore`:

```markdown
- Parallel agents: one agent per sub-issue, each in its own worktree and branch, ending in its own pull request.
- Start parallel agents only after the shared code their work depends on is merged.
- Never split one use case's layers across agents.
- Run no more agents than the number of pull requests you will review that day.
```

## 6. Release plan: check these

- `UC-PAR-view-growth-report` moved from "Out, pending client" to `v1.0.0`: the SRS and vision-and-scope now put it in the MVP.
- Added the missing rows `UC-SHLF-kid-dashboard` and `UC-SHLF-par-finish-book`, and rows for every `FR-*`.
- 23 use cases sit in `v1.0.0`. Their coarse estimates total 184–276 h; compare that with the hours available. Moving an MVP feature to `Spring` also needs vision-and-scope and the client.
- `FR-PAR-content-removal` has no use case for removing flagged content.
