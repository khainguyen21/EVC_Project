import { describe, expect, it } from "vitest";
import { parseCourseCodes, parseQuery, shortenCourseCodes, unreadWords } from "./courseCodes";

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

describe("parseCourseCodes, as tutors write subjects", () => {
  it("reads Stats as any Statistics course", () => {
    expect(parseCourseCodes("Stats")).toEqual(["STAT-*"]);
  });

  it("reads any Math course however it is put", () => {
    for (const text of ["Math Any", "Any Math", "Math (any)", "Math: any", "all math"]) {
      expect(parseCourseCodes(text)).toEqual(["MATH-*"]);
    }
  });

  it("reads every whole subject in a list, not only the last one", () => {
    expect(parseCourseCodes("English, ESL")).toEqual(["ENGL-*", "ESL-*"]);
    expect(parseCourseCodes("Chemistry, Physics")).toEqual(["CHEM-*", "PHYS-*"]);
    expect(parseCourseCodes("Vietnamese, English C1000")).toEqual(["ENGL-C1000", "VIET-*"]);
  });

  it("ignores a colon or brackets around a word", () => {
    // William's schedule ends each course list with a colon.
    expect(parseCourseCodes("CHEM 015, 30A, 01A:")).toEqual(["CHEM-15", "CHEM-30A", "CHEM-1A"]);
  });
});

describe("unreadWords", () => {
  it("lists words that change the meaning but the reader can't use", () => {
    expect(unreadWords("Math 20 and up")).toEqual(["up"]);
    expect(unreadWords("any math up to Calc")).toEqual(["up", "to", "Calc"]);
    expect(unreadWords("Math 20 through 25")).toEqual(["through"]);
  });

  it("lets words through that don't change which courses", () => {
    expect(unreadWords("Math (any), all levels")).toEqual([]);
    expect(unreadWords("Chem 1A & 1B")).toEqual([]);
    expect(unreadWords("Math 20 and 21")).toEqual([]);
    expect(unreadWords("MATH STAT C1000")).toEqual([]);
    expect(unreadWords("Computer Science 75")).toEqual([]);
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

describe("the course reader, with a slash on its own", () => {
  it("reads a slash standing alone as and, instead of crashing", () => {
    expect(parseCourseCodes("Chem 1A / 1B")).toEqual(["CHEM-1A", "CHEM-1B"]);
    expect(parseCourseCodes("Math 66 / 67")).toEqual(["MATH-66", "MATH-67"]);
    expect(parseCourseCodes("Math /")).toEqual(["MATH-*"]);
    expect(parseCourseCodes("/")).toEqual([]);
    expect(parseCourseCodes("Phys 7A //// 7B")).toEqual(["PHYS-7A", "PHYS-7B"]);
  });

  it("doesn't flag the slash as a word it can't read", () => {
    expect(unreadWords("Chem 1A / 1B")).toEqual([]);
  });

  it("lets the public search take a slash", () => {
    expect(() => parseQuery("chem 1a / 1b")).not.toThrow();
    expect(() => parseQuery("/")).not.toThrow();
  });
});
