"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => undefined;
const format = (iso: string, timeZone?: string) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));

export function LocalTime({ iso }: { iso: string }) {
  const text = useSyncExternalStore(
    subscribe,
    () => format(iso),
    () => `${format(iso, "UTC")} UTC`,
  );
  return <time dateTime={iso}>{text}</time>;
}
