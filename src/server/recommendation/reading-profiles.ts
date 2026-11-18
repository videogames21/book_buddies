import "server-only";
import type { Db } from "mongodb";
import { ensureCollection } from "@/server/lib/collections";

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
