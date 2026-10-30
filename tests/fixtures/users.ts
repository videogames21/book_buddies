import { ObjectId } from "mongodb";
import { getDb } from "@/server/lib/db";

// Invented test accounts only (CLAUDE.md: never real children's data). The parent
// shape is the one requireParent() assumes until UC-PAR-onboarding is designed.

export async function insertParent(options: { parentRole: "main" | "sub"; familyId?: ObjectId }) {
  const _id = new ObjectId();
  const familyId = options.familyId ?? new ObjectId();
  await getDb()
    .collection("users")
    .insertOne({ _id, role: "parent", parentRole: options.parentRole, familyId, email: `parent-${_id.toHexString()}@example.test` });
  return { userId: _id.toHexString(), familyId: familyId.toHexString() };
}

export async function insertUserWithRole(role: "admin" | "child") {
  const _id = new ObjectId();
  await getDb().collection("users").insertOne({ _id, role });
  return { userId: _id.toHexString() };
}
