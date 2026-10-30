import "server-only";
import { MongoClient, type ClientSession, type Db } from "mongodb";
import { getConfig } from "./config";

// One client per server instance, reused across requests (architecture §8.2.8).
// Kept on globalThis so dev-server hot reloads do not open a new pool each time.
const globalForMongo = globalThis as unknown as { bookBuddiesMongoClient?: MongoClient };

export function getMongoClient(): MongoClient {
  if (!globalForMongo.bookBuddiesMongoClient) {
    globalForMongo.bookBuddiesMongoClient = new MongoClient(getConfig().MONGODB_URI);
  }
  return globalForMongo.bookBuddiesMongoClient;
}

export function getDb(): Db {
  return getMongoClient().db(getConfig().MONGODB_DB);
}

/** The transaction handle a component passes to another component's insert functions. */
export type Tx = ClientSession;

/** Runs `work` as one MongoDB transaction; nothing it wrote remains if it throws. */
export async function withTransaction<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
  const session = getMongoClient().startSession();
  try {
    return await session.withTransaction(() => work(session));
  } finally {
    await session.endSession();
  }
}
