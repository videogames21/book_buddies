export type ChildDataCategory = {
  key: string;
  label: string;
  purpose: string;
  records: ReadonlyArray<Record<string, unknown>>;
  notCollected?: boolean;
};

export type ChildDataSnapshot = {
  schemaVersion: 1;
  generatedAt: string;
  childId: string;
  categories: ChildDataCategory[];
};
