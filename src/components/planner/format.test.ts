import { describe, expect, it } from "vitest";
import { shortTimeRange, usualHoursText } from "./format";

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
