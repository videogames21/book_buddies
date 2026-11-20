# Shelf (SHLF) Design

**Project:** BookBuddies
**Team:** Team 05
**Area:** `UC-SHLF`

> **Realizes:** `UC-SHLF-parent-view-shelf`, `UC-SHLF-kid-view-shelf`, `FR-PAR-review`, `FR-ACCT-credentials` (the child's sign-in half, a supporting flow with no use case, `OI-46`), `DI-usage-records` (the sign-in record)
> **Depends on:** `UC-ADM-block-content` (extension 5b: a block removes the shelf entries), `BR-parent-account-linked`, `BR-kid-no-metrics`, `BR-kid-anonymous-profile`, `BR-parent-shelf-removal`, `FR-SHLF-categories`, `FR-SHLF-finish-confirm`, `UI-kid-no-metrics`, `USE-child-first-run`, `DI-child-credentials`, `SEC-auth`, `SEC-signin-throttling`, `SEC-role-authorization`, `USE-parent-light`
> **Related, designed separately:** `UC-SHLF-parent-remove-book` (`BR-parent-shelf-removal`), `UC-SHLF-par-finish-book`, `UC-PAR-report-book`
> **See:** [use cases, SHLF area](../docs/requirements/use-cases.md#shlf-shelf-feature-area), [specification](../docs/requirements/software-requirements-specification.md), [business rules](../docs/requirements/business-rules.md), [architecture-of-record](architectural-design.md), [PAR design](par.md)
> **Designed against:** use cases v0.15 (updated in this PR), business rules v0.8, SRS v0.9, the PAR design, and the code on `main` and the merged `design/rec.md` as of 2026-11-18 (`requireParent()` in `sessions.ts` and `getChildForFamily` in `child-accounts.ts`, both used by the add-a-child pages). The Shelf and Catalog components have no code yet, and there is no shared parent layout guard: each parent page calls `requireParent()` itself.

> **Revised for:** `UC-SHLF-kid-view-shelf` and child sign-in, 2026-11-19, against `main` at `74c3079` and the open pull requests #98, #100, #102 and #104 (designs only; no Shelf, Notification or child sign-in code exists).

**Status of this draft.** Revised from PR #42 after it was reviewed against the 2026-10-28 client answers. Children no longer enter free text, so reflections, flagging of reflections and the 24-hour deletion window are gone; the use case is "View a Child's Shelf and **Ratings**". Steps 1, 3, 4 and 5 of the design process (own sketch, compare, questions test, teammate review) are still the team's to do. It covers `UC-SHLF-parent-view-shelf`, `UC-SHLF-kid-view-shelf` and child sign-in; the other SHLF use cases are appended as each is designed.

---

## Overview

The Shelf area owns each child's shelf: the entries in four categories, the child's ratings, the parent's confirmation that a child finished a book, manual search and its shelf requests, and parent removal. It is the Shelf component of the Application container ([containers](architectural-design.md#51-containers), [use case areas and components](architectural-design.md#52-use-case-areas-and-components)). `UC-SHLF-parent-view-shelf`, the first use case designed here, is read-only: it reads one child's shelf entries, their ratings and their finish state, checks that the child belongs to the signed-in parent's family, and asks the Catalog for each book's cover and title. It never reads the Child Identity Store, so the parent picks a child by nickname and avatar. It is the entry point to `UC-SHLF-parent-remove-book`, `UC-PAR-report-book` and `UC-SHLF-par-finish-book`, which are designed separately and implement the pages that this view links to. A child's pending shelf request is not a shelf entry, so it is not shown here; the parent sees it through `UC-PAR-approve-shelf-request`. This design adds one read to the Catalog row of the architecture-of-record.

`UC-SHLF-kid-view-shelf` is the child's side of the same shelf, and it needs a signed-in child, which **no use case covers** (`OI-46`). It is designed here as two parts that share one seam, `requireChild()`. The first is the child's shelf: a read-only view of the child's own entries, book details, own rating and pending notices, with no count of any kind (`BR-kid-no-metrics`, 8.2.11). The second is **child sign-in, sign-out and the child home screen**, written as *supporting flows with no use case*, the way `design/par.md` (open pull request #98) does for parent sign-in (`OI-44`). They live in this document and not in `par.md`: a child starts no `UC-PAR-*` use case, and it keeps this pull request away from the `par.md` edits of pull requests #98, #102, #104 and #100. The pieces this document reuses from those pull requests (`createDatabaseSession`, `sign-in-throttle.ts`, `deleteChildSignIn`, `signOutParent`) are **designs, not code**, and are named as such where used.

## Components & classes

```mermaid
classDiagram
    direction LR
    class ChildPickerPage {
        <<new>>
        /parent/shelf
    }
    class ParentShelfPage {
        <<new>>
        /parent/children/[childId]/shelf
    }
    class ShelfBrowser {
        <<new, client component>>
        selected book in page state
    }
    class parentShelf {
        <<new>>
        +getShelfForParent(familyId, childId) ParentShelfView
    }
    class childAccounts {
        <<reused + one new function>>
        +getChildForFamily(familyId, childId) ChildSummary
        +listChildrenForFamily(familyId) ChildSummary[]
    }
    class catalogBooks {
        <<Catalog file from rec.md, one new read>>
        +getBooksForShelf(bookIds) ShelfBook[]
    }
    class sessions {
        <<reused, PAR>>
        +requireParent() ParentSession
    }
    ChildPickerPage --> sessions
    ChildPickerPage --> childAccounts
    ParentShelfPage --> sessions
    ParentShelfPage --> parentShelf
    ParentShelfPage --> ShelfBrowser
    parentShelf --> childAccounts
    parentShelf --> catalogBooks
```

- `src/app/(parent)/parent/shelf/page.tsx` (new): the child picker (extension 1a), and the temporary entry point until a parent dashboard (`FR-PAR-dashboard`) links to the shelf. It calls `requireParent()`, then `listChildrenForFamily`. With exactly one child it redirects straight to that child's shelf, so a parent with one child takes no extra step (`USE-parent-light`, threshold still TBD). With several it lists them by nickname and avatar. With none (extension 1b, PRE-2 not met), a Main Parent is redirected to `/parent/children/new` and a Sub Parent sees a message to ask the Main Parent to add a child, as the add-a-child page does.
- `src/app/(parent)/parent/children/[childId]/shelf/page.tsx` (new): a server component, marked dynamic so it never serves a cached shelf. It calls `requireParent()` and handles the result the way `onboarding-complete/page.tsx` does: `NOT_SIGNED_IN` redirects to `/sign-in`, and any other failure (`NOT_A_PARENT`, which is what a child or admin session gets) is `notFound()`. It then calls `getShelfForParent` and passes the whole view to `ShelfBrowser`. It has no server action, because viewing changes nothing (POST-2).
- `src/app/(parent)/parent/children/[childId]/shelf/shelf-browser.tsx` (new, client component): renders the four categories in fixed order, each entry with cover and title, and keeps the selected book in its own state, with no request and no URL parameter (steps 4 and 5). Every entry whose finish is confirmed carries the confirmed-finished icon in the list, in whichever category it sits. For the selected book it shows the rating if there is one, and by finish state either "Confirm finished" (a Finished entry that no parent has confirmed) or "Edit note" (any confirmed entry), as in extension 5a. For the selected book it also shows "Remove from shelf" and "Report", the controls `UC-SHLF-parent-remove-book` and `UC-PAR-report-book` start from. All four are links to the pages in the table under API contract; this view never writes (POST-2), and it sends no data to them beyond the child and book IDs in the path.
- `src/app/(parent)/parent/children/[childId]/shelf/error.tsx` (new): the retry screen for extension 2b, with no shelf content.
- `src/server/shelf/parent-shelf.ts` (new, server-only): `getShelfForParent` checks the child's family first, then reads the child's shelf entries, ratings and finish confirmations, and the books' catalog data, and returns one complete view or throws. It never returns part of a shelf.
- `src/server/accounts-family/child-accounts.ts` (reused): `getChildForFamily(familyId, childId)` returns `{ _id, nickname, avatar }` for a child in that family and `null` otherwise (a malformed or unknown ID is also `null`, since the ID is matched as a string); it is the family check for this view. One function is added to the same file, `listChildrenForFamily(familyId)`, for the picker: same fields, ordered by creation date.
- `src/server/catalog/books.ts` (the Catalog file planned in `design/rec.md`, not yet in code; this design adds one read, server-only): `getBooksForShelf` returns cover and title for the given book IDs. It keeps the Catalog's existing rule that every read leaves out blocked books.
- `src/server/identity-access/sessions.ts` (reused): `requireParent()` returns an `ActionResult`: on success the user ID, family ID and `parentRole` (`main` or `sub`), on failure the code `NOT_SIGNED_IN` or `NOT_A_PARENT`. It does not redirect or throw, so each page decides what to do with the failure.

### Child's shelf (`UC-SHLF-kid-view-shelf`)

```mermaid
classDiagram
    direction LR
    class ChildHomePage {
        <<new>>
        /child
    }
    class ChildShelfPage {
        <<new>>
        /child/shelf
    }
    class ChildShelfBrowser {
        <<new, client component>>
        selected book in page state
    }
    class childShelf {
        <<new>>
        +getShelfForChild(childId) ChildShelfView
    }
    class shelfEntries {
        <<new, shared with parentShelf>>
        +listEntries(childId) EntryWithConfirmation[]
    }
    class childNotices {
        <<new, Notification>>
        +peekUnseenChildNotices(childId) ChildNotice[]
        +markNoticesSeen(ids) ids it set
    }
    class catalogBooks {
        <<Catalog, one read widened>>
        +getBooksForShelf(bookIds) ShelfBook[]
    }
    class sessions {
        <<reused, one new function>>
        +requireChild() ChildSession
    }
    class childAccounts {
        <<reused, one new function>>
        +getChildDisplay(childId) nickname and avatar
    }
    ChildHomePage --> sessions
    ChildHomePage --> childAccounts
    ChildShelfPage --> sessions
    ChildShelfPage --> childShelf
    ChildShelfPage --> ChildShelfBrowser
    childShelf --> shelfEntries
    childShelf --> catalogBooks
    childShelf --> childNotices
```

- `src/app/(child)/child/page.tsx` (new): the **child home**, a basic landing screen. It exists because the use case's trigger ("taps My Shelf on their home screen") and child sign-in both need one. It calls `requireChild()` and `getChildDisplay`, shows the child's nickname and avatar (8.2.11), a large "My Shelf" link and a "Sign out" button, and nothing else. The other use cases that start from the home screen (`UC-REC-recommend-quiz-rules`, `UC-SHLF-manual-search`) add their own buttons when they are designed. The reading dashboard is `UC-SHLF-kid-dashboard`, not this page.
- `src/app/(child)/child/shelf/page.tsx` (new): a server component, marked dynamic, with no caching, like the parent page. It calls `requireChild()`: `NOT_SIGNED_IN` redirects to `/child/sign-in`, and `NOT_A_CHILD` (a parent or admin session) is `notFound()`. It then calls `getShelfForChild` with the child ID **from the session**; no child ID is in the URL or the request. It has no server action (POST-2).
- `src/app/(child)/child/shelf/shelf-browser.tsx` (new, client component): renders the four categories in fixed order with large tap targets, each entry with its cover and title, the confirmed-finished icon on every confirmed entry in any category, and a Finished entry that is not confirmed grayed out with no icon (3c). When the child taps a book it shows, from what is already loaded, the book's details, the child's own rating if there is one, and the actions the server listed for that entry (steps 4 and 5). Selection is its own state, with no request and no URL parameter. It shows a pending notice once at the top (3d, 3f), the "find a book" message at the top for an empty shelf (2a), a "My Dashboard" link (3e), and nothing at all under an empty category (3a).
- `src/app/(child)/child/shelf/error.tsx` (new): the retry message for extension 2b, with no shelf content and a "Try again" button.
- `src/server/shelf/child-shelf.ts` (new, server-only): `getShelfForChild(childId)` reads the entries, finish confirmations, the child's ratings, the books' catalog data and the child's unseen notices, builds one complete view or throws, and only then marks the notices seen. The view carries only the notices that this call's own update marked, so a second tab that loads at the same time gets none. It never returns part of a shelf.
- `src/server/shelf/shelf-entries.ts` (new, server-only, shared): one read of a child's entries joined to their finish-confirmation state (`confirmed` is a confirmation record, whatever the category, the parent view's decision below). `getShelfForParent` is revised in place to call it, so the parent and the child view cannot disagree about which entries are confirmed.
- `src/server/catalog/books.ts` (the Catalog file, reused): `getBooksForShelf` also returns `author` and `seriesName`, for the child's book details; the parent view ignores them. It keeps the Catalog's rule that every read leaves out blocked books.
- `src/server/notification/child-notices.ts` (new, server-only, Notification): `peekUnseenChildNotices(childId)` and `markNoticesSeen(ids)`, a conditional update that sets `seenAt` only where it is unset and returns the IDs it actually set. Notices are *written* by `UC-SHLF-par-finish-book` 4b, `UC-SHLF-parent-remove-book` and `UC-PAR-report-book`, none of them designed yet.
- `src/server/accounts-family/child-accounts.ts` (reused): `getChildDisplay(childId)` returns `{ nickname, avatar }` and nothing else, so it is safe for a child session to call (8.2.11).
- `src/server/identity-access/sessions.ts` (reused, one new function): `requireChild()` returns `{ userId, childId }` from the `users` document with role `child`, or `NOT_SIGNED_IN` / `NOT_A_CHILD`. It does not redirect or throw. A parent session gets `NOT_A_CHILD`; a child session already gets `NOT_A_PARENT` from `requireParent()`.

### Child sign-in and sign-out (supporting flows, no use case, `OI-46`)

```mermaid
classDiagram
    direction LR
    class ChildSignInPage {
        <<new>>
        /child/sign-in
    }
    class childSignInActions {
        <<new, server actions>>
        +signInChild(fields) ActionResult
        +signOutChild() redirect
    }
    class signInThrottle {
        <<reused: sign-in-throttle.ts from the #98 design>>
        +checkAllowed(key)
        +recordFailure(key)
        +clear(key)
    }
    class childSignIns {
        <<new, Identity and Access>>
        +recordChildSignIn(tx, childId)
    }
    class childCredentials {
        <<reused, extended>>
        +findChildCredential(username)
    }
    class childAccounts {
        <<reused, one new function>>
        +childMaySignIn(childId) boolean
    }
    class sessions {
        <<reused: createDatabaseSession from the #98 design>>
        +createDatabaseSession(userId, expires, tx)
    }
    ChildSignInPage --> childSignInActions
    childSignInActions --> signInThrottle
    childSignInActions --> childCredentials
    childSignInActions --> childAccounts
    childSignInActions --> childSignIns
    childSignInActions --> sessions
```

- `src/app/(child)/child/sign-in/page.tsx`, `actions.ts`, `schema.ts` (new): the form (username and password, large fields, no link to any parent page) and `signInChild`; one zod schema serves form and action (8.2.5). `signOutChild` deletes the caller's own session document, clears the cookie and redirects to `/child/sign-in`, as `signOutParent` does in the #98 design. A signed-in child who opens the sign-in page is redirected to `/child`. The "Sign out" button is on `/child`.
- `src/server/identity-access/child-credentials.ts` (reused, extended): `findChildCredential(username)` returns the user ID, child ID and password hash and nothing else. It matches the username case-insensitively, because the parent's entry is stored as typed (`UC-PAR-create-kid-account` step 3) and a child may type it in other capitals. `deleteChildSignIn` (named by pull request #104) also deletes the child's `childSignIns` records and all the child's throttle state (every key that starts `child:` plus the username).
- `src/server/identity-access/sign-in-throttle.ts` (reused from the #98 design, server-only): counts failed sign-ins per key and returns how long the caller must wait (`SEC-signin-throttling`). A child's key is `child:`, the lowercased username and a hash of the caller's device token (below), so it never meets a parent's email key, and one device's failures never make another device wait. It takes the child's numbers and the decay rule from the table under Data model; if #98's module has them fixed, it gains parameters for the free attempts and the decay.
- `src/server/identity-access/device-token.ts` (new, server-only): reads the `child_device` cookie, a random value with no meaning (httpOnly, Secure, SameSite=Lax), and issues one when the request has none. Only a hash of it is stored, in the throttle key. It identifies a browser for the throttle and nothing else: it is not written to `childSignIns`, it holds no IP address, and it is deleted with the throttle state (`DI-usage-records`).
- `src/server/identity-access/child-sign-ins.ts` (new, server-only): owns `childSignIns`, one record per successful sign-in (`DI-usage-records`), and the read the admin usage lookup will call later (`FR-ADM-child-lookup`).
- `src/server/accounts-family/child-accounts.ts` (reused): `childMaySignIn(childId)` is the one place that decides whether a child account may sign in. Today it checks that the child exists and that the family's consent is confirmed and not revoked (`isConsentConfirmed`). Suspension arrives here later (`UC-ADM-suspend-account`, and the children of a suspended parent, `OI-47`).
- `src/server/identity-access/sessions.ts` (reused): `createDatabaseSession(userId, tx?)` from the #98 design gains an `expires` argument, because a child's session ends at the next midnight and not after a fixed lifetime (Key decisions).


## Sequence

### UC-SHLF-parent-view-shelf: view a child's shelf and ratings

```mermaid
sequenceDiagram
    actor P as Parent
    participant UI as Web UI
    participant PG as Shelf page
    participant IA as Identity & Access
    participant SH as Shelf
    participant AF as Accounts & Family
    participant CAT as Catalog
    participant DB as Database
    P->>UI: Tap "View Shelf" (step 1)
    alt more than one child (1a)
        UI-->>P: Child picker, nickname and avatar only
        P->>UI: Choose a child (1a)
    end
    UI->>PG: GET /parent/children/{childId}/shelf
    PG->>IA: requireParent()
    IA-->>PG: parent session (family ID), or NOT_SIGNED_IN / NOT_A_PARENT
    alt not signed in
        PG-->>UI: redirect to /sign-in
    else not a parent (child or admin session)
        PG-->>UI: 404, no shelf data
    end
    PG->>SH: getShelfForParent(familyId, childId) (step 2)
    SH->>AF: getChildForFamily(familyId, childId)
    alt child not in the parent's family (2c)
        AF-->>SH: not found
        SH-->>PG: not found
        PG-->>UI: 404, no shelf data
    end
    SH->>DB: Shelf entries, ratings, finish confirmations for the child (step 2)
    SH->>CAT: getBooksForShelf(bookIds) (step 2)
    CAT-->>SH: cover and title; blocked books left out (5b)
    alt any read fails (2b)
        SH-->>PG: error
        PG-->>UI: Retry screen, nothing partial
    end
    SH-->>PG: Complete view
    alt no entries (2a)
        PG-->>UI: Empty-state message
    end
    PG-->>UI: Four categories in fixed order, cover and title (step 3)
    P->>UI: Tap a book (step 4)
    UI-->>P: Rating if any (step 5); "Confirm finished" on a Finished entry with no confirmation, or "Edit note" on a confirmed entry in any category (5a)
    P->>UI: Leave the view (step 6)
```

Step 4 needs no second request: the page already holds every entry's rating and finish state, and selecting a book only changes state inside `ShelfBrowser`, so the shelf is never read again and cannot hit 2b or 5b halfway through a visit. Extension 5b needs no code in this view: when the admin blocks a book, `UC-ADM-block-content` removes the shelf entries in the same save, so the entry is gone the next time the page loads, and nobody is told.

### UC-SHLF-kid-view-shelf: view my shelf

```mermaid
sequenceDiagram
    actor C as Child
    participant UI as Web UI
    participant PG as Child shelf page
    participant IA as Identity & Access
    participant SH as Shelf
    participant CAT as Catalog
    participant NOT as Notification
    C->>UI: Tap "My Shelf" on /child (step 1)
    UI->>PG: GET /child/shelf
    PG->>IA: requireChild()
    alt not signed in
        PG-->>UI: redirect to /child/sign-in
    else not a child session (parent or admin)
        PG-->>UI: 404, no shelf data
    end
    PG->>SH: getShelfForChild(childId from the session) (step 2)
    SH->>SH: Entries, finish confirmations and the child's ratings (step 2)
    SH->>CAT: getBooksForShelf(bookIds) (step 2; blocked books left out, 3b)
    CAT-->>SH: cover, title, author, series name
    SH->>NOT: peekUnseenChildNotices(childId) (3d, 3f)
    alt any read throws (2b)
        SH-->>PG: error
        PG-->>UI: error.tsx: retry message, nothing partial
    end
    SH->>NOT: markNoticesSeen(ids), only after every read succeeded; keep only the ids this call set (3d, 3f)
    SH-->>PG: One complete view
    alt no entries (2a)
        PG-->>UI: Message at the top pointing to a recommendation, no count
    end
    PG-->>UI: Four categories in fixed order, cover and title, large tap targets (step 3, 3a, 3c)
    opt a notice was pending
        PG-->>UI: The notice, once (3d, 3f)
    end
    C->>UI: Tap a book (step 4)
    UI-->>C: Details, own rating if any, move, remove, and rate only if the finish is confirmed (step 5, 5a)
    C->>UI: "My Dashboard" (3e), or leave (step 6)
```

Step 4 needs no second request: the page already holds every entry's details, rating and allowed actions. Extension 3b needs no code here, as in the parent view: the block removed the entry and nobody is told.

### Supporting flows with no use case (`OI-46`): child sign-in and sign-out

These are **not steps of `UC-SHLF-kid-view-shelf`**; its PRE-1 assumes them. The developer chose (2026-11-19) to design them here.

#### Child signs in

```mermaid
sequenceDiagram
    actor C as Child
    participant UI as Web UI
    participant ACT as signInChild
    participant IA as Identity & Access
    participant AF as Accounts & Family
    participant DB as Database
    C->>UI: Username and password on /child/sign-in
    UI->>ACT: signInChild(fields)
    ACT->>ACT: Validate; trim and lowercase both fields
    ACT->>IA: Read or issue the device token; key = "child:" + username + device
    ACT->>IA: checkAllowed(key)
    alt this device is waiting after repeated failures (SEC-signin-throttling)
        ACT-->>UI: TOO_MANY_ATTEMPTS, password not checked, nothing counted
    end
    ACT->>IA: findChildCredential(username), verifyPassword (against a dummy hash if unknown, so the work is the same)
    alt unknown username or wrong password
        ACT->>IA: recordFailure(key)
        ACT-->>UI: INVALID_CREDENTIALS
    end
    ACT->>AF: childMaySignIn(childId)
    alt consent revoked, child gone, or suspended
        ACT-->>UI: ACCOUNT_UNAVAILABLE
    end
    ACT->>IA: clear(key)
    ACT->>DB: Begin transaction
    ACT->>IA: createDatabaseSession(userId, next midnight, tx); recordChildSignIn(tx, childId)
    ACT->>DB: Commit
    ACT->>IA: Delete the session the browser's old cookie named, then set the new cookie
    ACT-->>UI: ok
    UI-->>C: Redirect to /child
```

#### Child signs out

```mermaid
sequenceDiagram
    actor C as Child
    participant UI as Web UI
    participant ACT as signOutChild
    participant IA as Identity & Access
    C->>UI: "Sign out" on /child
    UI->>ACT: signOutChild()
    ACT->>IA: Delete this session's document, clear the cookie
    ACT-->>UI: ok
    UI-->>C: Redirect to /child/sign-in
```

## API contract

This use case only reads, so its rows are pages and the server function behind them, not server actions (8.2.3).

| Endpoint or job | Caller (who may) | Request | Success | Errors, by extension |
|---|---|---|---|---|
| Page `/parent/shelf` (UC-SHLF-parent-view-shelf 1a) | A signed-in parent, Main or Sub | None | The family's children, nickname and avatar only; with one child, a redirect to that child's shelf | No session: redirect to `/sign-in`. A session that is not a parent: `404`, as the other parent pages do (8.1). |
| Page `/parent/children/{childId}/shelf` (UC-SHLF-parent-view-shelf) | A signed-in parent, Main or Sub, of that child's family | `childId` in the path | The four categories in fixed order, entries most recently moved first, each with cover and title, and for every entry its finish state (confirmed, in any category, or awaiting, for a Finished entry only) and its rating if the child has rated the book and a parent has confirmed the finish | 2a: empty state, not an error. 2b: the `error.tsx` retry screen, no shelf content. 2c: `404`, the same response for another family's child, a child that does not exist, and a malformed ID, so nothing reveals which IDs are real. No session: redirect to `/sign-in`; a child or admin session: the same `404`. |
| `getShelfForParent(familyId, childId)` in Shelf | Only the page above | The family ID from the session and the child ID | One complete shelf view | Throws on any failed read (2b); returns not found when the child is outside the family (2c). |

Fields never in the response: the child's real name (the system holds none), age, grade or reading level; any number at all, including in headings, badges and labels (`BR-kid-no-metrics` applied to this view as the use case proposes; `OI-31` is still open on the parent dashboard); the parent's finish note, which belongs to `UC-SHLF-par-finish-book`.

**What the page hands to `ShelfBrowser`** (`ParentShelfView`): the child's nickname and avatar, and a list of entries, each with only `bookId`, `title`, `coverUrl`, `category`, `confirmed` (true or false) and `rating` (one of the four values, or none). It has no dates, no `childId`, no confirming parent and no counts. "No number" means nothing displayed as a count or total, and the response does not carry fields the page has no use for.

**Links this view renders**, none of which write anything here:

| Control | Shown on | Target | Implemented by |
|---|---|---|---|
| Confirm finished | A Finished entry with no confirmation record, when selected | `/parent/children/{childId}/shelf/{bookId}/finish` | `UC-SHLF-par-finish-book` |
| Edit note | Any confirmed entry, when selected | `/parent/children/{childId}/shelf/{bookId}/finish` | `UC-SHLF-par-finish-book` |
| Remove from shelf | Any selected entry | `/parent/children/{childId}/shelf/{bookId}/remove` | `UC-SHLF-parent-remove-book` |
| Report | Any selected entry | `/parent/children/{childId}/shelf/{bookId}/report` | `UC-PAR-report-book` |

These paths are this design's proposal. Each of those use cases' designs either builds its page at the path or changes this table in the same pull request, and each page re-checks the family and role itself (`SEC-role-authorization`).

### `UC-SHLF-kid-view-shelf`

This use case only reads, so its rows are pages and the server function behind them (8.2.3).

| Endpoint or job | Caller (who may) | Request | Success | Errors, by extension |
|---|---|---|---|---|
| Page `/child` | A signed-in child | None | The child's nickname and avatar, a "My Shelf" link and "Sign out" | No session: redirect to `/child/sign-in`. A parent or admin session: `404` |
| Page `/child/shelf` (UC-SHLF-kid-view-shelf) | A signed-in child; the child is the session's, never a parameter | None | The four categories in fixed order, entries most recently moved first. Per entry: `bookId`, `title`, `coverUrl`, `author`, `seriesName` (or none), `category`, `confirmed`, `rating` (one of four words, or none) and `actions`: `move` and `remove`, plus `rate` only when `confirmed`; an entry awaiting confirmation (3c) has `move` and `remove`, and either one cancels the parent's pending request. Plus `notices` (kind and, for a removal, the title) and a `showFindBookMessage` flag | 2a: all four categories still show, with the flag set, not an error. 2b: the `error.tsx` retry screen, no shelf content. 3a: an empty category has its heading and nothing else. 3c: a Finished entry that is not confirmed has `confirmed` false and no `rate`. 3d, 3f: a notice appears once, then never. 3b: a blocked book is absent. 5a: `rate` is not in `actions`. No session: redirect to `/child/sign-in`. A parent or admin session: `404` |
| `getShelfForChild(childId)` in Shelf | Only the page above | The child ID from the session | One complete view | Throws on any failed read (2b); marks notices seen only after every read succeeded |

**Never in the payload:** age, grade, reading level, the real name (none is held), any count or total, any date, `childId`, the confirming parent, the parent's note, a book's tags (8.2.11, `BR-kid-no-metrics`). `showFindBookMessage` is a flag, not a count.

**Links this view renders** (paths are this design's proposal; each use case's design adopts them or changes this table in its own pull request, and each page re-checks the child and the book itself): `move` to `/child/shelf/{bookId}/move` (`UC-SHLF-kid-move-book`), `remove` to `/child/shelf/{bookId}/remove` (`UC-SHLF-kid-remove-book`), `rate` to `/child/shelf/{bookId}/rate` (`UC-SHLF-kid-rate-book`), and "My Dashboard" to `/child/dashboard` (`UC-SHLF-kid-dashboard`). Until those pages are built the links lead nowhere, so the implementation may land them with those use cases.

### Supporting flows (`OI-46`): child sign-in and sign-out

Errors use the §8.2.1 shape. Messages are short and written for a child, and say to ask a grown-up when the child cannot fix the problem.

| Endpoint or job | Caller (who may) | Request | Success | Errors |
|---|---|---|---|---|
| Page `/child/sign-in` | Anyone | None | The username and password form | A signed-in child: redirect to `/child` |
| Server action `signInChild` | Anyone | Username, password | `ok`; the session cookie is set; the page redirects to `/child` | `USERNAME_REQUIRED`, `PASSWORD_REQUIRED`; `INVALID_CREDENTIALS` (the same for an unknown username and a wrong password); `TOO_MANY_ATTEMPTS` (a short wait, no number of seconds shown, never a lock); `ACCOUNT_UNAVAILABLE` (ask a grown-up; only after a correct password) |
| Server action `signOutChild` | A signed-in child | None | `ok`; the caller's session document is deleted and the cookie cleared; redirect to `/child/sign-in` | No session: redirect to `/child/sign-in` |


## Key decisions

**The family check is inside the Shelf data-access function, not the page.** `getShelfForParent` takes the family ID and calls `getChildForFamily` before any read, so there is no function that returns a child's shelf without it. Rejected: checking in the page and passing a bare child ID down, because section 8.1 puts the scope in data access so that "a query cannot be written without it", and the next page to reuse the function would skip the check.

**Another family's child returns 404, not 403.** Rejected: `403 Forbidden`, which confirms that a child ID exists. The child ID would then be a probe for other families' children. One `not-found.tsx` serves every cause (another family's child, an unknown or malformed ID, a child or admin session, a parent with no children who types a shelf URL), so the copy is the same. Response timing is not equalized; it is not a stated requirement, and the IDs are opaque.

**The parent picks a child by nickname and avatar.** Rejected: showing the child's real name. The system holds none, and the nickname is what the parent chose to identify the child.

**Ratings and finish confirmations are stored apart from the shelf entry, keyed by child and book.** Rejected: fields on the shelf entry. `UC-SHLF-kid-remove-book`, `UC-SHLF-parent-remove-book` and `UC-ADM-block-content` delete the entry but keep the rating and the confirmation, which fields on a deleted entry cannot do. This view joins them to the current entries, so a rating for a removed or blocked book is not shown here.

**A blocked book is simply absent; there is no "no longer available" label.** `UC-ADM-block-content` removes the shelf entries and the use case says neither parent nor child is told. Rejected: an exception to the Catalog's "leave out blocked books" rule that shows blocked books marked, which would contradict that use case and need an architecture change. If an entry survives for a blocked book, the Catalog leaves the book out and the shelf drops the entry.

**The whole shelf loads in one call, and selecting a book is page state.** Every entry's rating and finish state come with step 2, and `ShelfBrowser` shows the selected book from what it already holds. Rejected: a `?book=` parameter or a link per book, because each tap would be a navigation that reads the shelf again, so step 5 could fail with 2b or lose a book to 5b halfway through a visit. A shelf holds only what the child added from a seed catalog of 134 books (`SI-book-dataset`), so one load stays small.

**Every load reads fresh.** The page sets `export const dynamic = "force-dynamic"`, `next.config.ts` configures no caching or `staleTimes`, and `getShelfForParent` and `getBooksForShelf` use no cache (`unstable_cache` and `"use cache"` stay out). Rejected: caching the shelf, because a cached shelf would show a book that a block or a parent removal has already taken off (5b, 2b). The test below checks a block against the next load.

**A book the Catalog does not return is dropped; only an error is a failure.** `getBooksForShelf` returns the books it found that are not blocked; a shelf entry whose book is missing from the result is left out of the view, and the rest is shown. A thrown error from any read shows the retry screen with no shelf (2b). Rejected: treating a missing book as an error, which would send a parent to the retry screen every time a block removes a book mid-visit. `getBooksForShelf` is one query for all the book IDs, so it returns every book it found or throws; a partial Catalog outage cannot give a partial shelf. An error thrown by `requireParent()` or `getChildForFamily` also goes to the retry screen. Only the two results they return, not-signed-in and not-found, redirect or give the `404`.

**"Confirmed" is a `FINISH_CONFIRMATION` record, and it does not depend on the category.** `UC-SHLF-par-finish-book` POST-1 and `UC-SHLF-kid-move-book` 3d say the confirmation and the icon stay wherever the child moves the book, and trigger (c) lets a parent edit the note on any confirmed book. So an entry with a record is confirmed in any category and shows the icon and "Edit note"; only a Finished entry with no record is awaiting confirmation and shows "Confirm finished"; an entry in another category with no record shows neither. Rejected: tying confirmation to the Finished category, which would drop the icon and "Edit note" from a confirmed book the child moved back to Reading Now to re-read, and rejected: an `awaitingConfirmation` field on the entry as well, because two stores for one fact can disagree.

**A rating shows on any entry still on the shelf, and not once its entry is gone.** A rating belongs to the child and the book, so a confirmed book moved to Reading Now keeps its rating on screen. A rating needs a confirmation record, so a rating row without one is never shown. When the entry is removed by the child or a parent, or by `UC-ADM-block-content`, the rating is kept for the recommender (`UC-SHLF-kid-remove-book` POST-2, `UC-ADM-block-content` POST-3) but this view has no entry to hang it on, so it is not shown. This is a team proposal recorded in the use case and in `OI-41`; the client has not confirmed it.

**This view links out and never writes.** "Confirm finished", "Edit note", "Remove from shelf" and "Report" are links to pages that the other SHLF and PAR use cases implement, at the paths in the table under API contract. Rejected: doing any of them from this page, which would make a read-only view write and break POST-2; and rejected: leaving the targets for later, because the use cases say a parent starts remove and report from this view, so the view has to offer them.

### The child's shelf

**The child ID comes from the session, never from the request.** `getShelfForChild` takes the ID `requireChild()` returned, so there is no parameter a child could change to read another child's shelf. Rejected: `/child/{childId}/shelf`, which would create exactly that parameter.

**A notice is marked seen only after every read succeeded, with a conditional update, and only the notices this load marked are shown** (developer, 2026-11-19). A notice shows once even if the child opens the shelf in a second tab before dismissing it in the first: the tab whose update sets `seenAt` shows it, and the other shows nothing. Rejected: marking on read, because a failure at 2b would use up the notice with nothing shown; a "got it" button, because the use case says it is shown once, and a child who never taps would see it every time; and showing every notice that was unseen when read, which shows it twice in a race. Accepted loss: a crash between marking and rendering drops one notice, and the tab that lost a race never shows it.

**The server lists each entry's actions.** `rate` is in `actions` only when the entry is confirmed, because 5a says the action is not offered. The action pages check the state themselves (their own use cases). Rejected: the client deriving it from `confirmed` and `category`, which would put a rule in two places.

**An entry awaiting confirmation can still be moved or removed by the child, and doing so cancels the parent's request** (developer, 2026-11-19). The child's `actions` list `move` and `remove` for every entry. `UC-SHLF-kid-move-book` and `UC-SHLF-kid-remove-book` clear the awaiting state. `UC-SHLF-par-finish-book` must make its save conditional on the entry still being in Finished and awaiting, and when it is not, even after the parent tapped "Confirm finished" or "Not finished yet", show the parent a message that the child moved or removed the book, which cancelled the request (`UC-SHLF-par-finish-book` 1a is edited to say so). This view only lists the actions; the rest belongs to those designs. Rejected: withholding `move` and `remove` on an awaiting entry, which would stop a child retracting a completion (`UC-SHLF-kid-move-book` 3c).

**One shared read of entries and confirmation state for both views.** Rejected: two copies of the confirmed or awaiting rule, which could disagree about the same entry.

**The child's own rating shows on any entry still on the shelf, and only when a confirmation record exists**, the rule the parent view uses (`OI-41`): a stray rating row is never shown. A rating is shown as one of the four words, never a number.

**Book details are cover, title, author and series name only.** The reading level and the other tags stay off the child's screen (`BR-kid-no-metrics`, 8.2.11). Rejected: every catalog field, which would show the reading level.

**A removal notice resolves its book title through the Catalog read; a finish notice has no title.** The removal notice references the book (`UC-SHLF-parent-remove-book`) and the book is no longer on the shelf, so the title comes from the notice's `bookId` through `getBooksForShelf`. If the Catalog does not return it, the notice shows without a title. Wording of the removal notice is still TBD in that use case.

**The empty shelf shows the four categories with a message at the top.** 2a and 3a together, as the developer decided: nothing is shown under an empty category.

### Child sign-in (no use case, `OI-46`)

**A separate `/child/sign-in`, not the parent's `/sign-in`.** Rejected: one form that tells an email from a username, which mixes the two throttle policies and shows a six-year-old a parent screen.

**The password is trimmed and lowercased before it is checked.** Generated passwords are all lowercase words and digits (`generateChildPassword`), so a first letter a tablet capitalizes still works. Rejected: an exact match, which would fail `USE-child-first-run` for no security gain.

**A child's sign-in uses the parent's throttle, with the child's numbers, counted per device: 3 wrong attempts cost nothing, then each further attempt must wait, 30 seconds first and doubling after every further wrong one, and there is never a lock** (developer, 2026-11-19; `SEC-signin-throttling`; the sign-in decision in `design/par.md`, pull request #98). The wait is capped at 15 minutes, as in #98's table (the developer gave no cap; confirm). A correct password clears that device's count.
- **The count belongs to the device, so nobody can lock a child out remotely.** A device is a browser holding the `child_device` token. A wait on one device does not stop the correct password on another, so someone guessing from elsewhere cannot keep the child from signing in on theirs (`SEC-signin-throttling`).
- **An attempt made during a wait is refused and does not count.** It is not checked against the password and does not lengthen the wait.
- **The count decays: one wrong attempt is forgiven every 30 minutes, but only while no wait is running.** The 30 minutes start when the last failure's wait ends (or at the last failure, if no wait was running). A device whose count reaches zero has its record deleted when it is read.
- Rejected: a lock that a parent dismisses, the first draft of this design, because `SEC-signin-throttling` says a lockout must not let anyone lock a child out on purpose. Rejected: counting per IP address (`DI-usage-records` forbids keeping one). Rejected: one count per account for every device, because a wait would then refuse the child's own correct password. Accepted risk: a guesser who discards the token on every attempt looks like a new device each time and is not slowed by this throttle (Open questions, `OI-49`).

**Failures are counted per lowercased username and device, unknown usernames included, and an unknown username and a wrong password give the same answer** (as #98 does for emails). Rejected: keying by child ID, which would make an existing username answer differently from an unknown one.

**The username is stored as the parent typed it, and sign-in matches it case-insensitively** (`UC-PAR-create-kid-account` step 3 and 4g, as already declared; its format rules are TBD in 4h). The use case says only that a username must be unique, so its design must treat two usernames that differ only in capitals as taken; otherwise a case-insensitive lookup could find two children. Nothing here changes what the parent enters. Accepted, as in #98: a record exists for any string typed at the form, and its clearing and purging belong to #98's throttle.

**`ACCOUNT_UNAVAILABLE` only comes after a correct password**, so it tells a guesser nothing, and tells a child whose consent was revoked or who is suspended something other than "wrong password".

**The session ends at the next midnight, not after a fixed lifetime** (developer's decision, 2026-11-19, `OI-48`). `createDatabaseSession` is given the expiry; the child's session document stores it as its `expires` and is treated as expired the moment it passes, whether or not cleanup has run (8.2.2, `KD-time-rules-on-read`). Auth.js compares `expires` with the real clock, so `requireChild()` also compares it with `now()` and refuses an expired session itself (developer, 2026-11-19: any extra enforcement is better), which is also what the fixed-clock tests exercise. "Next midnight" is the first 00:00 after the sign-in in one configured time zone. Auth.js must not extend the session: the database strategy slides `expires` forward when a session is read after `updateAge`, so the auth configuration sets `updateAge` at least as long as the longest session, and a test proves the expiry does not move. Rejected: a fixed 24-hour lifetime, which is not what was asked and would end a morning session in the middle of the next day.

**The sign-in record is written in the same transaction as the session** (8.2.8), so there is no session without its `DI-usage-records` entry and no record without a session.

**A child's sign-in deletes the session the browser's old cookie named.** Rejected: leaving it, because on a shared family tablet a parent's session would stay valid but unreachable until it expires.

**`requireChild()` makes no second check of the child's account.** Deleting the child (`UC-PAR-delete-kid-account`), revoking consent and a suspension end their sessions (§8.1), so the session is the check, as for parents, plus the expiry check above. `childMaySignIn` runs only at sign-in.



## Data model

This use case writes nothing. It fixes the three collections the SHLF use cases share, so later designs do not redraw them. Children and books belong to Accounts & Family and the Catalog.

```mermaid
erDiagram
    SHELF_ENTRY }o--|| BOOK : "is"
    RATING }o--|| BOOK : "rates"
    FINISH_CONFIRMATION }o--|| BOOK : "confirms"
    SHELF_ENTRY {
        id childId
        id bookId
        string category "readingNow, wantToRead, maybeLater, finished"
        date movedAt "UTC, sets order within a category"
    }
    RATING {
        id childId
        id bookId
        string value "lovedIt, likedIt, okay, notForMe"
        date ratedAt
    }
    FINISH_CONFIRMATION {
        id childId
        id bookId
        id confirmedByParentId
        date confirmedAt
    }
```

Each collection has a unique index on (`childId`, `bookId`), because a child has one entry, one rating and one confirmation per book. Rating values follow the four-option scale in the glossary (`OI-17`, resolved), and a rating exists only for a confirmed finish (`UC-SHLF-par-finish-book` POST-2). "Awaiting confirmation" is derived: a Finished entry with no confirmation record. "Confirmed" is a confirmation record for the child and book, whatever the entry's category. This view shows a rating only for an entry on the shelf whose book has a confirmation record, so a stray rating row is never shown. The parent's finish note is written and read by `UC-SHLF-par-finish-book` and is not part of this view. `childId` is the opaque ID, never a name (`KD-pii-segregation`). The indexes go in `src/server/setup/ensure-indexes.ts` from the [PAR design](par.md). The exact fields of `SHELF_ENTRY` that `UC-SHLF-par-finish-book` and `UC-SHLF-kid-move-book` also need (for example the category a book came from) are theirs to add when they are designed.

### Additions for the child's shelf and child sign-in

```mermaid
erDiagram
    CHILD_NOTICE }o--|| CHILD : "shown to"
    CHILD_SIGN_IN }o--|| CHILD : "records"
    CHILD_NOTICE {
        id _id
        string childId
        string kind "finish-declined or book-removed"
        id bookId "book-removed only"
        date createdAt "UTC"
        date seenAt "absent until shown"
    }
    CHILD_SIGN_IN {
        string childId
        date at "UTC"
    }
```

- `childNotices` (Notification, §5.2 already assigns every in-app notice to it): this design fixes only the shape the shelf reads. Other designs write it: `UC-SHLF-par-finish-book` 4b (a `finish-declined` notice, fixed wording, no book, no parent), and `UC-SHLF-parent-remove-book` and `UC-PAR-report-book` (a `book-removed` notice with the book's ID, no parent's identity). The shelf reads `seenAt` unset and sets it. Indexed on (`childId`, `seenAt`). It holds the opaque child ID only, never a name (`KD-pii-segregation`).
- `childSignIns` (Identity & Access): one record per successful sign-in, indexed on (`childId`, `at`). Written in the sign-in transaction. It keeps no IP address, device identifier or session length (`DI-usage-records`). Purpose for `BR-coppa-minimization`: the retention measure and the admin's lookup of one child's usage (`FR-ADM-v1-measures`, `FR-ADM-child-lookup`).
- Sign-in throttle state: the `signInAttempts` collection of the #98 design (unique on the account key), with the child's key `child:`, the lowercased username and a hash of the device token. No new collection is needed. It is checked against `now()` on read (8.2.2), decays as in Key decisions, and is cleared by a correct password on that device and when the child is deleted.
- `users` (role `child`) and `sessions`: no change in shape. A child session's `expires` is the next midnight.
- No change to the shelf collections.

New configuration (8.2.6), read once by the config module:

| Setting | Value |
|---|---|
| `CHILD_SESSION_TIME_ZONE` | required, a time zone name; "midnight" is the first 00:00 after sign-in in this zone (`OI-48`) |
| Free wrong attempts | 3, per username and device |
| First wait after the free attempts | 30 seconds, doubling after each further wrong attempt, capped at 15 minutes (#98's cap; confirm) |
| Decay | 1 wrong attempt forgiven every 30 minutes, paused while a wait is running |
| `child_device` token lifetime | 30 days, renewed on each use (a proposal; confirm) |


## Reuse & cross-cutting

- **Sessions:** `requireParent()` from the [PAR design](par.md), called by each page (8.1 Authentication; middleware is never the check). There is no shared layout guard.
- **Account states:** a child account exists only after the parent confirmed consent (`UC-PAR-create-kid-account` PRE-3), so this view checks nothing more. The data model has no suspended state, and a deleted child is simply not found.
- **Family scope:** `getChildForFamily` in Accounts & Family, already written and reused by every use case that reads a child's records (8.1 Authorization).
- **Error handling:** the route's `error.tsx` with a calm message and no detail (8.2.1).
- **Code conventions:** only Shelf's data-access functions read its collections; the page imports no database client (8.2.4).
- **Logging:** as 8.2.7 says, a refused request or server error is logged with a request or error ID, and nicknames, ages, grades, note text, usernames and session IDs are never logged. The opaque child ID in the URL path may appear in the hosting platform's request log; it names no one and is not on the 8.2.7 list. No rating or shelf content is logged.
- **Child-facing views:** not used by the parent view. The child's own shelf is `UC-SHLF-kid-view-shelf`, designed below, which follows 8.2.11.

Not used: Notification, the Child Identity Store, Safety Flagging, and the audit log (a parent viewing a shelf is not in the 8.2.9 list).

### Child's shelf and child sign-in

- **Sessions:** `requireChild()` joins `requireParent()` in `sessions.ts`; each page and action calls the one it needs (8.1). The session callback in `auth.ts` already passes on only the user ID, so a child session carries no nickname or username.
- **Child-facing views:** both child pages follow 8.2.11: the child's nickname and avatar and book data, and no count, date, reading level or comparison. `getChildDisplay` is the only account read a child session reaches and returns nothing else.
- **Time:** the session expiry, the throttle wait and the sign-in time use `now()` from the clock module and are checked on read (8.2.2).
- **Persistence:** the session and the sign-in record are one transaction (8.2.8); the notice is marked seen with a conditional update.
- **Error handling:** every action returns the shared result shape (8.2.1); `error.tsx` is the 2b screen.
- **Logging:** never the username, password, nickname or session ID; a failed or refused sign-in is logged with a request ID only (8.2.7). An unknown username and a wrong password log identically.
- **Audit:** none. A child signing in is a usage record, not an 8.2.9 event.
- **Passwords:** `passwords.ts` `verifyPassword`, reused unchanged, and `child-credentials.ts`.
- **Not used:** the Child Identity Store (nothing here reads age, grade or reading level) and Safety Flagging.


## Tests

| Use case, flow | Level | Asserts |
|---|---|---|
| UC-SHLF-parent-view-shelf main | integration | A parent sees their child's entries under the four categories in fixed order, most recently moved first, each with cover and title, and a Finished book's rating on selection |
| UC-SHLF-parent-view-shelf main, Sub Parent | integration | A Sub Parent of the family sees the same shelf as the Main Parent |
| UC-SHLF-parent-view-shelf main, read-only | integration | Viewing the shelf changes no shelf entry, rating or confirmation (POST-2) |
| UC-SHLF-parent-view-shelf main, no metrics | integration | The response holds no count or total |
| UC-SHLF-parent-view-shelf 1a | integration | A parent with two children gets the picker; a parent with one is redirected straight to that child's shelf |
| UC-SHLF-parent-view-shelf 1a, no real name | integration | The picker's response holds nicknames and avatars and no age or grade |
| UC-SHLF-parent-view-shelf 2a | integration | A child with no entries gets the empty state, not an error |
| UC-SHLF-parent-view-shelf 2b | integration | When the catalog read fails, the page shows the retry screen and no shelf entries |
| UC-SHLF-parent-view-shelf 2c | integration | A parent requesting another family's child, or a child ID that does not exist, gets the same `404` and no shelf data |
| UC-SHLF-parent-view-shelf 5a, awaiting | integration | A Finished entry with no confirmation record shows "Confirm finished" and no rating |
| UC-SHLF-parent-view-shelf 5a, confirmed in Finished | integration | A confirmed Finished entry shows the confirmed-finished icon, "Edit note", and its rating if there is one |
| UC-SHLF-parent-view-shelf 5a, confirmed in another category | integration | A confirmed book the child moved to Reading Now, Want to Read or Maybe Later still shows the icon and "Edit note", and its rating if there is one |
| UC-SHLF-parent-view-shelf 5a, unconfirmed elsewhere | integration | An entry outside Finished with no confirmation record shows neither "Confirm finished" nor "Edit note" |
| UC-SHLF-parent-view-shelf 5b | integration | After a block removes the entries, the book does not appear on the shelf, and the parent gets no notice |
| Removed or blocked book | integration | A rating and confirmation kept after the entry was removed, or the book blocked, do not appear in this view, and appear again if the book is added back |
| Authorization | integration | A child session and an admin session both get the `404` and receive no shelf data; with no session, the redirect to `/sign-in` |
| UC-SHLF-parent-view-shelf 5, links out | component | The selected book offers "Remove from shelf" and "Report", plus "Confirm finished" on a Finished entry with no confirmation or "Edit note" on a confirmed one, each linking to the path in the table with the child and book IDs, and none of them writes |
| UC-SHLF-parent-view-shelf payload | integration | The view handed to the client holds only `bookId`, `title`, `coverUrl`, `category`, `confirmed` and `rating` per entry, and no dates, `childId` or confirming parent |
| UC-SHLF-parent-view-shelf 2c, one response | integration | Another family's child, an unknown ID, a malformed ID, a child or admin session, and a parent with no children all get the same `404` page |
| UC-SHLF-parent-view-shelf 2b, thrown errors | integration | An error thrown by the session, family or Catalog read shows the retry screen with no shelf; a Catalog result with fewer books than entries does not |
| UC-SHLF-parent-view-shelf 2c, malformed ID | integration | A malformed `childId` gets the same `404` as another family's child |
| UC-SHLF-parent-view-shelf 5b, missing book | integration | When the Catalog returns fewer books than the entries, the missing entries are left out and the rest of the shelf is shown; when the Catalog throws, the retry screen shows (2b) |
| UC-SHLF-parent-view-shelf 4, selection | component | Selecting a book makes no request and changes no URL; the rating and controls shown are those already loaded |
| UC-SHLF-parent-view-shelf 5, rating rule | integration | A rating row with no confirmation record is not shown; a rating with a confirmation record shows in any category |
| UC-SHLF-parent-view-shelf fresh read | integration | After a block or a parent removal, the next load omits the book (no cached shelf) |
| UC-SHLF-parent-view-shelf 1a, no children | integration | A Main Parent with no children is redirected to the add-a-child page; a Sub Parent sees the explanation message |

### UC-SHLF-kid-view-shelf

| Use case, flow | Level | Asserts |
|---|---|---|
| UC-SHLF-kid-view-shelf main | integration | A child sees only their own entries under the four categories in fixed order, most recently moved first, each with cover and title; a second child's entries do not appear |
| UC-SHLF-kid-view-shelf main, details | component | Selecting a book shows its cover, title, author and series name, and nothing else of the catalog (no reading level or tags) |
| UC-SHLF-kid-view-shelf main, own rating | integration | A rated book shows the child's own rating as a word on selection; a rating row with no confirmation record is not shown |
| UC-SHLF-kid-view-shelf main, no metrics | integration | The payload holds no count, total, date, `childId`, age, grade or reading level |
| UC-SHLF-kid-view-shelf 2a | integration | A child with no entries gets all four categories and the "find a book" flag, not an error |
| UC-SHLF-kid-view-shelf 3a | component | An empty category shows its heading and nothing else |
| UC-SHLF-kid-view-shelf 2b | integration | A failed read shows the retry screen and no entries, and an unseen notice is still unseen afterwards |
| UC-SHLF-kid-view-shelf 3b | integration | After a block removes the entries the book is gone on the next load, and the child gets no notice |
| UC-SHLF-kid-view-shelf 3c | integration | A Finished entry with no confirmation record is grayed, has no icon and no `rate` |
| UC-SHLF-kid-view-shelf 3d | integration | A pending finish notice shows once with the fixed wording and a second load does not show it; it names no parent |
| UC-SHLF-kid-view-shelf 3d, two loads | integration | Two loads that read the same unseen notice at once: exactly one shows it |
| UC-SHLF-kid-view-shelf 3c, actions | integration | An entry awaiting confirmation lists `move` and `remove` and no `rate` |
| UC-SHLF-kid-view-shelf 3e | component | "My Dashboard" links to `/child/dashboard` |
| UC-SHLF-kid-view-shelf 3f | integration | A pending removal notice shows once, with the book's title when the Catalog returns it and without it when not; the book is not on the shelf |
| UC-SHLF-kid-view-shelf 5, selection | component | Selecting a book makes no request and changes no URL |
| UC-SHLF-kid-view-shelf 5a | integration | A confirmed entry in any category has the icon and `rate`; an unconfirmed entry has neither |
| UC-SHLF-kid-view-shelf POST-2 | integration | Viewing changes no entry, rating or confirmation; only notices change, and only to seen |
| UC-SHLF-kid-view-shelf fresh read | integration | After a parent removal, the next load omits the book; nothing is cached |
| UC-SHLF-kid-view-shelf authorization | integration | No session redirects to `/child/sign-in`; a parent session and an admin session get `404`; no request can name another child |
| `/child` home | integration | A signed-in child sees only their nickname and avatar, "My Shelf" and "Sign out"; a parent session gets `404` |

### Supporting flows (`OI-46`): child sign-in and sign-out

| Flow | Level | Asserts |
|---|---|---|
| Sign-in main | integration | The right username and password create one session and one `childSignIns` record, set the cookie, and `requireChild()` then returns the child while `requireParent()` refuses it |
| Sign-in, case and spacing | integration | A username typed in other capitals than the stored one, and a password with a capital and a trailing space, both sign in |
| Sign-in, unknown or wrong | integration | An unknown username and a wrong password give the same code and message, and an unknown username creates no record |
| Sign-in, throttle | integration | Under a fixed clock, 3 wrong attempts are answered at once, the next attempt is refused with `TOO_MANY_ATTEMPTS` until 30 seconds pass, a wrong attempt after that makes the wait 60 seconds, and the wait doubles with each further wrong one up to the cap; unknown usernames are throttled the same way; a parent's email key is separate |
| Sign-in, other device | integration | While device A is waiting, the correct password from device B (a different token) signs in, and device A's wrong attempts do not change B's count |
| Sign-in, refused attempt | integration | An attempt during a wait is refused without checking the password and does not lengthen the wait or raise the count |
| Sign-in, decay | integration | Under a fixed clock, one wrong attempt is forgiven 30 minutes after the wait ends and not before; no attempt is forgiven while a wait is running; a record whose count reaches zero is gone |
| Sign-in, no lock | integration | After any number of wrong attempts and the wait, the right password signs in; no state needs a parent to clear it |
| Sign-in, count cleared | integration | A correct password clears that device's count, so the next wrong attempt starts again from zero |
| Sign-in, device token | unit | The stored throttle key holds a hash of the token, never the token; the token is absent from `childSignIns` |
| Sign-in, unavailable | integration | A child whose family's consent is revoked, or whose record is gone, with the right password gets `ACCOUNT_UNAVAILABLE`, no session and no sign-in record |
| Sign-in, atomic | integration | When creating the session fails, no `childSignIns` record exists |
| Sign-in, expiry | integration | Under a fixed clock, a session made at 3 pm expires at the next midnight in the configured time zone; one made at 23:59 expires a minute later; after it, `requireChild()` returns `NOT_SIGNED_IN` even if the session document is still there; reading the session does not move `expires` |
| Sign-in, shared device | integration | Signing in as a child deletes the session the old cookie named |
| Sign-in, session contents | integration | The session `auth()` returns holds only the user ID |
| Sign-in, logging | unit | Nothing logged for a failed or refused sign-in contains the username, password or a session ID |
| Sign-out | integration | `signOutChild` deletes the caller's session document and clears the cookie; the old token fails `auth()`; other sessions are untouched |
| Child deletion | integration | Deleting the child (`UC-PAR-delete-kid-account`) removes the child's throttle state, sign-in records and sessions |
| Sign-in, end to end | e2e | A parent creates a child, the child signs in at `/child/sign-in`, opens My Shelf, taps a book and signs out; the cookie is httpOnly, Secure and SameSite=Lax |


## Changes to the architecture-of-record

- §5.2 Catalog: names the shelf read (`getBooksForShelf`) beside the two reads from `design/rec.md`, which share `src/server/catalog/books.ts`. Edited in `architectural-design.md` in this pull request.
- Revision history: a v0.12 row records `design/shlf.md`.

**Added for `UC-SHLF-kid-view-shelf` and child sign-in:**

- §8.1 Authentication: a new paragraph after the Authentication paragraph says a child signs in at their own page, with the parent's throttle and the child's numbers (`SEC-signin-throttling`, no lockout), a session that ends at the next midnight (`OI-48`), and that a suspended parent's children are suspended (`OI-47`). It is a separate paragraph so it does not collide with the sentence edits of pull request #98.
- §5.2 Catalog: `getBooksForShelf` also returns the author and series name, for the child's book details.
- §5.2 Notification: the child's reads, `peekUnseenChildNotices` and `markNoticesSeen`.
- §5.2 Identity & Access: names the child sign-in record and the child's sign-in attempts. Revision history: a v0.15 row.


## Open questions & risks

- **No dashboard to tap "View Shelf" from yet (team).** The use case triggers from a child's dashboard, which no design or code provides. Until it exists, the entry is the `/parent/shelf` picker. Confirm which design owns the dashboard and its link.
- **Link targets in other designs (team).** The paths for "Confirm finished", "Edit note", "Remove from shelf" and "Report" are proposed here. When the designs of `UC-SHLF-par-finish-book`, `UC-SHLF-parent-remove-book` and `UC-PAR-report-book` are written they adopt the paths or change this table in the same pull request. Until their pages are built the controls would lead nowhere, so the implementation of this view may land the controls together with those pages.
- **Rating visibility (client, `OI-41`).** This design shows a rating on any entry still on the shelf and hides it once the entry is removed or the book is blocked. Both are team proposals written into the use case and not yet confirmed by the client; if the client wants otherwise, the rating rule and its tests change.
- **Sub Parent access (client, `OI-25`).** The team decision, awaiting the client, is that a Sub Parent has the same access to linked children as the Main Parent, so this view gives a Sub Parent the same shelf. If the client limits it, the check in the page changes.
- **Seeing move history (client).** The use case leaves open whether a parent sees when a book moved. This design shows only the current category. If history is wanted, it needs its own records, which nothing writes today.
- **Parent dashboards and the no-metrics rule (client, `OI-31`).** This view shows no counts or totals. If the client wants totals, `BR-kid-no-metrics` and the use case assumption change together.
- **Accepted risk: shelf size.** Loading the whole shelf at once assumes a shelf stays small. The seed catalog is 134 books (`SI-book-dataset`) and a shelf holds only what a child added; if the catalog or shelves grow far past that, revisit the single load.
- **Suspended or deleted children.** The data model has no suspended state yet; a deleted child is simply not found (`404`). Revisit when `UC-PAR-delete-kid-account` is designed.


**For `UC-SHLF-kid-view-shelf` and child sign-in** (decisions the developer gave on 2026-11-19 are recorded as such; each open item also has a row in `OPEN-ISSUES.md`):

- **No use case for child sign-in or the home screen (team, `OI-46`).** Designed here as supporting flows. If the team writes a use case, `/implement` should follow it and this section moves under it.
- **A suspended parent's children (team, `OI-47`).** The check lives in `childMaySignIn`. `UC-ADM-suspend-parent-account` and `UC-ADM-reinstate-account` do not yet say it, or which parent counts, or whether children return on reinstatement. Their designs extend `childMaySignIn` and end the children's sessions.
- **The time zone of midnight (team, `OI-48`).** One configured zone for every child. A family in another zone would be signed out at the wrong local hour.
- **Wording of the removal notice (client).** `UC-SHLF-parent-remove-book` leaves it TBD; the child's shelf shows whatever that design fixes.
- **Book details set (team).** Cover, title, author and series name, a team proposal now written into the use case's Associated Information. If the client wants more (a description, for example), the Catalog read and the payload change together.
- **Child-facing paths (team).** `/child`, `/child/shelf`, `/child/sign-in` and the link-out paths are proposals the other child use cases adopt or change.
- **Throttle per device (team, `OI-49`).** Developer's decision, 2026-11-19: the count belongs to a device so no one can lock a child out remotely. A guesser who drops the `child_device` token on every attempt is not slowed. Whether to add a backstop, and whether the token is acceptable under `DI-usage-records` and `BR-coppa-minimization`, are open; the 30-day token lifetime is a proposal.
- **Username uniqueness (team).** `UC-PAR-create-kid-account` 4g must treat usernames that differ only in capitals as taken. Its design owns the check.
- **`UC-SHLF-par-finish-book` design (team).** Its save must be conditional on the entry still awaiting confirmation and must show the parent the cancelled-request message (its extension 1a, edited in this pull request).
- **Auth.js sliding expiry (risk).** The expiry rule depends on Auth.js not extending a database session. It must be tested against the installed version before anyone relies on it (`SI-auth-sessions`).
- **Open pull requests this document relies on.** #98 (`createDatabaseSession`, `signOutParent`), #102 (the same design, with `OI-44` for `OI-41`), #104 (`deleteChildSignIn`) and #100 (the ADM design). If one is rejected or reworked, the cited piece changes here. Open issue numbers: `main` ends at `OI-41` and the open pull requests reach `OI-45` (#102), so this document uses `OI-46` to `OI-48`. Two pairs of open pull requests already collide on a number (`OI-42` in #98 and #100, `OI-43` in #100 and #104) and are theirs to renumber.
