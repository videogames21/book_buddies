# BookBuddies v0.1.0

The first tagged release. It is an early version for review with invented data, not for real families or children.

## What you can do

**Parent**

- Create an account, read the consent notice, and confirm consent from an emailed link. An account that is never confirmed is deleted after the waiting period (14 days is a placeholder).
- Sign in, sign out, and reset a forgotten password by email.
- Add a child with a nickname, age, grade, character, username, and optionally a reading level and a note. The password is generated and shown once. No real name is asked for.
- Record the child's reading interests and favorite books.
- View a child's shelf and ratings.

**Admin**

- Add a book to the catalog.

The main piece of this release is adding a child (`UC-PAR-create-kid-account`). It was built first because it carries the highest risk: it collects a child's information, which must stay private.

## Not in this release

- Children cannot sign in yet, so there is nothing for a child to use.
- No recommendations.
- Nothing adds books to a shelf yet, so a shelf shows as empty. The shelf page is at `/parent/shelf`; the parent home page does not link to it.
- The parent home page is a placeholder.
- Parents cannot yet report a book, export or delete a child's data, or revoke consent.

## Known limitations

- **Parent notes are not screened.** The word list is empty, so each note is recorded as "check not run".
- The privacy notice is a placeholder, and the consent notice wording has not had legal review.
- Field limits, the character set and the word list still need approval.
- The admin signs in through the parent sign-in page. This is a temporary arrangement for the demo and must not be used in production.
- A child's password cannot be reset.

## Try it

Needs Node.js 24 or newer and Git. Docker is needed to read the emails.

```sh
git clone https://github.com/videogames21/book_buddies.git
cd book_buddies
git switch --detach v0.1.0
npm ci
docker run -p 1025:1025 -p 8025:8025 axllent/mailpit:v1.33.1   # second terminal
npm run demo
```

Open <http://localhost:3000>. The terminal prints invented parent and admin accounts. Emails appear at <http://localhost:8025>. The [README](../../README.md#run-a-demo) has a walkthrough.
