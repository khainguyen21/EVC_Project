import { describe, expect, it } from "vitest";
import { parseCourseCodes, shortenCourseCodes } from "./courseCodes";

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

  // The next three are written the way William's Fall 2026 schedule has them.
  it("reads a department typed with no space before its number", () => {
    expect(parseCourseCodes("MATH020, 021, 022, 025, 062, 066/67, 071, 72, 78")).toEqual([
      "MATH-20",
      "MATH-21",
      "MATH-22",
      "MATH-25",
      "MATH-62",
      "MATH-66",
      "MATH-67",
      "MATH-71",
      "MATH-72",
      "MATH-78",
    ]);
  });

  it("reads PHYSIC as Physics", () => {
    expect(parseCourseCodes("PHYSIC 7A/B/C, 2A/2B")).toEqual([
      "PHYS-7A",
      "PHYS-7B",
      "PHYS-7C",
      "PHYS-2A",
      "PHYS-2B",
    ]);
  });

  it("never reads the next department as a course of the one before", () => {
    expect(parseCourseCodes("CHEM 015, 30A, MATH020, PHYSIC 2A")).toEqual([
      "CHEM-15",
      "CHEM-30A",
      "MATH-20",
      "PHYS-2A",
    ]);
  });

  it("keeps a letter-led course number such as C1000 whole", () => {
    expect(parseCourseCodes("MATH STAT C1000, MATH 020")).toEqual(["STAT-C1000", "MATH-20"]);
  });
});

describe("shortenCourseCodes", () => {
  it("collapses runs of course numbers the way William types them", () => {
    const codes = ["20", "21", "22", "23", "24", "25", "62", "66", "67", "71", "72", "79"].map(
      (n) => `MATH-${n}`,
    );
    expect(shortenCourseCodes(codes)).toEqual(["MATH 20-25, 62, 66-67, 71-72, 79"]);
  });

  it("gives each department its own line, in alphabetical order", () => {
    expect(
      shortenCourseCodes(["MATH-71", "COMSC-75", "MATH-72", "COMSC-20", "COMSC-28"]),
    ).toEqual(["COMSC 20, 28, 75", "MATH 71-72"]);
  });

  it("lists lettered courses one by one", () => {
    expect(
      shortenCourseCodes(["CHEM-30A", "CHEM-1B", "CHEM-15", "CHEM-1A", "STAT-C1000"]),
    ).toEqual(["CHEM 1A, 1B, 15, 30A", "STAT C1000"]);
  });

  it("shows a department named without a number as any course in it", () => {
    expect(shortenCourseCodes(["ESL-*", "CHEM-1A", "CHEM-*"])).toEqual([
      "CHEM (any)",
      "ESL (any)",
    ]);
  });

  it.each([
    "MATH 020-025, 066/67, 071/72, 079, COMSC 075",
    "CHEM 015, 30A, Engr 10, 018, MATH 020, 021-25, 062, 066/67, 071, 073, Phys 2A, 7A",
    "Phys 02A/2B, 7A/B/C",
    "Math Instructional Assistant, all math up to MATH 072, STAT C1000",
    "ESL",
  ])("reads back as the same courses: %s", (subjects) => {
    const codes = parseCourseCodes(subjects);
    const shortened = shortenCourseCodes(codes).join(", ");
    expect(parseCourseCodes(shortened).sort()).toEqual([...codes].sort());
  });
});
