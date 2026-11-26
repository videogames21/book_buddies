import "server-only";
import type { Db } from "mongodb";
import { ensureBookReportIndexes } from "@/server/accounts-family/book-report-schema";
import { ensureAccountsFamilyIndexes } from "@/server/accounts-family/child-accounts";
import { ensureConsentRecordIndexes } from "@/server/accounts-family/consent-record-schema";
import { ensureParentSuggestionIndexes } from "@/server/accounts-family/suggestion-schema";
import { ensureChildIdentityIndexes } from "@/server/child-identity/child-identity";
import { ensureIdentityAccessIndexes } from "@/server/identity-access/indexes";
import { ensurePasswordResetIndexes } from "@/server/identity-access/password-reset-schema";
import { ensureSignInAttemptIndexes } from "@/server/identity-access/sign-in-throttle";
import { ensureChildSessionIndexes } from "@/server/identity-access/child-sessions";
import { ensureChildSignInIndexes } from "@/server/identity-access/child-sign-ins";

import { ensureParentNoteIndexes } from "@/server/accounts-family/parent-notes";
import { ensureNoteFlagIndexes } from "@/server/safety-flagging/note-flags";
import { ensureAuditCollection } from "@/server/audit/audit-log";
import { ensureBookIndexes } from "@/server/catalog/books";
import { ensureRecommendationBatchIndexes } from "@/server/recommendation/batch-schema";
import { ensureReadingProfileIndexes } from "@/server/recommendation/reading-profiles";
import { ensureShelfIndexes } from "@/server/shelf/shelf-collections";
import { ensureChildNoticeIndexes } from "@/server/notification/child-notices";

// Idempotent index setup (design/par.md, Data model): run before the first deploy
// and by the integration-test setup. Each component creates its own indexes.
export async function ensureIndexes(db: Db): Promise<void> {
  await ensureIdentityAccessIndexes(db);
  await ensureSignInAttemptIndexes(db);
  await ensurePasswordResetIndexes(db);
  await ensureChildSessionIndexes(db);
  await ensureChildSignInIndexes(db);
  await ensureAccountsFamilyIndexes(db);
  await ensureConsentRecordIndexes(db);
  await ensureChildIdentityIndexes(db);
  await ensureParentNoteIndexes(db);
  await ensureNoteFlagIndexes(db);
  await ensureAuditCollection(db);
  await ensureReadingProfileIndexes(db);
  await ensureRecommendationBatchIndexes(db);
  await ensureShelfIndexes(db);
  await ensureBookIndexes(db);
  await ensureBookReportIndexes(db);
  await ensureChildNoticeIndexes(db);
  await ensureParentSuggestionIndexes(db);
}
