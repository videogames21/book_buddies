"use client";

import { useEffect, useState } from "react";

// Date and time, so a deadline up to 168 hours away (OI-69) is never ambiguous.
const PARTS = {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
} as const;

// The server knows no time zone, so it and the first browser render both show the time
// in UTC, labelled as such, and hydrate to the same text. After mount the browser shows
// it in the parent's own time zone (review of #137: suppressHydrationWarning only hid
// the mismatch and kept the server's UTC text).
const inUtc = (date: Date) =>
  new Intl.DateTimeFormat("en-US", { ...PARTS, timeZone: "UTC" }).format(date);
const inBrowser = (date: Date) =>
  new Intl.DateTimeFormat(undefined, PARTS).format(date);

export function LocalTime({ iso }: { iso: string }) {
  const [text, setText] = useState(() => inUtc(new Date(iso)));
  useEffect(() => {
    setText(inBrowser(new Date(iso)));
  }, [iso]);
  return <time dateTime={iso}>{text}</time>;
}
