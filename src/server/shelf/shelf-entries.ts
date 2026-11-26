import "server-only";
import type { ObjectId } from "mongodb";
import { getDb, type Tx } from "@/server/lib/db";
import { SHELF_ENTRIES, type ShelfEntryDocument } from "./shelf-collections";

// Shelf's reads and writes of single shelf entries, for the use cases outside Shelf that
// act on one child's book (UC-PAR-report-book; reused by UC-SHLF-parent-remove-book).
// Ratings and finish confirmations are separate collections and are never touched here
// (design/shlf.md, "Ratings and finish confirmations are stored apart from the shelf entry").

/**
 * Whether the book is on the child's shelf, in any category. Callers check the child's
 * family first. With `tx` the read joins that transaction's snapshot (UC-PAR-suggest-book 4a).
 */
export async function isOnShelf(
  childId: string,
  bookId: string,
  tx?: Tx,
): Promise<boolean> {
  const entry = await getDb()
    .collection<ShelfEntryDocument>(SHELF_ENTRIES)
    .findOne({ childId, bookId }, { projection: { _id: 1 }, session: tx });
  return entry !== null;
}

/**
 * Deletes the child's shelf entry for the book inside the caller's transaction. Returns
 * the deleted entry's ID, or `null` if there was none: the caller uses that answer as
 * its proof that the book was on the shelf at the moment of the save.
 */
export async function removeShelfEntryInTx(
  tx: Tx,
  childId: string,
  bookId: string,
): Promise<ObjectId | null> {
  const deleted = await getDb()
    .collection<ShelfEntryDocument>(SHELF_ENTRIES)
    .findOneAndDelete(
      { childId, bookId },
      { projection: { _id: 1 }, session: tx },
    );
  return deleted?._id ?? null;
}
