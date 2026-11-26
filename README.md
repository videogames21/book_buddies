# BookBuddies

Child account creation follows [design/par.md](design/par.md) from PR #56 and uses the development checks from PR #57.

## Local development

### Run a demo

Use **Node.js 24 or newer**, npm and Git. If you use nvm, `nvm install` and
`nvm use` select the version in `.nvmrc`. No MongoDB account, API keys or
`.env.local` file are needed. To read the emails sign-up and password reset send,
also run Mailpit, which needs Docker (see below).

```sh
git clone https://github.com/videogames21/book_buddies.git
cd book_buddies
npm ci
npm run demo
```

If you already have the project, run `npm ci` and `npm run demo` from its folder.

Wait for **BookBuddies demo: http://localhost:3000** and open that URL on the same
computer. The terminal prints two invented accounts:

| Account     | Email                      | Password                  |
| ----------- | -------------------------- | ------------------------- |
| Main Parent | `demo-parent@example.test` | `demo-password-123`       |
| Admin       | `demo-admin@example.test`  | `demo-admin-password-123` |

Keep the terminal running during the demo. The runner builds and starts Next.js and
a temporary local MongoDB replica set, loads the client's seed catalog, and creates
the Main Parent (consent already confirmed, no child yet) and the admin. The first
run may download MongoDB's official binary, so keep an internet connection.

#### Email in the demo

Sign-up and password reset send email. By default the demo sends it to Mailpit on
this computer, and nothing leaves the machine. Start Mailpit in a second terminal
before you sign up, then read the emails at <http://localhost:8025>:

```sh
docker run -p 1025:1025 -p 8025:8025 axllent/mailpit:v1.33.1
```

Without Mailpit, sign-up still creates the account, and the "check your email" page
says the email could not be sent and offers **Send it again**.

To deliver real email through Resend instead, put
`DEMO_SMTP_URL=smtps://resend:<API key>@smtp.resend.com:465` and `DEMO_MAIL_FROM`
in your untracked `.env` or `.env.local` (Git ignores both; a shell variable of the
same name wins). The demo reads only these two keys from those files. Resend's test
sender `BookBuddies <onboarding@resend.dev>` delivers only to the address that owns
the Resend account. Never put a key in a tracked file.

#### Walkthrough

**Add a child (no email needed).**

1. Sign in as the Main Parent. A parent with no child yet goes straight to the child
   form.
2. On the empty form, select **Create account** to show the validation messages.
3. Fill the invented sample below and select a character.
4. Select **Create account**. Show the **Account created** screen and its generated
   username and password. The password appears only once.
5. Continue to the reading profile (interests and favorite books from the catalog),
   then to **Onboarding complete**.
6. To sign in as that child, open `/child/sign-in` and type the username and
   password from step 4. This ends the parent's session in that browser.

| Field         | Sample value                               |
| ------------- | ------------------------------------------ |
| Nickname      | `Starfish`                                 |
| Age           | `8`                                        |
| Grade         | Grade 3                                    |
| Username      | `moon_reader_01`                           |
| Reading level | Skip it, or choose Lexile and enter `650L` |
| Parent note   | `Likes moon stories.`                      |
| Character     | Any provided character                     |

A second child needs a different username, such as `moon_reader_02`.

**Sign up a new parent (needs Mailpit).**

1. Select **Sign out** at the top of any parent page.
2. On the sign-in page, follow **Create Account**. Enter an invented name, email
   and password, read the consent notice, tick the box and create the account.
3. The "check your email" page appears. Open the email in Mailpit, follow its link
   and press **Confirm**.
4. Sign in with the new account. It goes to the child form, as in step 1 above.

**Reset a password (needs Mailpit).** On the sign-in page, follow **Forgot
password?**, enter a Main Parent's email, open the reset email in Mailpit and choose a
new password. Every session of that parent is signed out.

**Admin catalog.** Sign in as the admin on the same sign-in page to open
`/admin/catalog`. This shared sign-in page is temporary (`OI-61`).

The parent dashboard, recommendations and shelves are not built yet.

#### Stop and restart

Press Ctrl+C to stop and remove the temporary data. Running `npm run demo` again
starts a fresh family. If port 3000 is occupied, use this command on macOS, Windows
or Linux, then open the printed URL:

```sh
npm run demo -- --port 3200
```

The `DEMO_PORT` environment variable also works. The server binds to loopback only.
Each teammate runs the demo on their own computer. The demo never uses a configured
external database. Use invented data only.

The demo serves the production build, so file watchers and hot reloading do not
run during a presentation. Startup rebuilds the current code automatically.

#### Troubleshooting

| Symptom                                             | What to do                                                                                                         |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Node version or engine error                        | Run `node --version`; install Node 24+, then run `npm ci` again.                                                   |
| Port already in use                                 | Stop your other demo/dev terminal, or use `npm run demo -- --port 3200`.                                           |
| MongoDB binary download fails                       | Reconnect to the internet and rerun. Linux may also need the system libraries named in the download/startup error. |
| "The email could not be sent"                       | Start Mailpit (above), then select **Send it again**.                                                              |
| No email in Mailpit                                 | Check that Mailpit was started with port 1025 published, then send the email again.                                |
| The form redirects to sign-in or has an old session | Sign in again with an account printed in the terminal.                                                             |
| Build lock or missing build                         | Stop `npm run dev` in this checkout, then rerun `npm run demo`.                                                    |
| A username or email is already taken                | Pick another one, or stop and restart for fresh sample data.                                                       |

### Configure normal development

Use Node.js 24 or newer and a MongoDB replica set (transactions require a replica set).

```sh
npm ci
cp .env.example .env.local
# Fill the local database URI and Auth.js secret in .env.local.
npm run db:setup
npm run dev
```

A parent starts at `/sign-in`, follows "Create Account" to `/sign-up`, and confirms consent from the emailed link (`UC-PAR-onboarding`). In development the email goes to Mailpit (`docker run -p 1025:1025 -p 8025:8025 axllent/mailpit:v1.33.1`, inbox at <http://localhost:8025>). For real delivery from the demo, see [Email in the demo](#email-in-the-demo). Child creation lives at `/parent/children/new` and requires a Main Parent session and a confirmed, non-revoked family consent record. There is no development authentication bypass in the application. Automated tests seed invented parent accounts and Auth.js database sessions in temporary databases.

The client must supply `PRIVACY_NOTICE_URL` before production use. Development falls back to an explicitly unfinished notice page. The FTC rule is not presented as BookBuddies' privacy notice.

## Verification

```sh
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run test:demo
```

`npm run test:unit`, `npm run test:integration` and `npm run test:infrastructure`
run those suites separately. Integration tests start a temporary MongoDB replica
set; the first run may download MongoDB's official binary. Playwright starts the
production build on port 3100 with its own replica set. It never connects to the
database in `.env.local`. Build before running Playwright, and start Mailpit on
ports 1025 and 8025 first: the onboarding tests read the emails back from it. Node's `react-server`
condition permits test fixtures to call the same component-owned schema setup
as the application.

`npm run test:demo` launches the real demo with temporary ports, checks the start
page, session handoff and authenticated form, then stops it and checks that both
ports were released. It also verifies the demo ignores a deliberately unusable
external database setting. Run checks and the demo at different times or in
separate checkouts because they share the build directory.

## Review and release dependencies

The [review notes](docs/implementation/child-account.md) list settings and test coverage. Before release, the team must approve the field values, avatar set and moderation word list, supply the privacy notice, and finish the consent notice's legal review (`OI-20`, `OI-21`). The reading-interest form (`/parent/children/[childId]/reading-profile`) is built; its book picker lists only active catalog books, so it is empty until the catalog import exists (`UC-ADM-add-content`). Its privacy notice paragraph is a placeholder that links to the same notice as the Add a child form.

## Child data inventory

| Store                       | Contents                                                                            | Access                                                             |
| --------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `children`                  | Random UUID, family ID, nickname, provided avatar key, creation time                | Family-scoped parent summary; no identifying details               |
| `childIdentities`           | Child UUID, age, grade, optional parent-entered reading scale/value, creation time  | Insert only in Child Identity Store                                |
| `users` (child credentials) | Child UUID, username, salted scrypt hash, role, creation time                       | Identity & Access; plaintext password returned once                |
| `parentNotes`               | Child UUID, optional trimmed note, screening state, save time                       | Accounts & Family insert only; never returned to child/admin       |
| `noteFlags`                 | Note/child IDs, categories, character offsets, detector method/version, state, time | Safety Flagging insert only; no duplicated note text               |
| `auditLog`                  | Actor/record/child IDs, event/role, time                                            | Append only; no child details or note text                         |
| `readingProfiles`           | Child UUID, reading interests (fixed list), favorite catalog book IDs, save time    | Recommendation only; parent-entered; never returned to child/admin |
| `bookReports`               | Child UUID, book ID, reporting parent's user ID, reason (fixed list), optional comment (at most 250 characters, `OI-55`), status, report time | Accounts & Family; admin sees open reports by opaque reference only (`UC-ADM-block-content`); never returned to the child; comment never logged |
| `childBookExclusions`       | Child UUID, book ID, report ID, creation time                                       | Accounts & Family; Recommendation and search read book IDs only (`KD-book-exclusion`); no undo |
| `childNotices`              | Child UUID, notice kind, book ID, creation and seen times                           | Notification; shown to the child; no reason and no parent (§8.2.11) |
| `childSessionEnds`          | Session record ID, next-midnight end time, last-seen time, last-activity time       | Identity & Access only, to end a child's session; never logged     |
| `childSignIns`              | Child UUID, sign-in time; no IP address, device ID or session length | Identity & Access, one per successful sign-in; for the usage measures and the admin's lookup by child ID, not yet built. Deleted with the child account |
| `signInAttempts` (child keys) | Username with `shared` or a hash of a device ID, failure count, wait times | Identity & Access; never logged. Removed by a correct password, or by the daily cleanup once every failure is forgiven |
| `child_device` cookie (on the child's device, not stored) | Random device ID, child UUID and expiry for up to four children, signed | Used only to count wrong passwords; 30 days from the last sign-in (`OI-49`) |
| `recommendationReactions`   | Child UUID, book ID, reaction (fixed list), optional decline reason (fixed list), batch IDs, reaction time; no name or free text | Recommendation; the child's own list, the parent's review and export (`UC-PAR-review-child-data`) and the quiz's signal read. Kept while the account is active; deleted with the child account, by `UC-PAR-delete-child-data` and by the inactivity purge (`BR-coppa-retention`, `OI-22`) |

A `childSessionEnds` record holds no name, username or child ID, and links to the child only through its session. It is deleted with the session: at sign-out, or when a session that is over is refused. The daily cleanup deletes ended sessions and any record whose session is already gone.

Child sign-in needs `CHILD_SESSION_TIME_ZONE` (such as `America/Chicago`) and `CHILD_DEVICE_SECRET` (a random secret of at least 32 characters, never committed). Neither has a default; the demo sets both.

No real name or uploaded photograph is collected or stored. One transaction covers child, identity, credentials, note, flag and audit. No child data or notes are sent to external screening services. Legal notices, retention/deletion workflows and audited admin flag review are owned by their separate use cases.

## Parent data inventory

| Store                 | Contents                                                                                              | Access                                                      | Kept until                                                                               |
| --------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `users` (Main Parent) | Name, lowercased email, salted scrypt hash, role, family ID                                           | Identity & Access; never logged                             | Deleted if consent is not confirmed in time (`OI-22`)                                    |
| `consentRecords`      | Family and parent IDs, notice version, method, acknowledged, deadline and confirmed times, token hash | Accounts & Family; the plaintext token is only in the email | Deleted with an unconfirmed account; otherwise while a child exists                      |
| `sessions`            | Random session token, user ID, expiry                                                                 | Identity & Access and Auth.js                               | Expiry, sign-out or account deletion                                                     |
| `signInAttempts`      | Lowercased email as the throttle key, failure count, wait times                                       | Identity & Access; never logged                             | 24 hours after the last wait, or a successful sign-in                                    |
| `passwordResets`      | User ID, reset token hash, issue and expiry times                                                     | Identity & Access; the plaintext token is only in the email | Used, replaced, one hour after issue (the daily cleanup deletes it), or account deletion |

Service providers: Vercel hosts the app and MongoDB Atlas stores the data. Resend sends account emails and receives only a parent's name, email address and the email's content, never child data. Written assurances from each are still needed before launch (`BR-coppa-no-third-party-disclosure`). The consent notice is placeholder wording until legal review (`OI-20`, `OI-21`).
