import { ensureIndexes } from "../../src/server/setup/ensure-indexes";
import { createHash, randomBytes } from "node:crypto";
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
  await db.collection("consentRecords").insertOne({
    familyId,
    parentUserId: userId,
    noticeVersion: "test",
    method: "email-plus",
    acknowledgedAt,
    confirmBy: new Date(acknowledgedAt.getTime() + 14 * 24 * 60 * 60 * 1000),
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
