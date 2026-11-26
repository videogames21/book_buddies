"use client";

// A UTC time shown in the parent's own time zone. The server renders in UTC, so the text
// may differ on hydration; React is told to keep the browser's (suppressHydrationWarning).
export function LocalTime({ iso }: { iso: string }) {
  const text = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {text}
    </time>
  );
}
