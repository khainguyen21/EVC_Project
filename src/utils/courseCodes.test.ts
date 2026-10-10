import { describe, expect, it } from "vitest";
import {
  formatCourseCode,
  inCatalog,
  matchesQuery,
  parseCourseCodes,
  parseQuery,
  shortenCourseCodes,
  unknownCourses,
  unreadWords,
} from "./courseCodes";
import { DEPARTMENTS } from "./departments";

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

describe("parseCourseCodes, for every EVC department", () => {
  it("reads every department in the catalog by its code", () => {
    for (const { code } of DEPARTMENTS) {
      expect(parseCourseCodes(`${code} 10`), code).toEqual([`${code}-10`]);
      expect(parseCourseCodes(`${code}-010A`), code).toEqual([`${code}-10A`]);
    }
  });

  it("reads every department by its catalog name, as any course in it", () => {
    for (const { code, name } of DEPARTMENTS) {
      expect(parseCourseCodes(name), name).toEqual([`${code}-*`]);
      expect(parseQuery(name.toLowerCase()), name).toBe(`${code}-*`);
    }
  });

  it("reads departments it didn't know before", () => {
    expect(parseCourseCodes("Anthropology, AJ 110")).toEqual(["AJ-110", "ANTH-*"]);
    expect(parseCourseCodes("Administration of Justice")).toEqual(["AJ-*"]);
    expect(parseCourseCodes("English As a Second Language")).toEqual(["ESL-*"]);
    expect(parseCourseCodes("Women’s Studies")).toEqual(["WOMS-*"]);
    expect(parseCourseCodes("Family & Consumer Studies")).toEqual(["FCS-*"]);
    expect(parseCourseCodes("Computer and Information Technology")).toEqual(["CIT-*"]);
  });

  it("reads course codes written the way the catalog writes them", () => {
    expect(parseCourseCodes("MATH-021L, ESL-350L, CIT-041J, COMSC-079C")).toEqual([
      "MATH-21L",
      "ESL-350L",
      "CIT-41J",
      "COMSC-79C",
    ]);
  });

  it("files a C1000 course under its department, whichever prefix the catalog gives it", () => {
    expect(parseCourseCodes("PSYC-C1000, PSYCH-012")).toEqual(["PSYCH-C1000", "PSYCH-12"]);
    expect(parseCourseCodes("COMM-C1000, COMS-010")).toEqual(["COMS-C1000", "COMS-10"]);
    expect(parseCourseCodes("POLS-C1000, POLSC-002")).toEqual(["POLSC-C1000", "POLSC-2"]);
  });

  it("still reads the shorter spellings it learned before the catalog", () => {
    expect(parseCourseCodes("ACCT 1A, ASTR 10, ETHN 10, MUS 10A, SOCI 10, PSYC 12")).toEqual([
      "ACCTG-1A",
      "ASTRO-10",
      "ETH-10",
      "MUSIC-10A",
      "SOC-10",
      "PSYCH-12",
    ]);
  });

  it("doesn't read the II in Physics II as a department", () => {
    // II-210 is the tutoring course itself, so no tutor lists it as a subject.
    expect(unreadWords("Physics II")).toEqual(["II"]);
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
    expect(shortenCourseCodes(codes)).toEqual(["MATH 020-025, 062, 066-067, 071-072, 079"]);
  });

  it("gives each department its own line, in alphabetical order", () => {
    expect(
      shortenCourseCodes(["MATH-71", "COMSC-75", "MATH-72", "COMSC-20", "COMSC-28"]),
    ).toEqual(["COMSC 020, 028, 075", "MATH 071-072"]);
  });

  it("lists lettered courses one by one", () => {
    expect(
      shortenCourseCodes(["CHEM-30A", "CHEM-1B", "CHEM-15", "CHEM-1A", "STAT-C1000"]),
    ).toEqual(["CHEM 001A, 001B, 015, 030A", "STAT C1000"]);
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

/** Every course in the catalog list, as "CODE number": "CHEM 001A". */
const CATALOG_COURSES = DEPARTMENTS.flatMap(({ code, courses }) =>
  courses.split(/\s+/).map((course) => ({ code, course })),
);

describe("formatCourseCode", () => {
  it.each([
    ["COMSC-75", "COMSC-075"],
    ["MATH-7", "MATH-007"],
    ["CHEM-1A", "CHEM-001A"],
    ["ESL-350L", "ESL-350L"],
    ["ENGL-C1000", "ENGL-C1000"],
    ["STAT-1000", "STAT-1000"],
    ["MATH-8000", "MATH-8000"],
    ["CHEM-*", "CHEM (any)"],
  ])("writes %s as %s, with the catalog's zeros", (code, shown) => {
    expect(formatCourseCode(code)).toBe(shown);
  });

  it("writes every catalog course exactly as the catalog does", () => {
    for (const { code, course } of CATALOG_COURSES) {
      const read = parseCourseCodes(`${code}-${course}`);
      expect(read.map(formatCourseCode), `${code}-${course}`).toEqual([`${code}-${course}`]);
    }
  });
});

describe("shortenCourseCodes, with the catalog's zeros", () => {
  it("reads every catalog course back as itself", () => {
    for (const { code, course } of CATALOG_COURSES) {
      const codes = parseCourseCodes(`${code} ${course}`);
      expect(shortenCourseCodes(codes), `${code} ${course}`).toEqual([`${code} ${course}`]);
      expect(parseCourseCodes(shortenCourseCodes(codes).join(", ")), `${code} ${course}`).toEqual(codes);
    }
  });

  it("reads a whole department's courses back as the same courses", () => {
    for (const { code, courses } of DEPARTMENTS) {
      const codes = parseCourseCodes(`${code} ${courses.split(/\s+/).join(", ")}`);
      const again = parseCourseCodes(shortenCourseCodes(codes).join(", "));
      expect(again.sort(), code).toEqual([...codes].sort());
    }
  });

  it("leaves numbers of four digits or more as they are", () => {
    expect(shortenCourseCodes(["MATH-8000", "MATH-8001"])).toEqual(["MATH 8000-8001"]);
  });
});

describe("parseQuery and matchesQuery, ignoring zeros", () => {
  it("finds a tutor however many zeros the student or the tutor typed", () => {
    for (const [query, subject] of [
      ["math 71", "MATH 071"],
      ["math 071", "MATH 71"],
      ["math-071", "MATH 071-072"],
      ["chem 1a", "CHEM 001A, 015"],
      ["chem 001a", "Chem 1A"],
      ["comsc 75", "COMSC 020, 028, 075"],
    ]) {
      expect(matchesQuery(parseCourseCodes(subject), parseQuery(query)!), `${query} / ${subject}`).toBe(true);
    }
  });

  it("doesn't find a different course", () => {
    expect(matchesQuery(parseCourseCodes("MATH 071"), parseQuery("math 7")!)).toBe(false);
    expect(matchesQuery(parseCourseCodes("MATH 007"), parseQuery("math 71")!)).toBe(false);
  });
});

describe("inCatalog", () => {
  it.each([
    "COMSC-75",
    "CHEM-1A",
    "MATH-71L",
    "ESL-350L",
    "ENGL-C1000",
    "STAT-C1000",
    "STAT-1000",
    "PSYCH-C1000",
    "COMS-C1000",
    "POLSC-C1000",
    "CHEM-*",
  ])("knows %s", (code) => {
    expect(inCatalog(code)).toBe(true);
  });

  it.each([
    ["PHYS-7", "PHYS 7A, 7B and 7C"],
    ["CHEM-1", "CHEM 1A and 1B"],
    ["BIOL-4", "BIOL 4A and 4B"],
    ["ESL-350", "ESL 350L"],
  ])("knows %s as the series of %s", (code) => {
    expect(inCatalog(code)).toBe(true);
  });

  it.each([
    ["COMSC-9999", "a typo"],
    ["MATH-8000", "a typo"],
    ["CHEM-1C", "a letter the catalog doesn't have"],
    ["PHYS-7D", "a letter the catalog doesn't have"],
    ["MATH-20L", "a lab the catalog doesn't have (only 21L)"],
    ["MATH-7", "not a series: MATH 70 and 71 are other courses"],
    ["MATH-63", "an old course number"],
    ["ENGL-1A", "an old course number, now ENGL C1000"],
    ["MATH-C1000", "Stats is STAT C1000, not MATH"],
    ["ENGL-C1002", "a C course the catalog doesn't have"],
    ["MATH-0", "no course zero"],
  ])("doesn't know %s: %s", (code) => {
    expect(inCatalog(code)).toBe(false);
  });
});

describe("unknownCourses", () => {
  it("names a course number that isn't in EVC's catalog, with the catalog's zeros", () => {
    expect(unknownCourses("COMSC-09999")).toEqual(["COMSC 9999"]);
    expect(unknownCourses("Math-8000")).toEqual(["MATH 8000"]);
    expect(unknownCourses("CHEM 1C")).toEqual(["CHEM 001C"]);
    expect(unknownCourses("chem 1c")).toEqual(["CHEM 001C"]);
  });

  it("accepts a real course however it is typed", () => {
    for (const text of [
      "COMSC 75",
      "COMSC 075",
      "COMSC-075",
      "comsc 75",
      "Comsc-075",
      "COMSC075",
      "Computer Science 75",
      "CS 75",
      "CHEM 1A",
      "chem 1a",
      "Chem1A",
      "CHEM-001A",
    ]) {
      expect(unknownCourses(text), text).toEqual([]);
    }
  });

  it("accepts every course in the catalog, by code, by name and in lower case", () => {
    for (const { code, course } of CATALOG_COURSES) {
      const name = DEPARTMENTS.find((d) => d.code === code)!.name;
      for (const text of [
        `${code} ${course}`,
        `${code}-${course}`,
        `${code.toLowerCase()} ${course.toLowerCase()}`,
        `${name} ${course}`,
      ]) {
        expect(unknownCourses(text), text).toEqual([]);
        expect(unreadWords(text), text).toEqual([]);
      }
    }
  });

  it("accepts the C1000 courses under every prefix the catalog uses", () => {
    expect(
      unknownCourses(
        "ENGL C1000, ENGL C1001, STAT C1000, STAT 1000, PSYC C1000, PSYCH C1000, COMM C1000, COMS C1000, POLS C1000, POLSC C1000",
      ),
    ).toEqual([]);
  });

  it("names a C course the catalog doesn't have", () => {
    expect(unknownCourses("ENGL C1002")).toEqual(["ENGL C1002"]);
    expect(unknownCourses("MATH C1000")).toEqual(["MATH C1000"]);
  });

  it("accepts a number that names a lettered series, like PHYS 7 for 7A, 7B and 7C", () => {
    expect(unknownCourses("PHYS 7, Chem 1, Bio 4, ESL 350")).toEqual([]);
  });

  it("doesn't take a shorter number for a series of longer ones", () => {
    expect(unknownCourses("MATH 7")).toEqual(["MATH 007"]);
  });

  it.each([
    "MATH 020-025, 066/67, 071/72, 079, COMSC 075",
    "CHEM 015, 30A, Engr 10, 018, MATH 020, 021-25, 062, 066/67, 071, 073, Phys 2A, 7A",
    "Phys 02A/2B, 7A/B/C",
    "MATH020, 021, 022, 025, 062, 066/67, 071, 72, 78",
    "PHYSIC 02A/2B, 7A, 7B",
    "CHEM 015, 30A, 01A:",
    "MATH STAT C1000, MATH 020, 21-25, 062, 066, 071",
  ])("accepts William's schedule as he writes it: %s", (text) => {
    expect(unknownCourses(text)).toEqual([]);
  });

  it("lets a range through when some of it is real, though MATH 23 and 24 don't exist", () => {
    expect(unknownCourses("MATH 20-25")).toEqual([]);
    expect(unknownCourses("Math 020-025")).toEqual([]);
  });

  it("names a range with no real course in it", () => {
    expect(unknownCourses("MATH 8000-8005")).toEqual(["MATH 8000-8005"]);
    expect(unknownCourses("MATH 23-24")).toEqual(["MATH 023-024"]);
  });

  it("checks each course in a slash list", () => {
    expect(unknownCourses("MATH 66/68")).toEqual(["MATH 068"]);
    expect(unknownCourses("PHYS 7A/B/D")).toEqual(["PHYS 007D"]);
    expect(unknownCourses("phys 7a/b/c")).toEqual([]);
  });

  it("never names a whole department", () => {
    for (const text of ["Math (any)", "Chemistry", "Stats", "Any English", "Administration of Justice"]) {
      expect(unknownCourses(text), text).toEqual([]);
    }
  });

  it("gives a bare number to the department before it", () => {
    expect(unknownCourses("MATH 71, 8000, COMSC 75, 9999")).toEqual(["MATH 8000", "COMSC 9999"]);
  });

  it("names each course once, in the order written", () => {
    expect(unknownCourses("Math 8000, CHEM 1C, Math 8000, MATH-08000")).toEqual([
      "MATH 8000",
      "CHEM 001C",
    ]);
  });

  it("checks the older short spellings against the catalog too", () => {
    expect(unknownCourses("MUS 10A, ACCT 1A, ASTR 10, ETHN 10, SOCI 10, PSYC 12, BIO 4A, PHYSIC 2A")).toEqual([]);
    expect(unknownCourses("MUS 10E")).toEqual(["MUSIC 010E"]);
  });

  it("names an old course number EVC doesn't offer now", () => {
    expect(unknownCourses("English 1A")).toEqual(["ENGL 001A"]);
    expect(unknownCourses("Math 63")).toEqual(["MATH 063"]);
  });

  it("leaves text it can't read to the other warning", () => {
    for (const text of ["Mth 71", "COMPSC 75", "Open Computer Lab", "Intro to Python", "", "   ", ","]) {
      expect(unknownCourses(text), JSON.stringify(text)).toEqual([]);
    }
  });

  it("still names a wrong number next to words it can't read", () => {
    expect(unknownCourses("Math 8000 and up")).toEqual(["MATH 8000"]);
    expect(unreadWords("Math 8000 and up")).toEqual(["up"]);
  });

  it("ignores a range too long or backwards to read, which the other warning catches", () => {
    expect(unknownCourses("MATH 1-100")).toEqual([]);
    expect(unknownCourses("MATH 25-20")).toEqual([]);
    expect(unreadWords("MATH 25-20")).toEqual(["25-20"]);
  });
});

describe("the course reader, with odd input", () => {
  it("reads a slash standing alone as and, instead of crashing", () => {
    expect(parseCourseCodes("Chem 1A / 1B")).toEqual(["CHEM-1A", "CHEM-1B"]);
    expect(unreadWords("Chem 1A / 1B")).toEqual([]);
    expect(parseCourseCodes("Math /")).toEqual(["MATH-*"]);
    expect(parseQuery("chem 1a / 1b")).toBeNull();
  });

  it("reads a slash at either end of a number", () => {
    expect(parseCourseCodes("Math 66/")).toEqual(["MATH-66"]);
    expect(parseCourseCodes("Math /67")).toEqual(["MATH-67"]);
    expect(parseCourseCodes("Phys 7A//B")).toEqual(["PHYS-7A", "PHYS-7B"]);
  });

  it("only takes a C-number like C1000 as a course number that starts with a letter", () => {
    expect(parseCourseCodes("Math 71, Calc2")).toEqual(["MATH-71"]);
    expect(unreadWords("Math 71, Calc2")).toEqual(["Calc2"]);
    expect(unreadWords("ETHN-History0")).toEqual(["History0"]);
    expect(parseCourseCodes("stat c1000")).toEqual(["STAT-C1000"]);
  });

  it.each([
    "",
    " ",
    "/",
    "//",
    "-",
    "--",
    ",,,",
    ";",
    ":",
    "()",
    "[]",
    "Math (",
    "Math /",
    "Math -",
    "Math 1-",
    "Math -1",
    "Math 1--5",
    "Math 1/-/2",
    "Math 0",
    "Math 99999999999999999999",
    "Math 1-99999999999",
    "Math\n71",
    "Math\t71",
    "Women\u2019s Studies 010",
    "\u{1F600}",
    "Math \u{1F600} 71",
    "C1000",
    "1A",
    "A",
    "Math A",
    "Math C",
    "II-210",
    "a".repeat(5000),
    "Math 71, ".repeat(500),
  ])("never crashes on %j", (text) => {
    expect(() => {
      parseCourseCodes(text);
      unreadWords(text);
      unknownCourses(text);
      parseQuery(text);
      shortenCourseCodes(parseCourseCodes(text));
      parseCourseCodes(text).map(formatCourseCode);
    }).not.toThrow();
  });

  it("asks William to check a number with more than one letter after it, a missing space", () => {
    expect(unreadWords("Math 71, 72and 73")).toEqual(["72and"]);
    expect(unreadWords("Math 71Calc")).toEqual(["71Calc"]);
    expect(parseCourseCodes("Math 71L, 21l")).toEqual(["MATH-71L", "MATH-21L"]);
  });

  it("asks William to check a slash list with a part it can't read, instead of guessing", () => {
    expect(unreadWords("Math 71/Calc")).toEqual(["71/Calc"]);
    expect(unreadWords("Phys 7A/BC")).toEqual(["7A/BC"]);
    expect(parseCourseCodes("Phys 7A/B/C")).toEqual(["PHYS-7A", "PHYS-7B", "PHYS-7C"]);
  });

  it("doesn't give a number after a word it can't read to the department before", () => {
    // Found in the browser: the 20 in "Mth 20" was read as ENGL 20.
    expect(parseCourseCodes("English 1A, Mth 20")).toEqual(["ENGL-1A"]);
    expect(unreadWords("English 1A, Mth 20")).toEqual(["Mth", "20"]);
    expect(unknownCourses("English 1A, Mth 20")).toEqual(["ENGL 001A"]);
    expect(parseCourseCodes("Math 71, Calculus 72, 73")).toEqual(["MATH-71"]);
  });

  it("still reads a part that is only a C-number as the department before", () => {
    expect(parseCourseCodes("COMS 010, C1000")).toEqual(["COMS-10", "COMS-C1000"]);
    expect(parseCourseCodes("ENGL 1B, C1000/C1001")).toEqual(["ENGL-1B", "ENGL-C1000", "ENGL-C1001"]);
  });

  it("still gives later numbers in the same part to its department", () => {
    expect(unreadWords("Math 20 through 25")).toEqual(["through"]);
    expect(parseCourseCodes("Math 20 through 25")).toEqual(["MATH-20", "MATH-25"]);
    expect(parseCourseCodes("MATH 020, 021, any 022")).toEqual(["MATH-20", "MATH-21", "MATH-22"]);
  });

  it("splits a range typed after a hyphenated department", () => {
    expect(parseCourseCodes("MATH-020-022")).toEqual(["MATH-20", "MATH-21", "MATH-22"]);
    expect(unknownCourses("MATH-020-022")).toEqual([]);
  });
});
