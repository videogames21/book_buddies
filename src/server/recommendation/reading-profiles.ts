import "server-only";
import { MongoServerError, ObjectId, type Db } from "mongodb";
import {
  getChildForFamily,
  lockChildForWrite,
} from "@/server/accounts-family/child-accounts";
import { findActiveBookIds } from "@/server/catalog/books";
import { listRuleHistoryTags } from "@/server/catalog/rule-candidates";
import type { ParentSession } from "@/server/identity-access/sessions";
import { fail, ok, type ActionResult } from "@/server/lib/action-result";
import { now } from "@/server/lib/clock";
import { ensureCollection } from "@/server/lib/collections";
import { getDb, withTransaction, type Tx } from "@/server/lib/db";
import { logUnexpectedError } from "@/server/lib/log";
import { catalogKeysForInterest, type InterestKey } from "./interests";

// Recommendation's reading profiles: one document per child with a completed
// onboarding, keyed by the opaque child ID (design/rec.md, Data model). No name, age,
// grade or reading level lives here (KD-pii-segregation).
export const READING_PROFILES = "readingProfiles";

export async function ensureReadingProfileIndexes(db: Db): Promise<void> {
  await ensureCollection(db, READING_PROFILES, {
    bsonType: "object",
    required: [
      "_id",
      "childId",
      "interests",
      "favoriteBookIds",
      "onboardingComplete",
      "savedAt",
    ],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      childId: { bsonType: "string", minLength: 1 },
      interests: { bsonType: "array", items: { bsonType: "string" } },
      favoriteBookIds: { bsonType: "array", items: { bsonType: "string" } },
      onboardingComplete: { enum: [true] },
      savedAt: { bsonType: "date" },
    },
  });
  // The unique index is what makes "already complete" (1a) race-free (§8.2.8).
  await db
    .collection(READING_PROFILES)
    .createIndex({ childId: 1 }, { unique: true, name: "childId_unique" });
}

export type OnboardingProfileInput = {
  interests: InterestKey[];
  favoriteBookIds: string[];
};

export type SaveOnboardingProfileCode =
  | "CHILD_NOT_FOUND"
  | "INVALID_BOOK"
  | "ONBOARDING_ALREADY_COMPLETE"
  | "SAVE_FAILED";

type ReadingProfileDocument = {
  _id: ObjectId;
  childId: string;
  interests: InterestKey[];
  favoriteBookIds: string[];
  onboardingComplete: true;
  savedAt: Date;
};

const DUPLICATE_KEY = 11000;

class ChildGoneError extends Error {}

/**
 * UC-REC-kid-onboarding step 5. The write is one insert that the unique `childId` index
 * refuses if a completed profile exists, so two simultaneous saves leave one (1a,
 * §8.2.8). The family comes from the session, and the child is checked against it first.
 * The insert runs in a transaction that first calls lockChildForWrite, so a save racing
 * the child's deletion fails instead of leaving a profile behind (§8.2.8,
 * UC-PAR-delete-kid-account).
 */
export async function saveOnboardingProfile(
  session: ParentSession,
  childId: string,
  input: OnboardingProfileInput,
): Promise<ActionResult<null, SaveOnboardingProfileCode>> {
  try {
    if (!(await getChildForFamily(session.familyId, childId))) {
      return fail("CHILD_NOT_FOUND", "We couldn't find that child.");
    }

    const found = new Set(await findActiveBookIds(input.favoriteBookIds));
    if (input.favoriteBookIds.some((id) => !found.has(id))) {
      return fail(
        "INVALID_BOOK",
        "One of the books you chose is not in the catalog. Please choose again.",
      );
    }

    await withTransaction(async (tx) => {
      if (!(await lockChildForWrite(tx, childId))) throw new ChildGoneError();
      await getDb()
        .collection<ReadingProfileDocument>(READING_PROFILES)
        .insertOne(
          {
            _id: new ObjectId(),
            childId,
            interests: input.interests,
            favoriteBookIds: input.favoriteBookIds,
            onboardingComplete: true,
            savedAt: now(),
          },
          { session: tx },
        );
    });
    return ok(null);
  } catch (err) {
    if (err instanceof ChildGoneError) {
      return fail("CHILD_NOT_FOUND", "We couldn't find that child.");
    }
    if (err instanceof MongoServerError && err.code === DUPLICATE_KEY) {
      return fail(
        "ONBOARDING_ALREADY_COMPLETE",
        "Onboarding is already complete for this child.",
      );
    }
    return fail(
      "SAVE_FAILED",
      "We couldn't save the reading profile. Nothing was saved; please try again.",
      logUnexpectedError("saveOnboardingProfile", err),
    );
  }
}

/**
 * UC-PAR-delete-kid-account: the child's reading profile. The interest profile, batches,
 * reactions and decline reasons are added here as Recommendation builds them.
 */
export async function deleteChildRecords(
  tx: Tx,
  childId: string,
): Promise<void> {
  await getDb()
    .collection(READING_PROFILES)
    .deleteMany({ childId }, { session: tx });
}

/** Whether a completed profile exists for a child of this family (PRE-3). */
export async function isOnboardingComplete(
  familyId: string,
  childId: string,
): Promise<boolean> {
  if (!(await getChildForFamily(familyId, childId))) return false;
  const profile = await getDb()
    .collection(READING_PROFILES)
    .findOne({ childId, onboardingComplete: true }, { projection: { _id: 1 } });
  return profile !== null;
}

/** Derives ranking weights for the session's child without returning their stored profile. */
export async function getQuizOnboardingWeights(
  childId: string,
  tx: Tx,
): Promise<Map<string, number>> {
  const profile = await getDb()
    .collection<ReadingProfileDocument>(READING_PROFILES)
    .findOne<OnboardingProfileInput>(
      { childId, onboardingComplete: true },
      { projection: { _id: 0, interests: 1, favoriteBookIds: 1 }, session: tx },
    );

  const weights = new Map<string, number>();
  if (!profile) return weights;

  for (const interest of new Set(profile.interests)) {
    for (const key of catalogKeysForInterest(interest)) {
      weights.set(key, (weights.get(key) ?? 0) + 2);
    }
  }
  for (const keys of (
    await listRuleHistoryTags(profile.favoriteBookIds, tx)
  ).values()) {
    for (const key of keys) weights.set(key, (weights.get(key) ?? 0) + 1);
  }
  return weights;
}
