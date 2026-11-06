// Source: the "Grades" table in design/par-field-values.md (developer, 2026-11-05).

export const GRADES = [
  "pre-school",
  "kindergarten",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
] as const;

export type Grade = (typeof GRADES)[number];
