import { expect, it } from "vitest";
import type { RuleCandidate } from "@/server/catalog/rule-candidates";
import {
  rankRuleCandidates,
  type ChildProfile,
  type InterestWeights,
} from "./rules";

const child = { age: 8, grade: "5" } satisfies ChildProfile;
const neutral: InterestWeights = {
  byTag: new Map(),
  byLength: new Map(),
  declinedBookIds: new Set(),
};

function book(
  id: string,
  overrides: Partial<RuleCandidate> = {},
): RuleCandidate {
  return {
    id,
    ageMin: 8,
    ageMax: 10,
    genres: [],
    subjects: [],
    length: "quick read",
    comparableLevels: {},
    ...overrides,
  };
}

it("orders age-fit groups ahead of interest, including the one-year boundary", () => {
  const candidates = [
    book("outside", { ageMax: 8, subjects: ["cats"] }),
    book("one-away", { ageMax: 9 }),
    book("inside"),
  ];
  expect(
    rankRuleCandidates(candidates, child, {
      ...neutral,
      byTag: new Map([["cats", 10]]),
    }),
  ).toEqual(["inside", "one-away", "outside"]);
});

it.each([
  { grade: "pre-school", referenceAge: 4 },
  { grade: "kindergarten", referenceAge: 5 },
  { grade: "1", referenceAge: 6 },
  { grade: "4", referenceAge: 9 },
] as const)(
  "uses $referenceAge as the reference age for $grade",
  ({ grade, referenceAge }) => {
    const candidates = [
      book("preferred-but-outside", {
        ageMin: referenceAge + 1,
        subjects: ["cats"],
      }),
      book("inside", { ageMin: referenceAge }),
    ];
    expect(
      rankRuleCandidates(
        candidates,
        { age: referenceAge + 1, grade },
        {
          ...neutral,
          byTag: new Map([["cats", 2]]),
        },
      ),
    ).toEqual(["inside", "preferred-but-outside"]);
  },
);

it("averages distinct tag strengths and adds length and exact-book adjustments", () => {
  const candidates = [
    book("declined", { genres: ["animal story"] }),
    book("mixed", {
      genres: ["animal story", "animal story"],
      subjects: ["cats"],
    }),
    book("long", { length: "longer story", subjects: ["cats"] }),
    book("no-tags"),
  ];
  expect(
    rankRuleCandidates(candidates, child, {
      byTag: new Map([
        ["animal story", 4],
        ["cats", 0],
      ]),
      byLength: new Map([["longer story", 3]]),
      declinedBookIds: new Set(["declined"]),
    }),
  ).toEqual(["long", "declined", "mixed", "no-tags"]);
});

it.each([
  {
    scale: "lexile",
    level: 740,
    matching: [839, 840],
    below: 640,
    outside: 841,
    other: { arAtos: 5 },
  },
  {
    scale: "arAtos",
    level: 3.4,
    matching: [4.3, 4.4],
    below: 2.4,
    outside: 4.5,
    other: { lexile: 740 },
  },
] as const)(
  "uses the inclusive $scale tolerance and leaves other scales neutral",
  ({ scale, level, matching, below, outside, other }) => {
    const candidates = [
      book("a-outside", { comparableLevels: { [scale]: outside } }),
      book("b-other-scale", { comparableLevels: other }),
      book("c-no-level"),
      book("d-within", { comparableLevels: { [scale]: matching[0] } }),
      book("e-at-limit", { comparableLevels: { [scale]: matching[1] } }),
      book("f-below", { comparableLevels: { [scale]: below } }),
    ];
    expect(
      rankRuleCandidates(
        candidates,
        { ...child, level: { scale, value: level } },
        neutral,
      ),
    ).toEqual([
      "d-within",
      "e-at-limit",
      "f-below",
      "a-outside",
      "b-other-scale",
      "c-no-level",
    ]);
  },
);

it("uses midpoint before ordinal IDs, caps fixture results at six, and preserves input order", () => {
  const candidates = [
    book("g"),
    book("f"),
    book("é"),
    book("Z"),
    book("c"),
    book("b"),
    book("a"),
    book("near", { ageMin: 6 }),
  ];
  const original = candidates.map(({ id }) => id);
  expect(rankRuleCandidates(candidates, child, neutral)).toEqual([
    "near",
    "Z",
    "a",
    "b",
    "c",
    "f",
  ]);
  expect(candidates.map(({ id }) => id)).toEqual(original);
  expect(rankRuleCandidates([], child, neutral)).toEqual([]);
});

it("uses the tie-breakers for an equal tag average plus a length adjustment", () => {
  const candidates = [
    book("b-tags", { genres: ["mystery", "fantasy", "adventure"] }),
    book("a-length", {
      genres: ["animal story", "fantasy", "adventure"],
      length: "longer story",
    }),
  ];

  expect(
    rankRuleCandidates(candidates, child, {
      ...neutral,
      byTag: new Map([
        ["mystery", 5],
        ["animal story", 2],
      ]),
      byLength: new Map([["longer story", 1]]),
    }),
  ).toEqual(["a-length", "b-tags"]);
});
