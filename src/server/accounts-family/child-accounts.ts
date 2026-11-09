import "server-only";
import { randomUUID } from "node:crypto";
import { ObjectId, type Db } from "mongodb";
import { insertChildIdentity } from "@/server/child-identity/child-identity";
import {
  generateChildPassword,
  insertChildCredential,
  UsernameTakenError,
} from "@/server/identity-access/child-credentials";
import { hashPassword } from "@/server/identity-access/passwords";
import type { ParentSession } from "@/server/identity-access/sessions";
import { fail, ok, type ActionResult } from "@/server/lib/action-result";
import { now } from "@/server/lib/clock";
import { ensureCollection } from "@/server/lib/collections";
import { getDb, withTransaction } from "@/server/lib/db";
import { logUnexpectedError } from "@/server/lib/log";
import type { AvatarKey } from "./avatars";

import { insertParentNote, type NoteState } from "./parent-notes";
import {
  screenNote,
  type ScreenResult,
} from "@/server/safety-flagging/screen-note";
import { insertNoteFlag } from "@/server/safety-flagging/note-flags";
import { appendNoteFlagAudit } from "@/server/audit/audit-log";

// Accounts & Family's child accounts: the opaque child ID, family, nickname and avatar,
// which is all other components hold about a child (KD-pii-segregation).

const CHILDREN = "children";
// The family's consent record belongs to UC-PAR-onboarding, which is not designed yet.
// Assumed shape: one document per family with `confirmedAt` set once consent is
// confirmed (DI-consent-record; design/par.md, Open questions).
const CONSENT_RECORDS = "consentRecords";

export type NewChild = {
  nickname: string;
  age: number;
  grade: string;
  username: string;
  readingLevel?: { scale: string; value: string };
  avatar: AvatarKey;
  note?: string;
};

export type CreatedChild = {
  childId: string;
  username: string;
  password: string;
};

export async function isConsentConfirmed(familyId: string): Promise<boolean> {
  const record = await getDb()
    .collection(CONSENT_RECORDS)
    .findOne(
      {
        familyId: new ObjectId(familyId),
        confirmedAt: { $type: "date" },
        revokedAt: { $exists: false },
      },
      { projection: { _id: 1 } },
    );
  return record !== null;
}

/**
 * Creates the child account, its identity record and its credential in one transaction
 * (architecture §8.2.8), so nothing is left behind if any write fails (5a, 6a). The
 * plaintext password is returned for the credentials screen and never stored.
 */
export async function createChild(
  parent: ParentSession,
  child: NewChild,
): Promise<ActionResult<CreatedChild, "USERNAME_TAKEN" | "SAVE_FAILED">> {
  try {
    const password = generateChildPassword();
    const passwordHash = await hashPassword(password);
    const childId = randomUUID();
    const text = child.note?.trim();
    let screening: ScreenResult | undefined;
    let state: NoteState = "none";
    if (text) {
      try {
        screening = screenNote(text);
        state = screening.state;
      } catch {
        state = "check_not_run";
      }
    }

    await withTransaction(async (tx) => {
      await getDb()
        .collection<{
          _id: string;
          familyId: ObjectId;
          nickname: string;
          avatar: AvatarKey;
          createdAt: Date;
        }>(CHILDREN)
        .insertOne(
          {
            _id: childId,
            familyId: new ObjectId(parent.familyId),
            nickname: child.nickname,
            avatar: child.avatar,
            createdAt: now(),
          },
          { session: tx },
        );
      await insertChildIdentity(tx, {
        childId,
        age: child.age,
        grade: child.grade,
        readingLevel: child.readingLevel,
      });
      await insertChildCredential(tx, {
        childId,
        username: child.username,
        passwordHash,
      });
      if (text) {
        const noteId = await insertParentNote(tx, childId, text, state);
        if (screening?.state === "flagged") {
          const flagId = await insertNoteFlag(tx, noteId, childId, screening);
          await appendNoteFlagAudit(tx, parent.userId, childId, flagId);
        }
      }
    });

    return ok({ childId, username: child.username, password });
  } catch (err) {
    if (err instanceof UsernameTakenError) {
      return fail(
        "USERNAME_TAKEN",
        "That username is already taken. Please choose another.",
      );
    }
    const errorId = logUnexpectedError("createChild", err);
    return fail(
      "SAVE_FAILED",
      "We couldn't create the account. Nothing was saved; please try again.",
      errorId,
    );
  }
}

export async function ensureAccountsFamilyIndexes(db: Db): Promise<void> {
  await ensureCollection(db, CHILDREN, {
    bsonType: "object",
    required: ["_id", "familyId", "nickname", "avatar", "createdAt"],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "string", pattern: "^[0-9a-f-]{36}$" },
      familyId: { bsonType: "objectId" },
      nickname: { bsonType: "string", minLength: 1 },
      avatar: { bsonType: "string" },
      createdAt: { bsonType: "date" },
    },
  });
  await db
    .collection(CHILDREN)
    .createIndex({ familyId: 1 }, { name: "familyId" });
}

/** Family-scoped summary only. Pages authenticate before calling this function. */
export async function getChildForFamily(familyId: string, childId: string) {
  return getDb()
    .collection<{
      _id: string;
      nickname: string;
      avatar: AvatarKey;
      familyId: ObjectId;
      createdAt: Date;
    }>(CHILDREN)
    .findOne(
      { _id: childId, familyId: new ObjectId(familyId) },
      { projection: { _id: 1, nickname: 1, avatar: 1 } },
    );
}
