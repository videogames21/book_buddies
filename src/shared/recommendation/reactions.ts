// The child's reaction to a recommended book and the optional decline reason
// (UC-REC-kid-review steps 3 and 6; glossary "Recommendation Reaction" and "Decline
// Reason"). Shared by the reaction form, its zod schema and the collection validator, so
// the fixed lists are written once (BR-child-structured-responses).

export const REACTIONS = ["yes", "maybeLater", "notForMe"] as const;
export type Reaction = (typeof REACTIONS)[number];

export const DECLINE_REASONS = [
  "notInterested",
  "tooEasy",
  "tooHard",
  "notMyStyle",
  "other",
] as const;
export type DeclineReason = (typeof DECLINE_REASONS)[number];

export const REACTION_LABELS: Record<Reaction, string> = {
  yes: "Yes",
  maybeLater: "Maybe later",
  notForMe: "Not for me",
};

export const DECLINE_REASON_LABELS: Record<DeclineReason, string> = {
  notInterested: "Not interested in topic",
  tooEasy: "Too easy / too short",
  tooHard: "Too hard / too long",
  notMyStyle: "Not my style",
  other: "Other",
};
