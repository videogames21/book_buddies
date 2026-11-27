"use client";

import { useActionState } from "react";
import Link from "next/link";
import { BLOCK_REASONS } from "@/shared/catalog/block-reasons";
import { saveBookDecision } from "./actions";

export function DecisionForm({
  bookId,
  entry,
  kind,
  reportId,
}: {
  bookId: string;
  entry: "catalog" | "reports";
  kind: "block" | "close" | "discard" | "warn";
  reportId?: string;
}) {
  const [result, action, pending] = useActionState(
    saveBookDecision.bind(null, bookId),
    null,
  );
  const label = {
    block: "Block book",
    warn: "Warn parent",
    close: "Close as blocked",
    discard: "Discard reports",
  }[kind];
  return (
    <form action={action}>
      <h2>{label}</h2>
      <input type="hidden" name="entry" value={entry} />
      <input type="hidden" name="kind" value={kind} />
      {reportId && <input type="hidden" name="reportId" value={reportId} />}
      {kind === "block" && (
        <label>
          Reason{" "}
          <select name="reason" defaultValue="" required>
            <option value="">Choose a reason</option>
            {BLOCK_REASONS.map((reason) => (
              <option key={reason}>{reason}</option>
            ))}
          </select>
        </label>
      )}
      <p>
        <label>
          <input type="checkbox" name="confirmed" value="yes" required />{" "}
          Confirm this decision
        </label>
      </p>
      <button disabled={pending}>{label}</button>{" "}
      <Link href={entry === "catalog" ? "/admin/catalog" : "/admin/reports"}>
        Cancel
      </Link>
      {result && !result.ok && <p role="alert">{result.error.message}</p>}
    </form>
  );
}
