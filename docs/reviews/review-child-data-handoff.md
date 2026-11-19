# Child-data design review

Refs [#63](https://github.com/videogames21/book_buddies/issues/63). Baseline: `8f27e55ec2032c5be43442c1feda2e0a52b5b1e1`.

The draft is in [design/par.md](../../design/par.md#uc-par-review-child-data-review-and-export). It covers the eleven categories, ownership of reads, both parent roles, shared password throttling, view/export audits, all-or-nothing failures and the download interaction.

The update uses the merged REC design and treats #98, #100 and #102 as pending integrations. It does not copy their unmerged code. OI-43/44 replace the old conflicting OI-41/42.

## Review questions

This was an adversarial self-review, not a fresh independent agent or teammate review.

| Question | Result |
|---|---|
| Can a caller change the family or credential being checked? | Fixed contract: family and user come from the current session; the password verifier reads that user's current credential. |
| Can wrong-password attempts alternate between sign-in and export? | One shared per-account policy and atomic reservation/outcome operation is required; Main Parent email and prefixed Sub Parent username keys are explicit. OI-43 asks the onboarding owner to review the interface. |
| Is a second password prompt required? | The proposal chooses one per action, avoiding a reusable grant and its session/child binding and expiry. Teammates can request a different interaction. |
| Which file is offered? | One versioned, indented UTF-8 JSON document, with a fixed filename and all category purposes. OI-44 records the proposal. |
| Does an export silently differ from the screen? | It returns one fresh snapshot for both screen and file; both the refreshed-view and export events commit first. |
| Does a later read or audit failure expose partial data? | No DTO/file is released. Serialization happens before the transaction commits. |
| Does revoking consent remove the parent's review right? | No: current session and family linkage authorize retained-data review; the create-child consent gate is not reused. |
| Can missing future readers return fake empty lists? | No: source inventory must first establish no collector exists. Any new collector must add its parent-data reader in the same change. |
| Do old notes and REC save times disappear? | Every retained note is included under the approved safety policy; REC's stored onboarding fields and save time are listed. |
| Can flagged content or the dangerous-content list be exported? | Still a client/team decision under OI-27. No admin-only evidence is exposed and no incomplete successful export is claimed. The affected path cannot be enabled until its requirements are settled. |
| Can browser history restore revealed data? | The page is uncached; revealed state is cleared on pagehide and restored pageshow, with confirmation required again. |
| Can the audit use the parent's credential ID as the target? | Corrected: new event variants target the child UUID; the note-flag event retains its existing ObjectId reference. |

## Verification

- 31 existing unit tests passed across six files. These test the current application, not an unbuilt child-data feature.
- Whitespace and Markdown fence checks passed.
- The package contains a four-file patch relative to the exact remote main baseline, with no application or dependency changes.
- The feature's integration, download and browser acceptance cases are design rows to implement after design approval.
- No fresh independent questions test or teammate approval has occurred. No GitHub Mermaid rendering pass is claimed.

## Publishing and approval

The design is a proposal for review, not an approved implementation contract. OI-27, the shared authentication interface, and the export/requester-confirmation choices remain visible for their owners. The team's same-file sequencing instruction also applies to the open PAR design #98: combine its merged changes before opening a competing final design PR.

Publishing was attempted again: GitHub branch creation returned HTTP 403. The CLI reports an invalid login and cannot resolve github.com from this session. The in-app GitHub browser is signed out. No branch, PR, review comment or project-board change was published.

The complete package is also prepared locally, so publication can continue once a working GitHub sign-in is available. Do not implement or merge on the strength of this self-review.
