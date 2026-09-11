# BookBuddies Client Interview Notes

## App Overview and Purpose

- BookBuddies is a book discovery and tracking app for elementary-aged kids ages 6-11.
- The core problem is finding books kids actually love, not just books that are age-appropriate.
- The app is kid-powered but adult-monitored.
- It is not an e-reader; it focuses on recommendation, tracking, and social sharing.

## Core Features

- Home page: “What should I read?” with genre and mood options, peer picks, and AI-powered recommendations.
- Shelf: kids can archive books they want to read, have read, or want to recommend.
- Peer feed: users can see what friends and classmates are reading.
- Manual search: word-based search, which is more relevant for older kids.
- Picture-based quiz: runs every time a kid wants a new recommendation, not just during onboarding.
- Ratings: stars, emoji, and comments per book; community aggregate ratings are visible across users.
- Groups: user-initiated reading communities of 2-20 kids, not teacher-imposed; groups may be class-based or friend-based.
- “Stretch My Reader”: optional level-up prompts on weekly or monthly achievement pages.
  - Suggests higher reading level books when a milestone is hit.
  - Kids can opt in; it is not automatic.

## Reading Level and Onboarding

- Seed library: 30-50 elementary-level books across genres such as adventure, comics, and graphic novels.
- These books would be sourced through Google Books or a similar service.
- Reading level baseline: an online reading test at account creation, not a self-reported field.
  - Some schools do not test until 2nd or 3rd grade, so an in-app baseline is valuable.
- AI can analyze comments and ratings to refine recommendations over time.
- Achievement pages (weekly/monthly): track books read, genres, and reading-level progress in a Duolingo-style engagement model.

## Parental Controls, Privacy, and Account Structure

- A parent account is linked to a child account; the parent likely creates the account first.
- Kids use anonymous profiles with nicknames and character avatars, without real identifiers.
- Accounts are linked via email, preferred over phone numbers for easier data collection.
- Parent privileges include:
  - Reviewing books read and comments posted.
  - Removing flagged words or content.
  - Reporting abuse or self-harm signals.
  - Having the final say on books, while not needing to approve every choice.
- There is a 24-hour review window in which the parent confirms they reviewed the activity; non-compliance temporarily suspends the account.
- This is intended to align with COPPA-adjacent compliance.
- The system admin should not be able to see personally identifiable information.
- Teachers are a future goal, but the current scope is parents only.
  - Teachers can flag content as age-inappropriate but cannot restrict books outright.
- Yang Yang will send notes on parent privilege details before the team’s Sunday meeting (5-9 PM).

## Next Steps

- Share the PowerPoint slides and the Shiny app demo link with the team (Yang Yang).
  - This gives the team a concrete reference for the original concept before beginning requirements work.
- Send parent control privilege notes before Sunday’s meeting (Yang Yang).
  - The team meets Sunday from 5-9 PM to discuss requirements; these notes will inform that session.
- Set up a dedicated Slack channel including Yang Yang.
  - Coordinate with Dr. Wei to get Yang Yang invited; email is the fallback in the meantime.
- Schedule recurring check-in meetings with Yang Yang.
  - A cadence has not yet been set; biweekly progress syncs are proposed.
