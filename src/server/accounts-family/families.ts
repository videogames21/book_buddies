import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { ObjectId } from "mongodb";
import { appendUnconfirmedPurgeAudit } from "@/server/audit/audit-log";
import {
  deleteParentAccount,
  EmailTakenError,
  findParentByEmail,
  findParentEmail,
  insertMainParent,
} from "@/server/identity-access/parent-accounts";
import { hashPassword } from "@/server/identity-access/passwords";
import {
  createDatabaseSession,
  setSessionCookie,
} from "@/server/identity-access/sessions";
import { fail, ok, type ActionResult } from "@/server/lib/action-result";
import { now } from "@/server/lib/clock";
import { getConfig } from "@/server/lib/config";
import { getDb, withTransaction, type Tx } from "@/server/lib/db";
import { logUnexpectedError } from "@/server/lib/log";
import { sendEmail } from "@/server/notification/email";
import { familyHasChild } from "./child-accounts";
import { buildConsentEmail } from "./consent-email";
import {
  consentNotice,
  consentNoticeForVersion,
  consentNoticeVersion,
} from "./consent-notice";
import { CONSENT_RECORDS } from "./consent-record-schema";

// Accounts & Family's families (UC-PAR-onboarding). A family is its `familyId`; there
// is no family collection. This module owns `consentRecords` (DI-consent-record).

/** The SHA-256 hash stored in place of a confirmation token (design/par.md). */
export function hashConfirmationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** 32 random bytes for the emailed link; only the hash is ever stored. */
export function newConfirmationToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashConfirmationToken(token) };
}

/**
 * 6a: removes a family whose consent deadline has passed unconfirmed: its Consent
 * Record, the parent's name, email and hash, sessions and throttle row, plus an
 * IDs-only audit entry (§8.2.9). The deadline is part of the delete's own filter, so a
 * confirmed or unexpired family is never touched. No child data can exist before
 * confirmation. Returns whether a family was removed.
 */
export async function removeExpiredUnconfirmedFamily(
  tx: Tx,
  familyId: string,
): Promise<boolean> {
  const record = await getDb()
    .collection<{
      familyId: ObjectId;
      parentUserId: ObjectId;
      confirmBy: Date;
    }>(CONSENT_RECORDS)
    .findOneAndDelete(
      {
        familyId: new ObjectId(familyId),
        confirmedAt: { $exists: false },
        confirmBy: { $lte: now() },
      },
      { projection: { parentUserId: 1 }, session: tx },
    );
  if (!record) return false;
  const userId = record.parentUserId.toHexString();
  await deleteParentAccount(tx, userId);
  await appendUnconfirmedPurgeAudit(tx, userId, familyId);
  return true;
}

/**
 * 6a, Scheduled Cleanup: removes every family whose deadline has passed unconfirmed, each
 * in its own transaction. One failure does not stop the rest; it is thrown at the end so
 * the run reports failure and the next run tries again. Returns how many were removed.
 */
export async function purgeExpiredUnconfirmed(): Promise<number> {
  const expired = await getDb()
    .collection<{ familyId: ObjectId }>(CONSENT_RECORDS)
    .find(
      { confirmedAt: { $exists: false }, confirmBy: { $lte: now() } },
      { projection: { familyId: 1 } },
    )
    .toArray();
  let removed = 0;
  let failure: Error | undefined;
  for (const { familyId } of expired) {
    try {
      const done = await withTransaction((tx) =>
        removeExpiredUnconfirmedFamily(tx, familyId.toHexString()),
      );
      if (done) removed++;
    } catch (err) {
      failure ??= new Error("an unconfirmed family was not removed", {
        cause: err,
      });
    }
  }
  if (failure) throw failure;
  return removed;
}

/**
 * UC-PAR-report-book: increments `consentWriteVersion` on the family's Consent Record only
 * while consent is confirmed and not revoked. A revocation writes the same document, so a
 * report and a revocation conflict and MongoDB retries one of them; a snapshot read alone
 * would not conflict. Returns whether consent matched.
 */
export async function lockConsentForWrite(
  tx: Tx,
  familyId: string,
): Promise<boolean> {
  const result = await getDb()
    .collection(CONSENT_RECORDS)
    .updateOne(
      {
        familyId: new ObjectId(familyId),
        confirmedAt: { $type: "date" },
        revokedAt: { $exists: false },
      },
      { $inc: { consentWriteVersion: 1 } },
      { session: tx },
    );
  return result.matchedCount === 1;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export type NewParent = {
  name: string;
  email: string;
  password: string;
  /** The notice version the sign-up page showed. */
  noticeVersion: string;
};

export type SignUpErrorCode = "NOTICE_CHANGED" | "EMAIL_TAKEN" | "SAVE_FAILED";

/** A parent's email is free again only once that Main Parent's sign-up has expired (6a). */
async function emailBlocksSignUp(email: string): Promise<boolean> {
  const existing = await findParentByEmail(email);
  if (!existing) return false;
  if (existing.parentRole !== "main") return true;
  return (await getOnboardingStep(existing.familyId)) !== "expired";
}

/**
 * UC-PAR-onboarding step 5. A notice version other than the current one is no
 * acknowledgment (3b): the parent saw text that is no longer shown, so nothing is
 * stored. One transaction writes the Main Parent, the Consent Record and the session
 * (5a). The cookie and the email come after the commit, so a failure there cannot be
 * reported as "nothing saved": the account exists, and the parent is offered a resend
 * (5b) or can sign in.
 */
export async function createFamily(
  input: NewParent,
): Promise<ActionResult<{ emailSent: boolean }, SignUpErrorCode>> {
  const { token, tokenHash } = newConfirmationToken();
  const familyId = new ObjectId();
  const acknowledgedAt = now();
  const { CONSENT_CONFIRMATION_DAYS: days, CONSENT_METHOD: method } =
    getConfig();
  const noticeVersion = consentNoticeVersion(days);
  // The notice text and window are fixed for one deployment, so this check is exact.
  if (input.noticeVersion !== noticeVersion) {
    return fail(
      "NOTICE_CHANGED",
      "The consent notice has changed. Please read it again and tick the box.",
    );
  }
  const confirmBy = new Date(acknowledgedAt.getTime() + days * DAY_MS);

  let session;
  try {
    // 4a, before the costly hash (OI-51). The unique index still decides a race.
    if (await emailBlocksSignUp(input.email)) throw new EmailTakenError();
    const passwordHash = await hashPassword(input.password);
    session = await withTransaction(async (tx) => {
      // 6a: an account past its deadline is already gone; remove what is left of it.
      const existing = await findParentByEmail(input.email, tx);
      if (existing?.parentRole === "main") {
        await removeExpiredUnconfirmedFamily(tx, existing.familyId);
      }
      const userId = await insertMainParent(tx, {
        name: input.name,
        email: input.email,
        passwordHash,
        familyId: familyId.toHexString(),
      });
      await getDb()
        .collection(CONSENT_RECORDS)
        .insertOne(
          {
            familyId,
            parentUserId: new ObjectId(userId),
            noticeVersion,
            method,
            acknowledgedAt,
            confirmBy,
            confirmationTokenHash: tokenHash,
          },
          { session: tx },
        );
      return createDatabaseSession(userId, tx);
    });
  } catch (err) {
    if (err instanceof EmailTakenError) {
      return fail(
        "EMAIL_TAKEN",
        "An account already uses this email. Sign in, or reset your password.",
      );
    }
    return fail(
      "SAVE_FAILED",
      "We couldn't create your account. Please try again.",
      logUnexpectedError("createFamily", err),
    );
  }

  try {
    await setSessionCookie(session);
  } catch (err) {
    logUnexpectedError("createFamily: session cookie", err);
  }
  let emailSent = false;
  try {
    const sent = await sendEmail({
      to: input.email,
      ...buildConsentEmail({
        token,
        confirmBy,
        noticeVersion,
        notice: consentNotice(days),
      }),
    });
    emailSent = sent.ok;
  } catch (err) {
    logUnexpectedError("createFamily: confirmation email", err);
  }
  return ok({ emailSent });
}

export type ConfirmConsentCode = "LINK_INVALID" | "LINK_EXPIRED";

/**
 * UC-PAR-onboarding step 7. One conditional update sets `confirmedAt` once, so two
 * clicks cannot both confirm (§8.2.8). The token proves control of the email and grants
 * nothing else. The same link used again answers ok and changes nothing.
 */
export async function confirmConsentByToken(
  token: string,
): Promise<ActionResult<{ familyId: string }, ConfirmConsentCode>> {
  const confirmationTokenHash = hashConfirmationToken(token);
  const at = now();
  const records = getDb().collection<{
    familyId: ObjectId;
    confirmationTokenHash: string;
    confirmBy: Date;
    confirmedAt?: Date;
    revokedAt?: Date;
  }>(CONSENT_RECORDS);
  const confirmed = await records.findOneAndUpdate(
    {
      confirmationTokenHash,
      confirmedAt: { $exists: false },
      revokedAt: { $exists: false },
      confirmBy: { $gt: at },
    },
    { $set: { confirmedAt: at } },
    { projection: { familyId: 1 } },
  );
  if (confirmed) return ok({ familyId: confirmed.familyId.toHexString() });

  const record = await records.findOne(
    { confirmationTokenHash },
    { projection: { familyId: 1, confirmedAt: 1, revokedAt: 1 } },
  );
  if (!record || record.revokedAt) {
    return fail("LINK_INVALID", "This link no longer works.");
  }
  if (record.confirmedAt)
    return ok({ familyId: record.familyId.toHexString() });
  return fail("LINK_EXPIRED", "This link has expired.");
}

export type ResendCode =
  "ALREADY_CONFIRMED" | "SIGN_UP_EXPIRED" | "SEND_FAILED";

/**
 * UC-PAR-onboarding 6b. One conditional update stores a new token's hash in place of
 * the old one, so the earlier link stops working; `confirmBy` is never touched. The
 * family comes from the caller's session. A failed send keeps the new token, so the
 * parent can try again.
 */
export async function resendConsentEmailFor(parent: {
  userId: string;
  familyId: string;
}): Promise<ActionResult<null, ResendCode>> {
  const { token, tokenHash } = newConfirmationToken();
  const records = getDb().collection<{
    familyId: ObjectId;
    noticeVersion: string;
    confirmBy: Date;
    confirmedAt?: Date;
    revokedAt?: Date;
  }>(CONSENT_RECORDS);
  const familyId = new ObjectId(parent.familyId);
  const record = await records.findOne(
    { familyId },
    {
      projection: {
        confirmBy: 1,
        confirmedAt: 1,
        noticeVersion: 1,
        revokedAt: 1,
      },
    },
  );
  if (record?.confirmedAt) {
    return fail("ALREADY_CONFIRMED", "Your consent is already confirmed.");
  }
  if (!record || record.revokedAt || record.confirmBy <= now()) {
    return fail("SIGN_UP_EXPIRED", "Your sign-up expired. Please start again.");
  }

  const notice = consentNoticeForVersion(record.noticeVersion);
  const email = await findParentEmail(parent.userId);
  if (!notice || !email) {
    return fail(
      "SEND_FAILED",
      "We couldn't send the email. Please try again in a few minutes.",
    );
  }
  const message = buildConsentEmail({
    token,
    confirmBy: record.confirmBy,
    noticeVersion: record.noticeVersion,
    notice,
  });
  const rotated = await records.updateOne(
    {
      _id: record._id,
      familyId,
      noticeVersion: record.noticeVersion,
      confirmedAt: { $exists: false },
      revokedAt: { $exists: false },
      confirmBy: { $gt: now() },
    },
    { $set: { confirmationTokenHash: tokenHash } },
  );
  if (!rotated.matchedCount) {
    const current = await records.findOne(
      { _id: record._id },
      { projection: { confirmedAt: 1 } },
    );
    return current?.confirmedAt
      ? fail("ALREADY_CONFIRMED", "Your consent is already confirmed.")
      : fail("SIGN_UP_EXPIRED", "Your sign-up expired. Please start again.");
  }

  const sent = await sendEmail({ to: email, ...message });
  return sent.ok
    ? ok(null)
    : fail(
        "SEND_FAILED",
        "We couldn't send the email. Please try again in a few minutes.",
      );
}

/**
 * UC-PAR-delete-kid-account POST-4: records on the family's Consent Record that the child
 * was removed, and when, inside the deletion's transaction. Throws if the family has no
 * Consent Record, so the deletion is not committed without it.
 */
export async function markChildRemoved(
  tx: Tx,
  familyId: string,
  childId: string,
): Promise<void> {
  const { matchedCount } = await getDb()
    .collection<{
      familyId: ObjectId;
      removedChildren?: { childId: string; removedAt: Date }[];
    }>(CONSENT_RECORDS)
    .updateOne(
      { familyId: new ObjectId(familyId) },
      { $push: { removedChildren: { childId, removedAt: now() } } },
      { session: tx },
    );
  if (matchedCount !== 1) throw new Error("No Consent Record for the family");
}

export type OnboardingStep =
  "awaiting" | "expired" | "needs-first-child" | "complete";

/**
 * Where a Main Parent is in onboarding, read from the Consent Record and the family's
 * children (UC-PAR-onboarding 8a). The deadline is checked here, on read. A missing or
 * revoked record is not confirmed, the same answer isConsentConfirmed gives.
 */
export async function getOnboardingStep(
  familyId: string,
): Promise<OnboardingStep> {
  const record = await getDb()
    .collection<{ confirmBy: Date; confirmedAt?: Date; revokedAt?: Date }>(
      CONSENT_RECORDS,
    )
    .findOne(
      { familyId: new ObjectId(familyId) },
      { projection: { confirmBy: 1, confirmedAt: 1, revokedAt: 1 } },
    );
  if (!record || record.revokedAt) return "awaiting";
  if (!record.confirmedAt) {
    return record.confirmBy > now() ? "awaiting" : "expired";
  }
  return (await familyHasChild(familyId)) ? "complete" : "needs-first-child";
}
