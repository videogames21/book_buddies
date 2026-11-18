import { randomUUID } from "node:crypto";
import { ObjectId } from "mongodb";
import { getDb } from "@/server/lib/db";

// An invented child account in the shape Accounts & Family keeps (nickname, avatar).
export async function insertChild(familyId: string) {
  const _id = randomUUID();
  await getDb()
    .collection<{
      _id: string;
      familyId: ObjectId;
      nickname: string;
      avatar: string;
      createdAt: Date;
    }>("children")
    .insertOne({
      _id,
      familyId: new ObjectId(familyId),
      nickname: "Starfish",
      avatar: "1-1",
      createdAt: new Date("2026-10-01T12:00:00Z"),
    });
  return _id;
}
