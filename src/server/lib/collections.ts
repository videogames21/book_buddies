import "server-only";
import type { Db, Document } from "mongodb";

/** Creates the collection with its schema validator, or updates the validator if it exists (§8.2.5 backstop). */
export async function ensureCollection(db: Db, name: string, jsonSchema: Document): Promise<void> {
  const exists = (await db.listCollections({ name }, { nameOnly: true }).toArray()).length > 0;
  if (exists) {
    await db.command({ collMod: name, validator: { $jsonSchema: jsonSchema } });
  } else {
    await db.createCollection(name, { validator: { $jsonSchema: jsonSchema } });
  }
}
