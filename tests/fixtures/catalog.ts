import { randomUUID } from "node:crypto";
import { getDb } from "@/server/lib/db";

// Invented fixture books for the Catalog's `books` shape (DI-catalog-status): a string
// `_id`, title, author and status. UC-ADM-add-content owns the real collection.

export async function insertBook(
  status: "draft" | "active" | "blocked",
  title = "Moon Garden",
) {
  const _id = randomUUID();
  await getDb()
    .collection<{ _id: string; title: string; author: string; status: string }>(
      "books",
    )
    .insertOne({ _id, title, author: "A. Writer", status });
  return _id;
}
