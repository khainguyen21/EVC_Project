import { describe, expect, it } from "vitest";
import { timeMarks } from "./centerHours";

describe("timeMarks", () => {
  it("offers every quarter hour from opening to closing", () => {
    const friday = timeMarks("Friday");
    expect(friday.slice(0, 3)).toEqual(["09:00", "09:15", "09:30"]);
    expect(friday.at(-1)).toBe("17:00");
    expect(friday).toHaveLength(8 * 4 + 1);
  });
});
