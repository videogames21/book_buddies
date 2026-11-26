import { consentNoticeVersion } from "../../src/server/accounts-family/consent-notice";
import { ensureIndexes } from "../../src/server/setup/ensure-indexes";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { MongoClient, ObjectId, type Db } from "mongodb";
import type { BrowserContext } from "@playwright/test";

// Test-only session fixture, for tests that start after sign-in: it writes an Auth.js
// database session directly and sets its cookie. Never used by the app. Invented
// accounts only.

let client: MongoClient | undefined;

export async function e2eDb(): Promise<Db> {
  if (!client) {
    const uri = readFileSync(
      fileURLToPath(new URL("./.mongo-uri", import.meta.url)),
      "utf8",
    ).trim();
    client = new MongoClient(uri);
    await ensureIndexes(client.db("bookbuddies_e2e"));
  }
  return client.db("bookbuddies_e2e");
}

export async function closeE2eDb(): Promise<void> {
  await client?.close();
  client = undefined;
}

export async function signInParent(
  context: BrowserContext,
  options: { parentRole: "main" | "sub"; consentConfirmed: boolean },
): Promise<{ familyId: ObjectId }> {
  const db = await e2eDb();
  const userId = new ObjectId();
  const familyId = new ObjectId();
  await db.collection("users").insertOne({
    _id: userId,
    role: "parent",
    parentRole: options.parentRole,
    familyId,
    email: `parent-${userId.toHexString()}@example.test`,
  });
  const acknowledgedAt = new Date();
  const confirmationDays = 14;
  await db.collection("consentRecords").insertOne({
    familyId,
    parentUserId: userId,
    noticeVersion: consentNoticeVersion(confirmationDays),
    method: "email-plus",
    acknowledgedAt,
    confirmBy: new Date(
      acknowledgedAt.getTime() + confirmationDays * 24 * 60 * 60 * 1000,
    ),
    confirmationTokenHash: createHash("sha256")
      .update(randomBytes(32))
      .digest("hex"),
    ...(options.consentConfirmed && { confirmedAt: acknowledgedAt }),
  });

  const sessionToken = randomBytes(32).toString("hex");
  await db.collection("sessions").insertOne({
    sessionToken,
    userId,
    expires: new Date(Date.now() + 60 * 60 * 1000),
  });
  await context.addCookies([
    {
      name: "next-auth.session-token",
      value: sessionToken,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  return { familyId };
}

/**
 * Signs in an invented child, with the account, session and end record the child pages
 * read. Child sign-in is not built, so the records are written directly.
 */
export async function signInChild(
  context: BrowserContext,
): Promise<{ sessionId: ObjectId }> {
  const db = await e2eDb();
  const childId = randomUUID();
  const userId = new ObjectId();
  const sessionId = new ObjectId();
  const at = new Date();
  const later = new Date(at.getTime() + 60 * 60 * 1000);
  await db
    .collection<{ _id: string; [field: string]: unknown }>("children")
    .insertOne({
      _id: childId,
      familyId: new ObjectId(),
      nickname: "Starfish",
      avatar: "1-1",
      createdAt: at,
    });
  await db.collection("users").insertOne({
    _id: userId,
    role: "child",
    childId,
    username: `reader_${userId.toHexString().slice(-8)}`,
  });
  const sessionToken = randomBytes(32).toString("hex");
  await db
    .collection("sessions")
    .insertOne({ _id: sessionId, sessionToken, userId, expires: later });
  await db.collection("childSessionEnds").insertOne({
    sessionId,
    endsAt: later,
    lastSeenAt: at,
    lastActiveAt: at,
  });
  await context.addCookies([
    {
      name: "next-auth.session-token",
      value: sessionToken,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  return { sessionId };
}

/** Signs in a hand-made account of the given role (an admin or a child), with no family. */
export async function signInWithRole(
  context: BrowserContext,
  role: "admin" | "child",
): Promise<void> {
  const db = await e2eDb();
  const userId = new ObjectId();
  await db.collection("users").insertOne({ _id: userId, role });
  const sessionToken = randomBytes(32).toString("hex");
  await db.collection("sessions").insertOne({
    sessionToken,
    userId,
    expires: new Date(Date.now() + 60 * 60 * 1000),
  });
  await context.addCookies([
    {
      name: "next-auth.session-token",
      value: sessionToken,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}
