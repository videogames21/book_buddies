import "server-only";
import { getDb, type Tx } from "@/server/lib/db";
import { GENRES, LENGTHS, MOODS } from "@/shared/catalog/tags";
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
  const lexile = match[1] === undefined ? undefined : Number(match[1]);
  const arText = match[2] ?? match[3];
  const arAtos = arText === undefined ? undefined : Number(arText);
  return {
    ...(lexile !== undefined && { lexile }),
    ...(arAtos !== undefined && arAtos <= 13 && { arAtos }),
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
        genres: book.genres,
        subjects: book.subjects ?? [],
        length,
        ageMin: book.ageMin,
        ageMax: book.ageMax,
        comparableLevels: comparableLevels(book.readingLevel),
      },
    ];
  });
}
