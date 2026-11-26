import { describe, expect, it } from "vitest";
import {
  publishStatusLine,
  publishedAtText,
  shortTimeRange,
  termOptionLabel,
  usualHoursText,
} from "./format";

describe("shortTimeRange", () => {
  it("drops am/pm when both ends share it", () => {
    expect(shortTimeRange(9 * 60, 11 * 60)).toBe("9–11");
    expect(shortTimeRange(13 * 60 + 30, 15 * 60)).toBe("1:30–3");
  });

  it("marks the end's pm when the shift crosses noon", () => {
    expect(shortTimeRange(11 * 60, 13 * 60)).toBe("11–1 pm");
    expect(shortTimeRange(10 * 60 + 30, 12 * 60 + 30)).toBe("10:30–12:30 pm");
  });
});

describe("usualHoursText", () => {
  it("writes the range, or one number when both ends match", () => {
    expect(usualHoursText({ min: 4, max: 8 })).toBe("4–8");
    expect(usualHoursText({ min: 5, max: 5 })).toBe("5");
  });
});

describe("termOptionLabel", () => {
  it("shows plain names before anything is published", () => {
    expect(termOptionLabel("Fall 2026", 1, null)).toBe("Fall 2026");
  });

  it("marks the published term current and every other term not current", () => {
    expect(termOptionLabel("Spring 2027", 2, 2)).toBe("Spring 2027 · Current");
    expect(termOptionLabel("Fall 2026", 1, 2)).toBe("Fall 2026 · not current");
  });

  it("marks no term current when the published term is not in the menu", () => {
    // e.g. the published term was deleted on the Terms page.
    expect(termOptionLabel("Fall 2026", 1, 99)).toBe("Fall 2026 · not current");
  });
});

describe("publishStatusLine", () => {
  const at = "2026-11-25T23:10:00.000Z";

  it("says not published when this term never was", () => {
    expect(publishStatusLine(false, null)).toEqual({ text: "Not published yet", current: false });
    // Can't really happen (current means published), but never claims "Current" without a time.
    expect(publishStatusLine(true, null)).toEqual({ text: "Not published yet", current: false });
  });

  it("says current, with the time, for the term students see", () => {
    expect(publishStatusLine(true, at)).toEqual({
      text: `Current · published ${publishedAtText(at)}`,
      current: true,
    });
  });

  it("says not current, with its last time, for an older term", () => {
    expect(publishStatusLine(false, at)).toEqual({
      text: `Not current · last published ${publishedAtText(at)}`,
      current: false,
    });
  });
});

describe("publishedAtText", () => {
  it("writes month, day and time without the year or seconds", () => {
    expect(publishedAtText("2026-11-25T23:10:45.000Z")).toMatch(/^Nov 2[56], \d{1,2}:10\s?[AP]M$/);
  });
});
