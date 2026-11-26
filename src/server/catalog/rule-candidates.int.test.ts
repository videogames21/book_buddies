import { beforeEach, describe, expect, it } from "vitest";
import { insertBook } from "../../../tests/fixtures/catalog";
import { resetDatabase } from "../../../tests/integration/db";
import { quizSubmissionSchema } from "@/shared/recommendation/quiz";
import { getDb, withTransaction } from "@/server/lib/db";
import {
  getQuizCatalogGuard,
  listRuleCandidates,
  lockActiveBooksForQuiz,
} from "./rule-candidates";

beforeEach(resetDatabase);

it("filters on current catalog eligibility and returns only the normalized ranking fields", async () => {
  const id = await insertBook("active", "Match", {
    readingLevel: "740L (AR 5.1)",
    customTags: ["internal"],
    genres: ["fantasy"],
    subjects: ["animals"],
  });
  const excluded = await insertBook("active", "Excluded");
  await insertBook("draft", "Draft");
  await insertBook("blocked", "Blocked");
  await insertBook("active", "Too old", { ageMin: 9, ageMax: 12 });
  await insertBook("active", "Other mood", { moods: ["exciting"] });
  await insertBook("active", "Other length", { length: "longer story" });

  expect(
    await listRuleCandidates(8, { mood: "calm", length: "quick read" }, [
      excluded,
    ]),
  ).toEqual([
    {
      id,
      genres: ["fantasy"],
      subjects: ["animals"],
      length: "quick read",
      ageMin: 6,
      ageMax: 8,
      comparableLevels: { lexile: 740, arAtos: 5.1 },
    },
  ]);
});

it("leaves an empty match empty and ignores nonstandard level annotations", async () => {
  const id = await insertBook("active", "Only book", { readingLevel: "~510L" });
  expect(
    await listRuleCandidates(8, { mood: "exciting", length: "any" }, []),
  ).toEqual([]);
  const eligible = await listRuleCandidates(
    8,
    { mood: "any", length: "any" },
    [],
  );
  expect(eligible).toMatchObject([{ id, comparableLevels: {} }]);
});

it("requires both fixed answers and rejects caller-provided identity", () => {
  const requestId = "33736454-c33c-4f5c-a503-b2858ea22aa9";
  expect(
    quizSubmissionSchema.safeParse({ mood: "any", length: "any", requestId })
      .success,
  ).toBe(true);
  expect(
    quizSubmissionSchema.safeParse({ mood: "any", requestId }).success,
  ).toBe(false);
  expect(
    quizSubmissionSchema.safeParse({
      mood: "invented",
      length: "any",
      requestId,
    }).success,
  ).toBe(false);
  expect(
    quizSubmissionSchema.safeParse({
      mood: "any",
      length: "any",
      requestId,
      childId: "untrusted",
    }).success,
  ).toBe(false);
});

describe("lockActiveBooksForQuiz (OI-58, team decision 2026-11-26)", () => {
  const versions = async (ids: string[]) =>
    Promise.all(
      ids.map(
        async (id) =>
          (
            await getDb()
              .collection<{ _id: string; writeVersion?: number }>("books")
              .findOne({ _id: id })
          )?.writeVersion,
      ),
    );

  it("is the production quiz's guard", () => {
    expect(getQuizCatalogGuard()).toBe(lockActiveBooksForQuiz);
  });

  it("writes every active book and returns true", async () => {
    const ids = [
      await insertBook("active", "One"),
      await insertBook("active", "Two"),
    ];
    await expect(
      withTransaction((tx) => lockActiveBooksForQuiz(tx, ids)),
    ).resolves.toBe(true);
    await expect(versions(ids)).resolves.toEqual([1, 1]);
  });

  it.each(["draft", "blocked"] as const)(
    "returns false when a book is %s",
    async (status) => {
      const active = await insertBook("active", "Active");
      const other = await insertBook(status, "Not active");
      await expect(
        withTransaction((tx) => lockActiveBooksForQuiz(tx, [active, other])),
      ).resolves.toBe(false);
    },
  );
});
