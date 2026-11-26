import "server-only";

// "The next midnight" for a child's session: the first 00:00 after a moment, in one
// configured time zone (design/shlf.md, Key decisions; OI-48). Built on Intl, so it
// follows daylight saving without a date library.

const SEARCH_WINDOW_MS = 48 * 60 * 60 * 1000;

/**
 * The first instant after `after` that falls on a later local date. Searching for the
 * change of date also covers a zone whose clocks skip midnight itself, where the new day
 * starts at 01:00.
 */
export function nextMidnight(after: Date, timeZone: string): Date {
  const format = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // `2026-11-20`, so that later dates sort after earlier ones.
  const localDate = (ms: number) => {
    const parts = new Map(
      format.formatToParts(ms).map((part) => [part.type, part.value]),
    );
    return ["year", "month", "day"]
      .map((type) => parts.get(type as Intl.DateTimeFormatPartTypes))
      .join("-");
  };

  const today = localDate(after.getTime());
  let sameDay = after.getTime();
  let laterDay = sameDay + SEARCH_WINDOW_MS;
  while (laterDay - sameDay > 1) {
    const middle = Math.floor((sameDay + laterDay) / 2);
    if (localDate(middle) > today) laterDay = middle;
    else sameDay = middle;
  }
  return new Date(laterDay);
}
