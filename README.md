# BookBuddies

Child account creation follows [design/par.md](design/par.md) from PR #56 and uses the development checks from PR #57.

## Local development

### Run a demo

Use **Node.js 24 or newer**, npm and Git. If you use nvm, `nvm install` and
`nvm use` select the version in `.nvmrc`. No Docker, MongoDB account, API keys or
`.env.local` file are needed for the demo.

To try this follow-up before it is merged, copy these commands into a terminal:

```sh
git clone --branch fix/67-review-demo --single-branch https://github.com/videogames21/book_buddies.git
cd book_buddies
npm ci
npm run demo
```

If you already checked out the branch containing this README, start from its
project folder:

```sh
npm ci
npm run demo
```

Wait for **BookBuddies demo: http://localhost:3001**, open that URL on the same
computer and select **Open demo**. Keep the terminal running during the demo.
The runner builds and starts Next.js
and a temporary local MongoDB replica set, creates an invented Main Parent with
confirmed consent, and opens the child form with a real database session. No
`.env.local`, MongoDB account or parent password is needed. The first run may
download MongoDB's official binary. Keep an internet connection for the initial
dependency and binary downloads; no external account is used.

#### Two-minute walkthrough

1. On the empty form, select **Create account** to show the validation messages.
2. Fill the invented sample below and select a character.
3. Select **Create account**. Show the **Account created** screen and its generated
   username and password. The password appears only once; write it down before
   leaving this screen.

| Field         | Sample value                               |
| ------------- | ------------------------------------------ |
| Nickname      | `Starfish`                                 |
| Age           | `8`                                        |
| Grade         | Grade 3                                    |
| Username      | `moon_reader_01`                           |
| Reading level | Skip it, or choose Lexile and enter `650L` |
| Parent note   | `Likes moon stories.`                      |
| Character     | Any provided character                     |

The working demo ends at **Account created**. Continuing opens an unfinished
reading-interest page. Parent sign-in, password reset, the parent dashboard
(including Cancel's destination), recommendations and shelves are separate,
unfinished features. A second creation needs a different username, such as
`moon_reader_02`, or restart the demo for a fresh family.

Press Ctrl+C to stop and remove the temporary data. Running `npm run demo` again
starts a fresh family. If ports 3000 or 3001 are occupied, use this command on
macOS, Windows or Linux, then open the printed URL (normally port 3201):

```sh
npm run demo -- --port 3200
```

`--launcher-port` overrides the start page's port independently. `DEMO_PORT` and
`DEMO_LAUNCHER_PORT` environment variables also work. Both servers bind to
loopback only. Each teammate runs the demo on their own computer. The separate demo
launcher never becomes an application route and never uses a configured external
database. Use invented data only.

The demo serves the production build, so file watchers and hot reloading do not
run during a presentation. Startup rebuilds the current code automatically.

#### Troubleshooting

| Symptom                                             | What to do                                                                                                         |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Node version or engine error                        | Run `node --version`; install Node 24+, then run `npm ci` again.                                                   |
| Port already in use                                 | Stop your other demo/dev terminal, or use `npm run demo -- --port 3200`.                                           |
| MongoDB binary download fails                       | Reconnect to the internet and rerun. Linux may also need the system libraries named in the download/startup error. |
| The form redirects to sign-in or has an old session | Reopen the printed launcher URL and select **Open demo**. Use it within four hours of starting.                    |
| Build lock or missing build                         | Stop `npm run dev` in this checkout, then rerun `npm run demo`.                                                    |
| A username is already taken                         | Pick another username or stop and restart for fresh sample data.                                                   |

### Configure normal development

Use Node.js 24 or newer and a MongoDB replica set (transactions require a replica set).

```sh
npm ci
cp .env.example .env.local
# Fill the local database URI and Auth.js secret in .env.local.
npm run db:setup
npm run dev
```

Child creation lives at `/parent/children/new`. It requires an existing Main Parent database session and a confirmed, non-revoked family consent record. Real parent sign-in/onboarding is a separate, unfinished use case; there is no development authentication bypass in the application. Automated tests seed invented parent accounts and Auth.js database sessions in temporary databases.

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
database in `.env.local`. Build before running Playwright. Node's `react-server`
condition permits test fixtures to call the same component-owned schema setup
as the application.

`npm run test:demo` launches the real demo with temporary ports, checks the start
page, session handoff and authenticated form, then stops it and checks that both
ports were released. It also verifies the demo ignores a deliberately unusable
external database setting. Run checks and the demo at different times or in
separate checkouts because they share the build directory.

## Review and release dependencies

The [review notes](docs/implementation/child-account.md) list settings and test coverage. Before release, the team must approve the field values, avatar set and moderation word list, supply the privacy notice, and implement parent sign-in and reading-interest onboarding. The current reading-interest page shows a pending message.

## Child data inventory

| Store                       | Contents                                                                            | Access                                                       |
| --------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `children`                  | Random UUID, family ID, nickname, provided avatar key, creation time                | Family-scoped parent summary; no identifying details         |
| `childIdentities`           | Child UUID, age, grade, optional parent-entered reading scale/value, creation time  | Insert only in Child Identity Store                          |
| `users` (child credentials) | Child UUID, username, salted scrypt hash, role, creation time                       | Identity & Access; plaintext password returned once          |
| `parentNotes`               | Child UUID, optional trimmed note, screening state, save time                       | Accounts & Family insert only; never returned to child/admin |
| `noteFlags`                 | Note/child IDs, categories, character offsets, detector method/version, state, time | Safety Flagging insert only; no duplicated note text         |
| `auditLog`                  | Actor/record/child IDs, event/role, time                                            | Append only; no child details or note text                   |

No real name or uploaded photograph is collected or stored. One transaction covers child, identity, credentials, note, flag and audit. No child data or notes are sent to external screening services. Legal notices, retention/deletion workflows and audited admin flag review are owned by their separate use cases.
