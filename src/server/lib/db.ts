import "server-only";
import { MongoClient, type ClientSession, type Db } from "mongodb";
import { getConfig } from "./config";

// One client per server instance, reused across requests (architecture §8.2.8).
// Kept on globalThis so dev-server hot reloads do not open a new pool each time.
const globalForMongo = globalThis as unknown as {
  bookBuddiesMongoClient?: MongoClient;
};

export function getMongoClient(): MongoClient {
  if (!globalForMongo.bookBuddiesMongoClient) {
    globalForMongo.bookBuddiesMongoClient = new MongoClient(
      getConfig().MONGODB_URI,
    );
  }
  return globalForMongo.bookBuddiesMongoClient;
}

export function getDb(): Db {
  return getMongoClient().db(getConfig().MONGODB_DB);
}

/**
 * Asks the database to answer, for the health check. Gives up after `timeoutMs`,
 * because the driver alone waits 30 seconds for a server it cannot reach.
 */
export async function pingDatabase(timeoutMs: number): Promise<void> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error("the database did not answer in time");
      err.name = "HealthTimeoutError";
      reject(err);
    }, timeoutMs);
  });
  try {
    await Promise.race([getDb().command({ ping: 1 }), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/** The transaction handle a component passes to another component's insert functions. */
export type Tx = ClientSession;

/**
 * Runs `work` as one MongoDB transaction; nothing it wrote remains if it throws. The
 * driver retries transient write conflicts, so `work` may run more than once. With
 * `timeoutMS` the whole call, retries included, fails after that long.
 */
export async function withTransaction<T>(
  work: (tx: Tx) => Promise<T>,
  options: { timeoutMS?: number } = {},
): Promise<T> {
  const session = getMongoClient().startSession();
  try {
    return await session.withTransaction(() => work(session), options);
  } finally {
    await session.endSession();
  }
}
