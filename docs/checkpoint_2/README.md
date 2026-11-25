# Checkpoint 2 status

Checked 2026-11-25 against `main` at `d216e89`.

| # | Item | State | Where | Still needed |
|---|---|---|---|---|
| 1 | Slice runs from tag `v0.1.0` with release notes | Notes drafted; **no tag or release yet** | [release notes](release-notes-v0.1.0.md) | Merge, tag, publish, demo from the tag |
| 2 | Settings file with Read deny rules | Written, **not merged** | [`.claude/settings.json`](../../.claude/settings.json) | Pull request; confirm a `.env` read is refused |
| 3 | Charter | Both must-not rules already in [`CLAUDE.md`](../../CLAUDE.md) | below | Only if the team runs more than one agent at a time |
| 4 | Calibration table | Skeleton; **no estimates found, no hours** | [calibration](calibration.md) | Owners fill from weekly activity reports |
| 5 | Coarse estimates on issues | Ranges recorded, **not on the issues** | [estimate sheet](coarse-estimates.md) | Confirm the planning-poker round, then comment on 25 issues |
| 6 | Release plan | Values proposed, **not merged** | [traceability §3](../traceability.md) | Team agrees them in the pull request |
| 7 | Impact list | No client change found | [impact list](impact-list.md) | A member confirms |

## 1. Slice checks

Run locally on Windows at `d216e89`, before the documentation and settings changes.

| Check | Result |
|---|---|
| `npm run lint`, `npm run typecheck`, `npm run build` | Pass |
| `npm test` | Pass: 493 tests in 37 files |
| `npm run test:e2e` | 42 pass, 4 fail. All 4 are in `onboarding.spec.ts`; Mailpit was not running (Docker was stopped) |
| `npm run test:demo` | Smoke check passes; the shutdown assertion fails (exit code `null`, expected 0) |
| `npm run format:check` | Fails locally on line endings (`core.autocrlf=true`); passes with `--end-of-line auto` |

Before tagging, start Docker and Mailpit and rerun `npm run test:e2e`. CI on pull requests #111 and #123 passed every job.

The slice's matrix row reads Built, partly verified: no one browser test runs from adding a child to onboarding complete. Be ready to say that, and that parent notes are not screened because the word list is empty.

## Tag and release

After the checkpoint pull request merges (two non-owner approvals):

```sh
git switch main
git pull
git tag -a v0.1.0 -m "Checkpoint 2: proving slice"
git push origin v0.1.0
gh release create v0.1.0 --title "BookBuddies v0.1.0" --notes-file docs/checkpoint_2/release-notes-v0.1.0.md
```

Then rehearse the demo from the tag: `git switch --detach v0.1.0`, `npm ci`, `npm run demo`.

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
