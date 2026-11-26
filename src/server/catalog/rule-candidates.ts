import "server-only";
import { getDb, type Tx } from "@/server/lib/db";
import { GENRES, LENGTHS, MOODS, SUBJECTS } from "@/shared/catalog/tags";
import type { QuizAnswers } from "@/shared/recommendation/quiz";
import { booksCollection, type BookDocument } from "./books-collection";

export type RuleCandidate = {
  id: string;
  genres: readonly string[];
  subjects: readonly string[];
  length: (typeof LENGTHS)[number];
  ageMin: number;
  ageMax: number;
  comparableLevels: { lexile?: number; arAtos?: number };
};

type InterestBook = Pick<BookDocument, "_id" | "genres" | "subjects">;

function interestTags(book: InterestBook): string[] {
  const subjects = book.subjects ?? [];
  return [
    ...GENRES.filter((genre) => book.genres.includes(genre)),
    ...SUBJECTS.filter((subject) => subjects.includes(subject)),
  ];
}

/** One active-only feature read for the child's favorites, shelf and ratings. */
export async function listRuleHistoryTags(
  bookIds: readonly string[],
  tx?: Tx,
): Promise<Map<string, string[]>> {
  if (bookIds.length === 0) return new Map();
  const books = await booksCollection(getDb())
    .find<InterestBook>(
      { _id: { $in: [...new Set(bookIds)] }, status: "active" },
      { projection: { genres: 1, subjects: 1 }, session: tx },
    )
    .toArray();
  return new Map(books.map((book) => [book._id, interestTags(book)]));
}

type CandidateDocument = Pick<
  BookDocument,
  | "_id"
  | "genres"
  | "subjects"
  | "length"
  | "ageMin"
  | "ageMax"
  | "readingLevel"
>;

function comparableLevels(
  value: string | undefined,
): RuleCandidate["comparableLevels"] {
  if (!value) return {};
  const match =
    /^(?:(\d{1,4})L(?:\s*\(AR\s+(\d{1,2}(?:\.\d)?)\))?|(?:AR|ATOS)\s+(\d{1,2}(?:\.\d)?))$/i.exec(
      value.trim(),
    );
  if (!match) return {};
  const lexile = Number(match[1]);
  const pairedAr = Number(match[2]);
  const arAtos = Number.isNaN(pairedAr) ? Number(match[3]) : pairedAr;
  return {
    ...(Number.isFinite(lexile) && { lexile }),
    ...(Number.isFinite(arAtos) && arAtos <= 13 && { arAtos }),
  };
}

/** Catalog filters first. Nothing exposes the imported label or admin custom tags. */
export async function listRuleCandidates(
  age: number,
  quiz: QuizAnswers,
  excludedBookIds: readonly string[],
  tx?: Tx,
): Promise<RuleCandidate[]> {
  const books = await booksCollection(getDb())
    .find<CandidateDocument>(
      {
        _id: { $nin: [...excludedBookIds] },
        status: "active",
        ageMin: { $lte: age },
        ageMax: { $gte: age },
        genres: { $in: [...GENRES] },
        moods: quiz.mood === "any" ? { $in: [...MOODS] } : quiz.mood,
        length: quiz.length === "any" ? { $in: [...LENGTHS] } : quiz.length,
      },
      {
        session: tx,
        projection: {
          genres: 1,
          subjects: 1,
          length: 1,
          ageMin: 1,
          ageMax: 1,
          readingLevel: 1,
        },
      },
    )
    .toArray();

  return books.flatMap((book) => {
    const length = LENGTHS.find((value) => value === book.length);
    if (!length) return [];
    return [
      {
        id: book._id,
        genres: GENRES.filter((genre) => book.genres.includes(genre)),
        subjects: SUBJECTS.filter((subject) =>
          book.subjects?.includes(subject),
        ),
        length,
        ageMin: book.ageMin,
        ageMax: book.ageMax,
        comparableLevels: comparableLevels(book.readingLevel),
      },
    ];
  });
}

export type QuizCatalogGuard = (
  tx: Tx,
  bookIds: readonly string[],
) => Promise<boolean>;

/** OI-58 supplies the same-book write before the production quiz can open. */
export function getQuizCatalogGuard(): QuizCatalogGuard | undefined {
  return undefined;
}
