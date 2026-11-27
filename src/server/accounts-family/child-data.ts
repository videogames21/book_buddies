import "server-only";
import { appendAudit } from "@/server/audit/audit-log";
import { readChildIdentityForParent } from "@/server/child-identity/child-identity";
import { readChildUsernameForParent } from "@/server/identity-access/child-credentials";
import { readChildUsageForParent } from "@/server/identity-access/child-sign-ins";
import type { ParentSession } from "@/server/identity-access/sessions";
import { fail, ok } from "@/server/lib/action-result";
import { now } from "@/server/lib/clock";
import { withTransaction } from "@/server/lib/db";
import { logUnexpectedError } from "@/server/lib/log";
import { readChildNoticesForParent } from "@/server/notification/child-notices";
import { readBatchesForParent } from "@/server/recommendation/batches";
import { readReadingProfileForParent } from "@/server/recommendation/child-reading-profile";
import { readShelfForParentData } from "@/server/shelf/shelf-collections";
import type { ChildDataSnapshot } from "@/shared/accounts-family/child-data";
import { readReportsForParent } from "./child-report-data";
import { readChildAccountForParent } from "./child-accounts";
import { readConsentForParent } from "./families";
import { readParentNotesForParent } from "./parent-notes";
import { listSuggestionsForExport } from "./suggestions";

export async function readChildData(
  parent: ParentSession,
  childId: string,
  intent: "review" | "export",
) {
  const familyId = parent.familyId;
  try {
    return await withTransaction(
      async (tx) => {
        const child = await readChildAccountForParent(familyId, childId, tx);
        if (!child)
          return fail("CHILD_NOT_FOUND", "We couldn't find that child.");

        const notes = await readParentNotesForParent(familyId, childId, tx);
        if (
          intent === "export" &&
          notes.some(({ flag }) => flag === "flagged")
        ) {
          return fail(
            "EXPORT_UNAVAILABLE",
            "A flagged note prevents this download. You can still review the child's data here.",
          );
        }
        const identities = await readChildIdentityForParent(
          familyId,
          childId,
          tx,
        );
        const username = await readChildUsernameForParent(
          familyId,
          childId,
          tx,
        );
        const profile = await readReadingProfileForParent(
          familyId,
          childId,
          tx,
        );
        const recommendations = await readBatchesForParent(
          familyId,
          childId,
          tx,
        );
        const shelf = await readShelfForParentData(familyId, childId, tx);
        const usage = await readChildUsageForParent(familyId, childId, tx);
        const reports = await readReportsForParent(familyId, childId, tx);
        const notices = await readChildNoticesForParent(familyId, childId, tx);
        const consent = await readConsentForParent(familyId, childId, tx);
        const suggestions = await listSuggestionsForExport(
          familyId,
          childId,
          tx,
        );

        const snapshot: ChildDataSnapshot = {
          schemaVersion: 1,
          generatedAt: now().toISOString(),
          childId,
          categories: [
            {
              key: "identity",
              label: "Identity",
              purpose:
                "Identifies the child's account and helps match books to their reading level.",
              records: [
                {
                  nickname: child.nickname,
                  avatar: child.avatar,
                  createdAt: child.createdAt,
                  ...(username && { username }),
                },
                ...identities,
              ],
            },
            {
              key: "profile",
              label: "Reading profile",
              purpose:
                "Uses interests and favorite books to choose recommendations.",
              records: profile,
            },
            {
              key: "notes",
              label: "Parent notes and flags",
              purpose:
                "Gives the recommender context and records whether a note was flagged.",
              records: notes,
            },
            {
              key: "recommendations",
              label: "Recommendations and reactions",
              purpose: "Keeps track of the books recommended to this child.",
              records: recommendations,
            },
            {
              key: "shelf",
              label: "Shelf and history",
              purpose:
                "Tracks books on the shelf and finishes a parent confirmed.",
              records: [...shelf.entries, ...shelf.finishes],
            },
            {
              key: "ratings",
              label: "Ratings",
              purpose: "Records what the child thought of books they finished.",
              records: shelf.ratings,
            },
            {
              key: "shelfRequests",
              label: "Shelf requests",
              purpose: "Tracks books a child asks to add to their shelf.",
              records: [],
              notCollected: true,
            },
            {
              key: "usage",
              label: "Usage",
              purpose:
                "Records sign-ins and times used to manage the child's session.",
              records: usage,
            },
            {
              key: "reports",
              label: "Reports and exclusions",
              purpose:
                "Tracks reported books and keeps excluded books away from the child.",
              records: reports,
            },
            {
              key: "notifications",
              label: "Notifications",
              purpose: "Shows changes the child needs to know about.",
              records: notices,
            },
            {
              key: "consent",
              label: "Family consent",
              purpose:
                "Records when and how a parent gave or withdrew consent.",
              records: consent ? [consent] : [],
            },
            {
              key: "suggestions",
              label: "Parent suggestions",
              purpose:
                "Records books a parent suggested and any note added with them.",
              records: suggestions,
            },
          ],
        };
        const json = JSON.stringify(snapshot, null, 2);
        const entry = {
          actorId: parent.userId,
          actorRole: "parent" as const,
          childId,
          recordId: childId,
        };
        await appendAudit(tx, { ...entry, event: "child-data-viewed" });
        if (intent === "export")
          await appendAudit(tx, { ...entry, event: "child-data-exported" });
        return ok(json);
      },
      { readConcern: { level: "snapshot" } },
    );
  } catch (error) {
    return intent === "export"
      ? fail(
          "EXPORT_FAILED",
          "We couldn't prepare the download. Try again.",
          logUnexpectedError("exportChildData", error),
        )
      : fail(
          "LOAD_FAILED",
          "We couldn't load the child's data. Try again.",
          logUnexpectedError("reviewChildData", error),
        );
  }
}
