import "server-only";
import { getDb, type Tx } from "@/server/lib/db";
import { GENRES, LENGTHS, MOODS, SUBJECTS } from "@/shared/catalog/tags";
import type { QuizAnswers } from "@/shared/recommendation/quiz";
import { lockActiveBookForWrite } from "./books";
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

/**
 * A history book's approved interest keys, genres and subjects kept apart: a decline
 * reason weighs them differently (design/rec-field-values.md, ranking signals).
 */
export type HistoryTags = { genres: string[]; subjects: string[] };

function historyTags(book: InterestBook): HistoryTags {
  const subjects = book.subjects ?? [];
  return {
    genres: GENRES.filter((genre) => book.genres.includes(genre)),
    subjects: SUBJECTS.filter((subject) => subjects.includes(subject)),
  };
}

/** Every interest key of a history book, genres first, for a signal that weighs them alike. */
export function interestKeys(tags: HistoryTags | undefined): string[] {
  return tags ? [...tags.genres, ...tags.subjects] : [];
}

/** One active-only feature read for the child's favorites, shelf, ratings and reactions. */
export async function listRuleHistoryTags(
  bookIds: readonly string[],
  tx?: Tx,
): Promise<Map<string, HistoryTags>> {
  if (bookIds.length === 0) return new Map();
  const books = await booksCollection(getDb())
    .find<InterestBook>(
      { _id: { $in: [...new Set(bookIds)] }, status: "active" },
      { projection: { genres: 1, subjects: 1 }, session: tx },
    )
    .toArray();
  return new Map(books.map((book) => [book._id, historyTags(book)]));
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

/**
 * The quiz's part of the same-book conditional write the team agreed for `OI-58`
 * (2026-11-26; design/adm.md, "Check races with the owning use cases"). Inside the save
 * transaction it writes each ranked book while it is still active, so a block or a
 * return to draft of any of them conflicts with the batch insert and MongoDB lets only
 * one commit. `false` means a book is no longer active, and the quiz saves nothing.
 * One at a time: a transaction's operations run in order on its session.
 */
export const lockActiveBooksForQuiz: QuizCatalogGuard = async (tx, bookIds) => {
  for (const bookId of bookIds) {
    if (!(await lockActiveBookForWrite(tx, bookId))) return false;
  }
  return true;
};

/** The guard the production quiz saves with; with it present the quiz entry opens. */
export function getQuizCatalogGuard(): QuizCatalogGuard | undefined {
  return lockActiveBooksForQuiz;
}
