import "server-only";
import type { Db } from "mongodb";
import { ensureAccountsFamilyIndexes } from "@/server/accounts-family/child-accounts";
import { ensureConsentRecordIndexes } from "@/server/accounts-family/consent-record-schema";
import { ensureChildIdentityIndexes } from "@/server/child-identity/child-identity";
import { ensureIdentityAccessIndexes } from "@/server/identity-access/indexes";
import { ensurePasswordResetIndexes } from "@/server/identity-access/password-reset-schema";
import { ensureSignInAttemptIndexes } from "@/server/identity-access/sign-in-throttle";

import { ensureParentNoteIndexes } from "@/server/accounts-family/parent-notes";
import { ensureNoteFlagIndexes } from "@/server/safety-flagging/note-flags";
import { ensureAuditCollection } from "@/server/audit/audit-log";
import { ensureBookIndexes } from "@/server/catalog/books";
import { ensureReadingProfileIndexes } from "@/server/recommendation/reading-profiles";
import { ensureShelfIndexes } from "@/server/shelf/shelf-collections";

// Idempotent index setup (design/par.md, Data model): run before the first deploy
// and by the integration-test setup. Each component creates its own indexes.
export async function ensureIndexes(db: Db): Promise<void> {
  await ensureIdentityAccessIndexes(db);
  await ensureSignInAttemptIndexes(db);
  await ensurePasswordResetIndexes(db);
  await ensureAccountsFamilyIndexes(db);
  await ensureConsentRecordIndexes(db);
  await ensureChildIdentityIndexes(db);
  await ensureParentNoteIndexes(db);
  await ensureNoteFlagIndexes(db);
  await ensureAuditCollection(db);
  await ensureReadingProfileIndexes(db);
  await ensureShelfIndexes(db);
  await ensureBookIndexes(db);
}
