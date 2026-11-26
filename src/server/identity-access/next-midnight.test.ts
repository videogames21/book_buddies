import { describe, expect, it } from "vitest";
import { nextMidnight } from "./next-midnight";

const CHICAGO = "America/Chicago";
const at = (iso: string) => new Date(iso);

describe("nextMidnight (design/shlf.md, the end of a child's session)", () => {
  it.each([
    ["3 pm", "2026-11-20T15:00:00-06:00", "2026-11-21T00:00:00-06:00"],
    ["23:59", "2026-11-20T23:59:00-06:00", "2026-11-21T00:00:00-06:00"],
    [
      "a millisecond before midnight",
      "2026-11-20T23:59:59.999-06:00",
      "2026-11-21T00:00:00-06:00",
    ],
    [
      "midnight itself, which gets the following one",
      "2026-11-21T00:00:00-06:00",
      "2026-11-22T00:00:00-06:00",
    ],
    [
      "the end of a year",
      "2026-12-31T18:00:00-06:00",
      "2027-01-01T00:00:00-06:00",
    ],
  ])("from %s", (_label, after, expected) => {
    expect(nextMidnight(at(after), CHICAGO)).toEqual(at(expected));
  });

  it("follows the zone, not UTC", () => {
    const moment = at("2026-11-20T12:00:00Z");
    expect(nextMidnight(moment, "UTC")).toEqual(at("2026-11-21T00:00:00Z"));
    expect(nextMidnight(moment, "Asia/Kolkata")).toEqual(
      at("2026-11-21T00:00:00+05:30"),
    );
  });

  it.each([
    [
      "clocks go forward (a 23-hour day)",
      "2026-03-08T00:30:00-06:00",
      "2026-03-09T00:00:00-05:00",
    ],
    [
      "clocks go back (a 25-hour day)",
      "2026-11-01T00:30:00-05:00",
      "2026-11-02T00:00:00-06:00",
    ],
  ])("is correct on the day the %s", (_label, after, expected) => {
    expect(nextMidnight(at(after), CHICAGO)).toEqual(at(expected));
  });

  it("starts the new day at 01:00 where the clocks skip midnight", () => {
    // Cuba goes forward from 00:00 to 01:00.
    expect(
      nextMidnight(at("2026-03-07T12:00:00-05:00"), "America/Havana"),
    ).toEqual(at("2026-03-08T01:00:00-04:00"));
  });
});
