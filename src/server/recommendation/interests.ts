// The fixed reading-interest options a parent picks from (UC-REC-kid-onboarding step 2;
// no free text, BR-child-structured-responses). Team-editable: the values come from
// design/rec-field-values.md, and adding one is a one-line change here. Not
// `server-only`: the form and its schema read it too, and it holds no data.
export const INTEREST_OPTIONS = [
  { key: "realistic-fiction", label: "Everyday life stories" },
  { key: "fantasy", label: "Fantasy and magic" },
  { key: "animals", label: "Animal stories" },
  { key: "adventure", label: "Adventure" },
  { key: "mystery", label: "Mystery" },
  { key: "non-fiction", label: "True stories and facts" },
] as const;

export type InterestKey = (typeof INTEREST_OPTIONS)[number]["key"];

export const INTEREST_KEYS = INTEREST_OPTIONS.map((option) => option.key) as [
  InterestKey,
  ...InterestKey[],
];

const catalogKeysByInterest: Record<InterestKey, readonly string[]> = {
  "realistic-fiction": ["realistic fiction"],
  fantasy: ["fantasy"],
  animals: ["animal story", "animals"],
  adventure: ["adventure"],
  mystery: ["mystery"],
  "non-fiction": ["non-fiction"],
};

export function catalogKeysForInterest(key: InterestKey): readonly string[] {
  return catalogKeysByInterest[key];
}
