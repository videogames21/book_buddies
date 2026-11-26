import "server-only";
import type { Db, ObjectId } from "mongodb";
import { ensureCollection } from "@/server/lib/collections";

// Shelf's three collections (design/shlf.md, Data model), shared by every SHLF use case.
// Each holds only the opaque child ID and the book ID, never a name, age, grade or
// reading level (KD-pii-segregation). A child has one entry, one rating and one finish
// confirmation per book, which the unique (childId, bookId) indexes enforce.
export const SHELF_ENTRIES = "shelfEntries";
export const RATINGS = "ratings";
export const FINISH_CONFIRMATIONS = "finishConfirmations";

export const SHELF_CATEGORIES = [
  "readingNow",
  "wantToRead",
  "maybeLater",
  "finished",
] as const;
export type ShelfCategory = (typeof SHELF_CATEGORIES)[number];

export const RATING_VALUES = [
  "lovedIt",
  "likedIt",
  "okay",
  "notForMe",
] as const;
export type RatingValue = (typeof RATING_VALUES)[number];

export type ShelfEntryDocument = {
  _id: ObjectId;
  childId: string;
  bookId: string;
  category: ShelfCategory;
  movedAt: Date;
};

export type RatingDocument = {
  _id: ObjectId;
  childId: string;
  bookId: string;
  value: RatingValue;
  ratedAt: Date;
};

export type FinishConfirmationDocument = {
  _id: ObjectId;
  childId: string;
  bookId: string;
  confirmedByParentId: ObjectId;
  confirmedAt: Date;
};

const UNIQUE_CHILD_BOOK = { childId: 1, bookId: 1 } as const;
const UNIQUE_NAME = "childId_bookId_unique";

export async function ensureShelfIndexes(db: Db): Promise<void> {
  await ensureCollection(db, SHELF_ENTRIES, {
    bsonType: "object",
    required: ["_id", "childId", "bookId", "category", "movedAt"],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      childId: { bsonType: "string", minLength: 1 },
      bookId: { bsonType: "string", minLength: 1 },
      category: { enum: [...SHELF_CATEGORIES] },
      movedAt: { bsonType: "date" },
    },
  });
  await ensureCollection(db, RATINGS, {
    bsonType: "object",
    required: ["_id", "childId", "bookId", "value", "ratedAt"],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      childId: { bsonType: "string", minLength: 1 },
      bookId: { bsonType: "string", minLength: 1 },
      value: { enum: [...RATING_VALUES] },
      ratedAt: { bsonType: "date" },
    },
  });
  await ensureCollection(db, FINISH_CONFIRMATIONS, {
    bsonType: "object",
    required: [
      "_id",
      "childId",
      "bookId",
      "confirmedByParentId",
      "confirmedAt",
    ],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      childId: { bsonType: "string", minLength: 1 },
      bookId: { bsonType: "string", minLength: 1 },
      confirmedByParentId: { bsonType: "objectId" },
      confirmedAt: { bsonType: "date" },
    },
  });
  for (const name of [SHELF_ENTRIES, RATINGS, FINISH_CONFIRMATIONS]) {
    await db
      .collection(name)
      .createIndex(UNIQUE_CHILD_BOOK, { unique: true, name: UNIQUE_NAME });
  }
}
