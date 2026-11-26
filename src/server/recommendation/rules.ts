import "server-only";
import type { Grade } from "@/server/accounts-family/grades";
import type { RuleCandidate } from "@/server/catalog/rule-candidates";

type BookLength = RuleCandidate["length"];
type ReadingScale = keyof RuleCandidate["comparableLevels"];

type ChildProfile = {
  readonly age: number;
  readonly grade: Grade;
  readonly level?: { readonly scale: ReadingScale; readonly value: number };
};

type InterestWeights = {
  readonly byTag: ReadonlyMap<string, number>;
  readonly byLength: ReadonlyMap<BookLength, number>;
  readonly declinedBookIds: ReadonlySet<string>;
};

const BATCH_LIMIT = 6;
const LEVEL_DISTANCE: Record<ReadingScale, number> = { lexile: 100, arAtos: 1 };

function gradeReferenceAge(grade: Grade): number {
  if (grade === "pre-school") return 4;
  if (grade === "kindergarten") return 5;
  return Number(grade) + 5;
}

function ageFit(book: RuleCandidate, referenceAge: number): number {
  const outside = Math.max(
    book.ageMin - referenceAge,
    referenceAge - book.ageMax,
    0,
  );
  if (outside === 0) return 2;
  if (outside <= 1) return 1;
  return 0;
}

function levelPoint(book: RuleCandidate, level: ChildProfile["level"]): number {
  if (!level) return 0;
  const bookLevel = book.comparableLevels[level.scale];
  if (bookLevel === undefined) return 0;

  const lower = Math.min(bookLevel, level.value);
  const higher = Math.max(bookLevel, level.value);
  return higher <= lower + LEVEL_DISTANCE[level.scale] ? 1 : 0;
}

function interestScore(
  book: RuleCandidate,
  level: ChildProfile["level"],
  weights: InterestWeights,
): number {
  const tags = new Set([...book.genres, ...book.subjects]);
  let total = 0;
  for (const tag of tags) total += weights.byTag.get(tag) ?? 0;

  const tagMean = tags.size === 0 ? 0 : total / tags.size;
  const length = weights.byLength.get(book.length) ?? 0;
  const decline = weights.declinedBookIds.has(book.id) ? -2 : 0;
  return tagMean + length + decline + levelPoint(book, level);
}

/** OI-2 proposal. Call with books already filtered for eligibility by Catalog. */
export function rankRuleCandidates(
  candidates: readonly RuleCandidate[],
  child: ChildProfile,
  weights: InterestWeights,
): string[] {
  const referenceAge = gradeReferenceAge(child.grade);
  return candidates
    .map((book) => ({
      id: book.id,
      fit: ageFit(book, referenceAge),
      interest: interestScore(book, child.level, weights),
      midpointDistance: Math.abs(child.age - (book.ageMin + book.ageMax) / 2),
    }))
    .sort((left, right) => {
      const ranking =
        right.fit - left.fit ||
        right.interest - left.interest ||
        left.midpointDistance - right.midpointDistance;
      if (ranking !== 0) return ranking;
      if (left.id < right.id) return -1;
      if (left.id > right.id) return 1;
      return 0;
    })
    .slice(0, BATCH_LIMIT)
    .map(({ id }) => id);
}
