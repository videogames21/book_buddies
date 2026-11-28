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
    const client = new MongoClient(getConfig().MONGODB_URI);
    // A client whose first connection fails closes itself and then refuses every
    // operation, even once the database is back. Drop it so the next call makes another.
    client.once("topologyClosed", () => {
      if (globalForMongo.bookBuddiesMongoClient === client) {
        globalForMongo.bookBuddiesMongoClient = undefined;
      }
    });
    globalForMongo.bookBuddiesMongoClient = client;
  }
  return globalForMongo.bookBuddiesMongoClient;
}

export function getDb(): Db {
  return getMongoClient().db(getConfig().MONGODB_DB);
}

// How long before the health check gives up the driver gives up on its ping, so that
// the log line normally carries the driver's error name.
const PING_DEADLINE_MARGIN_MS = 500;

/**
 * Asks the database to answer, for the health check, and gives up after `timeoutMs`.
 * The driver's own deadline stops the ping itself. The driver ignores it while making
 * its first connection (30 seconds for a server it cannot reach), so a timer also
 * bounds the wait.
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
    const ping = getDb().command(
      { ping: 1 },
      { timeoutMS: timeoutMs - PING_DEADLINE_MARGIN_MS },
    );
    await Promise.race([ping, timeout]);
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
