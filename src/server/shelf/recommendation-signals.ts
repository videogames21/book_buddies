import "server-only";
import { getDb, type Tx } from "@/server/lib/db";
import {
  FINISH_CONFIRMATIONS,
  RATINGS,
  SHELF_ENTRIES,
  type FinishConfirmationDocument,
  type RatingDocument,
  type ShelfEntryDocument,
} from "./shelf-collections";

const HISTORY_LIMIT = 20;

export async function listRecentShelfSignalBookIds(
  childId: string,
  tx?: Tx,
): Promise<string[]> {
  const db = getDb();
  const shelf = await db
    .collection<ShelfEntryDocument>(SHELF_ENTRIES)
    .find<Pick<ShelfEntryDocument, "bookId" | "movedAt">>(
      { childId },
      { projection: { bookId: 1, movedAt: 1 }, session: tx },
    )
    .sort({ movedAt: -1, bookId: 1 })
    .limit(HISTORY_LIMIT)
    .toArray();
  const finished = await db
    .collection<FinishConfirmationDocument>(FINISH_CONFIRMATIONS)
    .find<Pick<FinishConfirmationDocument, "bookId" | "confirmedAt">>(
      { childId },
      { projection: { bookId: 1, confirmedAt: 1 }, session: tx },
    )
    .sort({ confirmedAt: -1, bookId: 1 })
    .limit(HISTORY_LIMIT)
    .toArray();
  const activity = [
    ...shelf.map(({ bookId, movedAt }) => ({ bookId, at: movedAt })),
    ...finished.map(({ bookId, confirmedAt }) => ({ bookId, at: confirmedAt })),
  ].sort(
    (a, b) =>
      b.at.getTime() - a.at.getTime() ||
      (a.bookId < b.bookId ? -1 : Number(a.bookId > b.bookId)),
  );
  return [...new Set(activity.map(({ bookId }) => bookId))].slice(
    0,
    HISTORY_LIMIT,
  );
}

export async function listRecentRatingSignals(
  childId: string,
  tx?: Tx,
): Promise<Pick<RatingDocument, "bookId" | "value">[]> {
  return getDb()
    .collection<RatingDocument>(RATINGS)
    .find<Pick<RatingDocument, "bookId" | "value">>(
      { childId },
      { projection: { _id: 0, bookId: 1, value: 1 }, session: tx },
    )
    .sort({ ratedAt: -1, bookId: 1 })
    .limit(HISTORY_LIMIT)
    .toArray();
}
