"use client";

import { useId, useRef, useState, type SubmitEvent } from "react";
import type { ChildDataSnapshot } from "@/shared/accounts-family/child-data";
import { exportChildData, reviewChildData } from "./actions";

function formatValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(formatValue).join(", ");
  if (typeof value === "string")
    return value === "check_not_run" ? "Check did not run" : value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return "";
}

export function ReviewChildData({
  children,
}: {
  children: { id: string; nickname: string }[];
}) {
  const selectorId = useId();
  const [childId, setChildId] = useState(
    children.length === 1 ? children[0].id : "",
  );
  const [snapshot, setSnapshot] = useState<ChildDataSnapshot | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const selection = useRef(0);
  const inFlight = useRef(false);

  async function submit(
    event: SubmitEvent<HTMLFormElement>,
    intent: "review" | "export",
  ) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setMessage("");
    if (intent === "review") setSnapshot(null);
    const request = selection.current;
    const form = event.currentTarget;
    const entry = new FormData(form).get("password");
    const password = typeof entry === "string" ? entry : "";
    form.reset();
    try {
      const result = await (
        intent === "review" ? reviewChildData : exportChildData
      )({ childId, password });
      if (request !== selection.current) return;
      if (!result.ok) {
        if (
          result.error.code !== "EXPORT_FAILED" &&
          result.error.code !== "EXPORT_UNAVAILABLE"
        ) {
          setSnapshot(null);
        }
        setMessage(result.error.message);
        return;
      }
      setSnapshot(JSON.parse(result.data) as ChildDataSnapshot);
      if (intent === "export") {
        const url = URL.createObjectURL(
          new Blob([result.data], { type: "application/json" }),
        );
        const link = document.createElement("a");
        link.href = url;
        link.download = "bookbuddies-child-data.json";
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 0);
      }
    } catch {
      if (request === selection.current)
        setMessage("We couldn't complete the request. Try again.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <>
      <p>
        Confirm your password to see what information we store for a child and
        why.
      </p>
      <label htmlFor={selectorId}>Child</label>{" "}
      <select
        id={selectorId}
        value={childId}
        onChange={(event) => {
          selection.current++;
          setChildId(event.target.value);
          setSnapshot(null);
          setMessage("");
        }}
      >
        <option value="">Choose a child</option>
        {children.map(({ id, nickname }) => (
          <option key={id} value={id}>
            {nickname}
          </option>
        ))}
      </select>
      <form key={childId} onSubmit={(event) => void submit(event, "review")}>
        <p>
          <label>
            Your password{" "}
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              maxLength={128}
            />
          </label>
        </p>
        <button disabled={busy || !childId}>Review data</button>
      </form>
      {message && <p role="alert">{message}</p>}
      {busy && <p role="status">Checking your request…</p>}
      {snapshot && (
        <>
          <h2>Stored information</h2>
          {snapshot.categories.map(
            ({ key, label, purpose, records, notCollected }) => (
              <section key={key}>
                <h3>{label}</h3>
                <p>{purpose}</p>
                {records.length ? (
                  records.map((record, index) => (
                    <dl key={index}>
                      {Object.entries(record).map(([field, value]) => (
                        <div key={field}>
                          <dt>
                            {field.replace(/([A-Z])/g, " $1").toLowerCase()}
                          </dt>
                          <dd>{formatValue(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  ))
                ) : (
                  <p>
                    {notCollected
                      ? "This information is not collected yet."
                      : "No records."}
                  </p>
                )}
              </section>
            ),
          )}
          <form onSubmit={(event) => void submit(event, "export")}>
            <h2>Download a copy</h2>
            <p>
              <label>
                Confirm your password{" "}
                <input
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  required
                  maxLength={128}
                />
              </label>
            </p>
            <button disabled={busy}>Download child data</button>
          </form>
        </>
      )}
    </>
  );
}
