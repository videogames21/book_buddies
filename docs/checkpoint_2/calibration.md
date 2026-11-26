# Calibration table

**Status: incomplete.** No estimate was found on any GitHub issue or pull request (searched 2026-11-25), and the weekly activity reports are not in this repository. Each owner fills in their rows.

## Use cases with merged builds

| Use case                                    | Owner                     | Issue            | Build pull requests (merged, UTC)           | State in the matrix          |
|---------------------------------------------|---------------------------|------------------|---------------------------------------------|------------------------------|
| `UC-PAR-create-kid-account` (proving slice) | Pradeep1029, videogames21 | #53              | #67 (11-16), #95 (11-13, into #67's branch) | In progress, partly verified |
| `UC-PAR-onboarding`                         | Abdifatah2023             | #58              | #107 (11-23), #114 (11-25)                  | Built, verified              |
| `UC-REC-kid-onboarding`                     | videogames21              | #69              | #102 (11-20)                                | Built, verified              |
| `UC-ADM-add-content`                        | videogames21              | #83              | #108 (11-24), #117 (11-24)                  | Built, verified              |
| `UC-SHLF-parent-view-shelf`                 | tamnguyen30               | #74 (still open) | #111 (11-25)                                | Built, partly verified       |

## Table

- **Parts**, in hours: clarify (report categories REQUIREMENTS, COMMUNICATION), design (DESIGN), build and review (DEVELOPMENT, REVIEW), verify (TESTING, BUGFIX).
- **Actual** is the total of the weekly activity report lines tagged with the use case ID since the estimate was made. With no estimate, record all of its lines.
- **Ratio** is actual divided by the midpoint of the range.
- If an estimate was not written down at the time, leave "none recorded". Do not write one now.

| Use case                    | Estimate | Made          | Range (h) | Midpoint (h) | Actual (h) | Ratio | Biggest miss |
|-----------------------------|----------|---------------|-----------|--------------|------------|-------|--------------|
| `UC-PAR-create-kid-account` | coarse   | none recorded | —         | —            |            | —     |              |
| `UC-PAR-create-kid-account` | refined  | none recorded | —         | —            |            | —     |              |
| `UC-PAR-onboarding`         | coarse   | none recorded | —         | —            |            | —     |              |
| `UC-PAR-onboarding`         | refined  | none recorded | —         | —            |            | —     |              |
| `UC-REC-kid-onboarding`     | coarse   | none recorded | —         | —            |            | —     |              |
| `UC-REC-kid-onboarding`     | refined  | none recorded | —         | —            |            | —     |              |
| `UC-ADM-add-content`        | coarse   | none recorded | —         | —            |            | —     |              |
| `UC-ADM-add-content`        | refined  | none recorded | —         | —            |            | —     |              |
| `UC-SHLF-parent-view-shelf` | coarse   | none recorded | —         | —            |            | —     |              |
| `UC-SHLF-parent-view-shelf` | refined  | none recorded | —         | —            |            | —     |              |

If an estimate does exist somewhere else (chat, a project board, meeting notes), replace "none recorded" with its date and range, and say where it came from.

**Biggest miss** is one sentence per use case, written by its owner. Where there was no estimate, say what took far longer or shorter than expected.

## Hours by part

**These are hours pull requests were open, not hours worked, and they do not come from the weekly activity reports.** They include nights, weekends and time waiting for review. Do not use them as actual hours or to compute a ratio.

- Each figure runs from a pull request being opened to being merged, from GitHub, in hours. Overlapping pull requests in the same part count once.
- Work done before a pull request was opened is not counted. Closed, unmerged pull requests are left out.
- Clarify and verify are entered as 0. Pull request times do not separate them: testing falls inside the build time.

| Use case                    | Clarify | Design | Build and review | Verify | Total  | Pull requests counted                         |
|-----------------------------|---------|--------|------------------|--------|--------|-----------------------------------------------|
| `UC-PAR-create-kid-account` | 0       | 25.8h  | 167.9h           | 0      | 193.7h | design #50, #56; build #67, #95               |
| `UC-PAR-onboarding`         | 0       | 63.5h  | 91.3h            | 0      | 154.8h | design #41, #98, #113; build #107, #114, #123 |
| `UC-REC-kid-onboarding`     | 0       | 27.3h  | 28.4h            | 0      | 55.7h  | design #96; build #102                        |
| `UC-ADM-add-content`        | 0       | 63.9h  | 81.3h            | 0      | 145.2h | design #100; build #108, #117                 |
| `UC-SHLF-parent-view-shelf` | 0       | 43.0h  | 78.8h            | 0      | 121.8h | design #97; build #111                        |
