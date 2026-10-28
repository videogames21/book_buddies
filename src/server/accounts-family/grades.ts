// The recognized school grades (UC-PAR-create-kid-account data table). Not
// `server-only`: the form and its schema read it too.
export const GRADES = ["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"] as const;

export type Grade = (typeof GRADES)[number];
