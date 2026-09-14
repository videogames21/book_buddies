Book Buddies Project 9-12-2026\
Sent and Created by Yang Yang\
Transcribed to Markdown by Grayson Whittingham

# Book Buddies Project
## Seed catalog
Seed catalog of 30-50 books across Genre, mood, reading challenge, themes\
Tag every book across these domains in an excel sheet, verified by kid readers before launch (the excel sheet coming to the team soon)\

| Book domains                    | Values                                                            | Notes                                                                                                                                                                                                                                       |
|---------------------------------|-------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Genre                           | funny, mystery, adventure, animals, fantasy                       | Kid-facing                                                                                                                                                                                                                                  |
| Mood                            | silly, heartwarming, exciting, spooky-but-safe                    | Kid-facing                                                                                                                                                                                                                                  |
| Format                          | comic/graphic novel, picture book, chapter book                   | Kid-facing                                                                                                                                                                                                                                  |
| Themes                          | friendship, courage, resilience, family, problem-solving, animals | Adult-facing. Some themes may be too abstract for kids (e.g., no 7-year-old kid would tap “I want a book about resilience today” But these themes would be helpful for parents to influence the book selection (see Adult Influence below). |
| Length                          | quick read, longer story                                          | Kid-facing                                                                                                                                                                                                                                  |                                                                                                                                                                                                                                 
| Age/interested                  | fit Age band(s) e.g., 6-8, 7-10, 9-12 | Kid-facing, Adult-facing |
| Reading level/reading challenge | Pull Lexile or Accelerated Reader (AR) levels from sources like Scholastic Book Wizard or the publisher | Kid-facing & Adult-facing. This pertains to the 'Stretch My Reader' logic, which powers the advanced-reader. |
Note: Info sourcing: Book title and cover; Use copyright-free resources like: Google Books API, Open
Library, or a licensed provider like Bowker/Ingram
## Recommender
Start with rule-based recommendation 🡪 transition to ML based\
\
**Stage 1**: rules only. Filters the seed catalog by mood and length, computing scores (based on rules), and returns the top 5.\
**Stage 2**: rules narrow, a ML model ranks. The rules engine still filters down to a reasonable candidate set of books (e.g., 15-20 that possibly fit). Then, a ML model re-ranks or reorders based on what similar kids* saved, looked, and recommended, and re-ordered the same candidate list.\
**Stage 3**: ML does more of the matching itself. Eventually the model can start finding non-obvious matches the tags never captured. For example, a kid who loved this funny book also loved this mystery book. At the same time, still keeps safety filtering (e.g., age-appropriateness).\
\
**Definition of Similar kids (similarity): Similarity is based on behaviors which books they tend to save, love, and recommend, not on age, location, or other demographic traits.\

Similarity computation based on signal and weights:\
saved (+), loved it (++), rated highly (++), recommended to a peer (+++), skipped/ignored (-).\
\
Similarity can be computed anonymously across the whole platform (anyone who registered the APP) because the computation is purely based on behaviors. Buddy Picks stay visible only within a child’s adult-approved group. This creates 2 types of boundaries.\
**Data boundary**: what the model is allowed to learn from.\
● For example, a kid in Texas can quietly change recommendations for a kid in CA without either ever knowing the other exists.\
**Social boundary**: who sees whose name.\
● For example, Leo only sees Jane’s picks if Leo’s mom has approved Jane’s group and Jane’s mom has approved her picks being visible to buddies.\

## Adult-facing profile:
### Account and Access Management
● Create and manage child profiles (name, age, grade, avatar)\
● Create a family or classroom reading group: the container defines who a child’s buddy picks feed can include\
● Approve group participation: every member added to a group requires adult approval; kids never add connections themselves\
● Group management: Toggle Sharing — When [Child] recommends a book to their group: Share with my name; Share anonymously
### Reading profile (private, per child)
● Add reading level: Lexile/AR or similar, this feeds the “reading ability” side of the recommender\
● Add parent/teacher comments: free-text from an adult and being used to influence the “appearance” of the books for kids to pick\
● Add suggested books or series: specific titles a parent/teacher wants surfaced\
● Add growth/challenge area: nudge advanced readers by suggesting a book title or a theme.\
● Toggle Stretch My Reader: intentionally “bias” results toward more challenging yet appropriate books (e.g., +1 level)\
● Group management Oversight & Visibility\
● View the child’s shelf: what they’ve saved, are reading, and loved\
● View the child’s recommendations: what they’ve rated/recommended to whom\
● See what a recommendation led to: whether a buddy’s pick got saved and whether a parent’s suggestion get “accepted” by their kid.\
● Optional function: Weekly Recap (a snapshot, not a summary)\
o Short, specific, low-pressure. The point is "what caught her attention this week," not "how did she perform this week."\
o This week, Jane —\
▪ Saved Moon Mystery and a raccoon-adventure book\
▪ Loved The Bad Guys — rated it 5 stars, "It is really funny"\
▪ Recommended The Bad Guys to Leo\
● Optional function: Monthly Recap (the arc, not the average)\
o This is where it earns the "reflection and connection" positioning, where the richest material was in a narrative reflection, not a tally.\
o This month, Jane has been into: funny books and mysteries, mostly quick reads\
▪ A moment worth noticing: she recommended two books to Leo — the first times she's shared something she read\
▪ New this month: her first "Loved It" for an adventure book, a genre she hadn't picked before
### Direct Action
● Suggest a book to the child: Adults-initiated push to add a book into their results and shelf, independent of the recommendation (similar to an algorithmic boost).
### What’s not included in adult-facing profile
● No open messaging with the child or other adults\
● No public profile for the child\
● No detailed reading analytics or assessment feedback due to COPPA-compliant concerns. Every data point collected (e.g., time spent reading, pages completed, frequency patterns) is closely COPPA surface area — more to secure, more to justify, more that could later be repurposed in ways a parent didn't expect.\
● For the weekly and monthly recap functions in “Oversight & Visibility” section:\
o No data collection on “# days active,” no comparison to other kids or to past-self\
o No visual charts or progress bars. No summary of the past reading behaviors.\
o Keep the weekly and monthly recap qualitative.\
\
Additional thing – Adult Influence: Adults can influence the book selection by adding a private about the
child. For example, parents want to children to read a book about resilience. They add such as note in
adult-facing profile. This note doesn’t change what the child can see on screen. The kid still picks a book
based on the “mood” and length criteria. The kid never sees the word “resilience” and they just notice
some new books pop up on their catalog. The parents can later check the dashboard and see if the kid
loved and/or saved the book.

| Adult Influence                            | |
|--------------------------------------------|---|
| Add reading information                    | “Building confidence trying new things”|
| View the child’s shelf and recommendations | Has my child saved or loved a book about confidence?|
| Suggest a book to the child (hand-pick)    | Recommend this book titled “The Very Child“ |

## Kid-facing profile:
Profile management: avatar, color, name, display name, etc.\
Reading identity: badges as who are you (Jane is a mystery finder, instead of Jane read 4/10 mystery books)\
Whether to show that someone acted on their recommendation: no/
● No reading streaks or "days active"/
● No book count or pages-read total/
● No reading level shown to the child (that stays a private adult-side input)/
● No comparison to other kids — no leaderboards, no "top recommenders"/
● No messaging with others/
## Gamification Badge
Note to the CS team: Design is still forming/underway./
(based on the breath/exploration, taste/affinity), and generosity/contribution):\

| Badge                 | Goal                                               |
|-----------------------|----------------------------------------------------|
| Mystery Fan           | Loved 2+ mystery books                             |
| Great Recommender     | A recommendation of theirs was saved by another kid |
| Detective In Training | Loved 2+ detective books                           |
|Book Explorer| Tried a new theme, format, genre outside their usual pattern|
|Genre Explorer| Has tried a wide spread (e.g., 3+ types) across different types of books, themes, genres|
|Comic Fan |Loved 2+ comic-format books|