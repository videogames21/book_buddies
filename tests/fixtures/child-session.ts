import { ObjectId } from "mongodb";
import { createDatabaseSession } from "@/server/identity-access/sessions";
import { now } from "@/server/lib/clock";
import { getDb } from "@/server/lib/db";
import { insertChild } from "./children";

// An invented child who is already signed in: the account, the credential's user
// document and a session whose midnight is twelve hours from now().
export async function insertSignedInChild(nickname = "Starfish") {
  const childId = await insertChild(new ObjectId().toHexString(), { nickname });
  const userId = new ObjectId();
  await getDb()
    .collection("users")
    .insertOne({
      _id: userId,
      role: "child",
      childId,
      username: `reader_${userId.toHexString().slice(-8)}`,
    });
  const session = await createDatabaseSession(
    userId.toHexString(),
    undefined,
    new Date(now().getTime() + 12 * 60 * 60 * 1000),
  );
  return { childId, userId: userId.toHexString(), session };
}
