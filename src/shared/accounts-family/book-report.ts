// The book report's fixed values (UC-PAR-report-book step 3), from
// design/par-field-values.md, "Book report". Pure: the form, the action's zod schema and
// the `bookReports` validator all read these, so a changed value changes in one place.

/** The reasons a parent may give, in the order the form shows them (team list, `OI-52`). */
export const REPORT_REASONS = [
  "inappropriate-content",
  "too-difficult",
  "not-interested",
  "other",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  "inappropriate-content": "Inappropriate content",
  "too-difficult": "Too difficult",
  "not-interested": "Not interested",
  other: "Other",
};

/** The comment's maximum length after trimming: provisional until the client answers `OI-55`. */
export const REPORT_COMMENT_MAX_LENGTH = 250;
