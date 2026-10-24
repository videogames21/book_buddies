# COPPA and BookBuddies: What It Means If You Take This Further

**For:** Dr. Yang Yang\
**From:** Grayson Whittingham\
**Date:** 2026-10-21\
**Notice:**  We are software students, not lawyers, so this is a plain-language briefing and not legal advice. Anything in it about the law should be checked with a lawyer.

---

## 1. The short version

You gave us the FTC's COPPA Rule, and we are building BookBuddies to meet it from the start. That protects you whichever way the project goes. The rule has no size limit. It does not matter whether five children use the app or five thousand. What matters is whether an organization that is covered by the rule collects personal information from children under 13.

While BookBuddies stays a small group, or just you, the day-to-day exposure is low and our design handles most of what the software can handle. The picture changes when the app is released publicly, when other people's children join, when child data goes to outside companies, when money is involved, or when someone other than you and the team has to run it. At that point a good deal of what is needed is not software at all. Someone has to be the legally responsible organization, someone has to write and publish the legal documents, and someone has to answer parents and keep the security work going year after year.

## 2. Who has to write the legal documents

This is the most important point in this briefing, so we put it first. **The privacy policy, the COPPA compliance policy, the data retention policy, the terms of use, and the parent consent wording must come from you, with the help of a lawyer.** The team cannot write them. We are students and software developers, and a privacy policy is a legal statement the responsible organization makes to the public. If it is wrong, or if it says something the app does not actually do, the organization that published it carries the consequences, and we are not in a position to carry or to judge them.

What the team can do is supply the facts a lawyer will need. We can give an accurate technical description of what the app collects from a parent and from a child, why each item is collected, where it is stored, who can see it, which outside services touch it, and how it is deleted. We can build the places in the app where these documents will appear and link to them: the notice a parent sees before consenting, the privacy link on the first screen and next to every place a child is asked for information, and the parent's tools to review and delete their child's information. Until the documents exist, the app will show clearly marked placeholders, and nothing in the app should be described as "COPPA compliant."

If BookBuddies stays a small private project, you can decide how much of this is needed. If you intend to release it to a broader audience, please plan to hire or consult a lawyer with children's-privacy experience before the first outside family signs up.

## 3. What COPPA is, in plain terms

COPPA is a U.S. federal law enforced by the Federal Trade Commission (FTC) through a rule, 16 CFR 312. The text you sent us is saved in the team's repository as `docs/coppa/coppa-full` (https://github.com/videogames21/book_buddies) and is also published at https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule. It applies to websites and apps directed to children under 13 that collect personal information from them. BookBuddies, with its audience of ages 6 to 11, is directed at children under 13.

In short, the rule requires verifiable parental consent before anything is collected from a child, clear notice to parents about what is collected and why, the right for parents to review and delete their child's information, collection limited to what is needed, retention limits with a written schedule, and a security program. Sharing a child's data with outside companies for anything beyond running the service needs a separate parental yes.

The team is designing around these requirements from the start, so that the work does not have to be redone if the project grows.

## 4. Where you are now and where you might go

Today the project is probably at one of four stages, and what COPPA asks of you grows with each.

If it is just you and the team, testing with adult stand-ins, no real child is using the app and almost nothing is being collected from children, so there is little exposure. This is also the cheapest time to settle design choices.

If a small group of real children you know takes part, perhaps as a pilot or a study, the rule still applies when the organization behind the app is covered. Each child's parent has to give verifiable consent, and the notice, review, delete and retention rules apply from the first child. "Small and friendly" is not an exemption. If the project turns out not to be covered, it is still sensible to follow the same steps, because you asked for COPPA to be built in and because it is far cheaper to do this now than to add it later. If the pilot is also research, an ethics review is likely as well (section 6).

If the app is released publicly, everything above still holds, and real-world operation begins. Parent requests arrive from strangers, security incidents become possible, and regulators and app stores can notice you. A named organization must appear in the privacy notice with real contact details.

If the project grows into funding, charging, advertising, partnerships with schools, or a company taking it over, the legally responsible "operator" becomes a business, outside vendors multiply, the data becomes more valuable, and additional laws apply.

## 5. What it takes to run it, not just build it

Software handles part of this, and the rest is ongoing work by people. Somebody has to answer parent requests, which means confirming the requester really is the child's parent, showing them the data, and deleting it on request. Somebody has to run the security program the rule requires: a named person in charge, a risk assessment at least once a year, testing, and an annual review. Somebody has to collect written security assurances from the hosting company, the email service and any analytics or AI provider before they hold child data. Somebody has to keep the notices up to date and ask parents to consent again whenever what is collected, how it is used, or who receives it changes in a material way. Somebody has to make sure deletion actually happens on schedule under the written retention policy. The design will keep a record of each parent's consent, with the date, the method and the version of the notice shown. The rule does not list record keeping by name, but a record is how you show that consent was obtained. Finally, someone should know what to do if the data is ever exposed. That is not a COPPA requirement as such, but state breach laws and ordinary good practice call for it.

At the moment none of these has an owner once the team graduates, which is why question 1 in section 7 asks who will maintain BookBuddies after we finish. That is the single biggest gap between a project that works for a small group and one that can be released more widely.

## 6. Legal review

Before public deployment or real-child participation, legal review should address COPPA applicability, state privacy laws, research requirements, school-related requirements, ownership, licensing, and liability.

## 7. What we need from you so we can continue designing

Some design decisions are yours, not ours, and we cannot finish those parts of the design without an answer. For each question below we say what we will assume if we do not hear back, so work can continue, but we would much rather have your answer. Please reply in an email, and tell us if any question needs a conversation instead.

**Please reply as soon as possible.** 

**1. Your plans for releasing BookBuddies (`OI-20`, `OI-9`).** Do you intend to keep BookBuddies within a small group, or do you plan a broader release? If broader, who would be responsible for it? Once the team has finished, who will maintain BookBuddies, meaning who will host it and pay for the hosting, and who will take on the ongoing duties in section 5 (answering parent requests, running the security program, keeping vendor assurances and notices up to date, and making sure data is deleted on schedule)? *Without an answer, we will assume a small private group with no public release, and we will still build to the COPPA Rule so a wider release is possible later.* 

**2. Real child participants (`OI-13`).** Do you have, or can you arrange, access to real children for testing? If so, is the testing part of a research study that needs ethics review (for example by an IRB), and has that been sought? *Without an answer, we will assume testing uses adult stand-ins only, with no real children.*

**3. The child's real name (`OI-23`).** The notes from the second meeting say the system stores each child's real name so the platform can report to law enforcement when required. Is that still what you want? If so, what situation do you picture, and how long should the name be kept? The parent already supplies the name when creating the child's profile. *Without an answer, we will keep storing it as the notes say, show it to the admin only on the flag-review screen with every view recorded, and keep it out of all other admin views.* 

**4. Reporting flagged content to authorities (`OI-18`).** The 2026-09-24 notes say content showing violence or self-harm is reported to parents and authorities. Who do you mean by "authorities," who makes that report, and by what route? This is likely to need legal advice. *Without an answer, we will build alerts to the parent and the admin only, and no report to any outside party.* 

**5. What the admin can see (`OI-15`).** One line in the notes says the admin has access to personal data, and another says the admin sees only parent credentials and the number of child accounts. Which is right, and is it acceptable for the admin to see a child's flagged writing when reviewing a flag? *Without an answer, we will assume the admin sees no child details except in the flag-review screen, where every view is recorded.* 

**6. Detecting flagged content (`OI-19`).** Are you comfortable with a simple word list plus a human review at first, which keeps a child's writing inside the app, or do you want an outside automated service, which would mean sharing the text with another company? *Without an answer, we will assume a word list and human review.* 

**7. AI in the first version (`OI-2`).** Is rules-based recommendation, with AI added later, acceptable for the first release? If you want AI from the start, would you accept using an outside AI service, knowing it adds legal steps? *Without an answer, we will build rules-based recommendation entirely inside the app.* 

**8. Reflections in the child's own words.** Children currently write reflections in their own words. They can type anything, including a name or a school, so this is the place where personal information is most likely to slip in. Do reflections have to be free text, or could they be chosen from prompts or buttons, at least at first? *Without an answer, we will keep free text, visible only to the parent, with a short warning to the child not to type names or places.* 

**9. How long to keep data (`OI-22`).** For how long after a child stops using the app should their data be kept before it is deleted automatically, and how many days should a parent have to confirm consent before an unconfirmed account is removed? The rule requires a written limit but does not give a number. *Without an answer, we will use placeholder values of 12 months of inactivity and 14 days for consent confirmation, clearly marked as placeholders for the lawyer to set.* 

**10. The 24-hour parent review (`OI-16`).** Does the rule that a parent must confirm review within 24 hours, or the child's account is suspended, still apply? It is not a COPPA requirement, but it changes the design. *Without an answer, we will build the parent's review screen and leave the 24-hour confirmation and suspension out of the first build, designed so it can be added later and not dropped.* 

**11. The book dataset (`OI-1`).** You have pointed us toward a pre-tagged children's-book dataset from Kaggle or GitHub. Can you confirm which one, or approve one we propose? We will check its licence before using it. *Without an answer, we will use a small hand-prepared sample catalog for development.* 

**12. Expected size (`OI-12`).** Roughly how many families do you expect in the first year? *Without an answer, we will size for a few dozen families.* 

**13. Consent method (`OI-21`).** Our plan is for the parent to tick the consent box and then confirm through a link in an email, with a way to revoke later. This works only while no child data goes to third parties. Are you comfortable with that approach for now? *Without an answer, we will build it this way.* 

**14. How success is measured (`OI-11`).** The project's goals, such as children engaging with books, recommendations being relevant, and parents finding oversight easy, do not yet have numbers attached. What would you count as success? Some measures, such as how often a child returns or how many books reach the shelf, need information about children, and the rule lets us collect only what is reasonably necessary. Would totals across all families be enough, or do you need figures for individual children? *Without an answer, we will leave the targets open and collect only totals that do not identify a child.*

## 8. What the team is doing in the meantime

We are building to the COPPA Rule from the start (see `docs/coppa/coppa-design-requirements.md`), which in short means a parent account and verified consent before any child data is collected, no release of child data to third parties, collecting only what is needed, a retention schedule, and a security plan. We are keeping these open issues visible in `OPEN-ISSUES.md`. We are not claiming that BookBuddies is "COPPA compliant," because that would need legal review. We are building to the rule, not certifying that we meet it.
