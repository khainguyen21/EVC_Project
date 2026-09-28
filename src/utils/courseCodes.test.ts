import { describe, expect, it } from "vitest";
import { parseCourseCodes } from "./courseCodes";

describe("parseCourseCodes", () => {
  it("reads a department hyphenated to its number", () => {
    expect(parseCourseCodes("COMSC-075, 076, 028")).toEqual([
      "COMSC-75",
      "COMSC-76",
      "COMSC-28",
    ]);
  });

  it("still treats a hyphen between numbers as a range", () => {
    expect(parseCourseCodes("MATH 020-022")).toEqual([
      "MATH-20",
      "MATH-21",
      "MATH-22",
    ]);
  });
});
