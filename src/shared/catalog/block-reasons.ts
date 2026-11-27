export const BLOCK_REASONS = [
  "age-inappropriate",
  "content concern",
  "data error",
  "other",
] as const;

export type BlockReason = (typeof BLOCK_REASONS)[number];
