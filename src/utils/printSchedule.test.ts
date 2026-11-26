import { describe, expect, it } from "vitest";
import {
  buildPrintSchedule,
  formatRange,
  printLocations,
  printHeading,
  printTitle,
  campusLocations,
  termDateRange,
  type PrintTutor,
} from "./printSchedule";

const MS_SQ = ["MS-112", "SQ-231"];
const ALL = ["MS-112", "LE-237", "SQ-231", "VPA-109/111"];

function person(
  name: string,
  type: PrintTutor["type"],
  subjects: [field: string, name: string][],
  shifts: [day: string, start: string, end: string, location?: string][],
): PrintTutor {
  return {
    name,
    type,
    subjects: subjects.map(([field, subject]) => ({ field, name: subject })),
    schedule: shifts.map(([day, start, end, location = "MS-112"]) => ({ day, start, end, location })),
  };
}

const tutor = (name: string, subjects: [string, string][], shifts: [string, string, string, string?][]) =>
  person(name, "tutor", subjects, shifts);

/** The only section's only person, for tests about one line. */
function onlyPerson(tutors: PrintTutor[], locations = ALL) {
  const sections = buildPrintSchedule(tutors, locations);
  expect(sections).toHaveLength(1);
  expect(sections[0].people).toHaveLength(1);
  return sections[0].people[0];
}

describe("formatRange", () => {
  it("drops the first am/pm when both times share it, as William writes them", () => {
    expect(formatRange("12:00", "18:00")).toBe("12:00-6:00pm");
    expect(formatRange("09:30", "11:30")).toBe("9:30-11:30am");
  });

  it("keeps both when the range crosses noon", () => {
    expect(formatRange("10:00", "12:00")).toBe("10:00am-12:00pm");
    expect(formatRange("11:00", "13:00")).toBe("11:00am-1:00pm");
    expect(formatRange("09:15", "12:15")).toBe("9:15am-12:15pm");
  });

  it("drops :00 in the short style used for staff", () => {
    expect(formatRange("09:00", "18:00", "short")).toBe("9am-6pm");
    expect(formatRange("17:00", "20:00", "short")).toBe("5-8pm");
    expect(formatRange("11:30", "20:00", "short")).toBe("11:30am-8pm");
  });

  it("reads midnight as 12 am", () => {
    expect(formatRange("00:00", "01:00")).toBe("12:00-1:00am");
  });

  it("prints a time it can't read as it was stored, instead of guessing", () => {
    expect(formatRange("9am", "11:00")).toBe("9am-11:00");
    expect(formatRange("", "")).toBe("-");
  });
});

describe("a student tutor's bullets", () => {
  it("joins days that have the same hours", () => {
    const p = onlyPerson([
      tutor("Alex Rivera", [["Chemistry", "CHEM 015"]], [
        ["Monday", "12:00", "18:00"],
        ["Wednesday", "12:00", "18:00"],
      ]),
    ]);
    expect(p.hours).toEqual(["Mon/Wed 12:00-6:00pm (in MS-112)"]);
  });

  it("gives days with different hours their own bullets, Monday first", () => {
    const p = onlyPerson([
      tutor("Alex Rivera", [["Chemistry", "CHEM 015"]], [
        ["Thursday", "13:45", "16:00"],
        ["Wednesday", "09:00", "12:00"],
        ["Tuesday", "13:45", "16:00"],
        ["Monday", "09:00", "12:00"],
      ]),
    ]);
    expect(p.hours).toEqual([
      "Mon/Wed 9:00am-12:00pm (in MS-112)",
      "Tues/Thurs 1:45-4:00pm (in MS-112)",
    ]);
  });

  it("puts two shifts on one day on the same bullet, earliest first", () => {
    const p = onlyPerson([
      tutor("Alex Rivera", [["Chemistry", "CHEM 015"]], [
        ["Tuesday", "16:00", "20:00"],
        ["Tuesday", "08:00", "12:00"],
        ["Thursday", "08:00", "11:00"],
      ]),
    ]);
    expect(p.hours).toEqual([
      "Tues 8:00am-12:00pm, 4:00-8:00pm (in MS-112)",
      "Thurs 8:00-11:00am (in MS-112)",
    ]);
  });

  it("joins days only when every shift on them matches", () => {
    const p = onlyPerson([
      tutor("Alex Rivera", [["Chemistry", "CHEM 015"]], [
        ["Tuesday", "08:00", "12:00"],
        ["Tuesday", "16:00", "20:00"],
        ["Thursday", "08:00", "12:00"],
        ["Thursday", "16:00", "20:00"],
        ["Friday", "08:00", "12:00"],
      ]),
    ]);
    expect(p.hours).toEqual([
      "Tues/Thurs 8:00am-12:00pm, 4:00-8:00pm (in MS-112)",
      "Fri 8:00am-12:00pm (in MS-112)",
    ]);
  });

  it("names Sequoia the way William's document does", () => {
    const p = onlyPerson([
      tutor("Alex Rivera", [["Biology", "BIOL 071, 072"]], [["Friday", "09:00", "13:00", "SQ-231"]]),
    ]);
    expect(p.hours).toEqual(["Fri 9:00am-1:00pm (in SQ-231 in Sequoia building)"]);
  });

  it("keeps shifts in different rooms on different bullets, even on the same day", () => {
    const p = onlyPerson([
      tutor("Alex Rivera", [["Mathematics", "MATH 071"]], [
        ["Monday", "13:00", "15:00", "LE-237"],
        ["Monday", "09:00", "11:00", "MS-112"],
      ]),
    ]);
    expect(p.hours).toEqual([
      "Mon 9:00-11:00am (in MS-112)",
      "Mon 1:00-3:00pm (in LE-237)",
    ]);
  });

  it("prints a shift with no day without a stray space", () => {
    const p = onlyPerson([
      tutor("Alex Rivera", [["Mathematics", "MATH 071"]], [["", "09:00", "11:00"]]),
    ]);
    expect(p.hours).toEqual(["9:00-11:00am (in MS-112)"]);
  });

  it("prints a shift entered twice only once", () => {
    const p = onlyPerson([
      tutor("Alex Rivera", [["Mathematics", "MATH 071"]], [
        ["Monday", "09:00", "11:00"],
        ["Monday", "09:00", "11:00"],
      ]),
    ]);
    expect(p.hours).toEqual(["Mon 9:00-11:00am (in MS-112)"]);
  });

  it("lists only the courses that belong to the section", () => {
    const sections = buildPrintSchedule(
      [
        tutor("Alex Rivera", [["Chemistry", "CHEM 015, 030A"], ["Physics", "PHYS 002A"]], [
          ["Monday", "12:00", "18:00"],
        ]),
      ],
      ALL,
    );
    expect(sections.map((s) => [s.field, s.people[0].detail])).toEqual([
      ["Chemistry", "CHEM 015, 030A"],
      ["Physics", "PHYS 002A"],
    ]);
  });

  it("joins two subject lines in the same section with a comma", () => {
    const p = onlyPerson([
      tutor("Alex Rivera", [["Mathematics", "MATH 071, 072"], ["Mathematics", "MATH 020"]], [
        ["Monday", "12:00", "18:00"],
      ]),
    ]);
    expect(p.detail).toBe("MATH 071, 072, MATH 020");
  });
});

describe("professor and staff lines", () => {
  it("writes a professor's days in full, with every subject they cover", () => {
    const p = onlyPerson(
      [
        person("Professor Park", "professor", [["Mathematics", "Mathematics"]], [
          ["Wednesday", "11:00", "13:00"],
          ["Monday", "11:00", "13:00"],
        ]),
      ],
    );
    expect(p).toEqual({
      type: "professor",
      name: "Professor Park",
      detail: "Mathematics",
      hours: ["Mondays/Wednesdays 11:00am-1:00pm"],
    });
  });

  it("names all of a professor's subjects under each section they appear in", () => {
    const sections = buildPrintSchedule(
      [
        person("Professor Park", "professor", [["Physics", "Physics"], ["Astronomy", "Astronomy"]], [
          ["Thursday", "11:00", "12:00"],
        ]),
      ],
      ALL,
    );
    expect(sections.map((s) => [s.field, s.people[0].detail])).toEqual([
      ["Astronomy", "Physics/Astronomy"],
      ["Physics", "Physics/Astronomy"],
    ]);
  });

  it("names a subject only once when it is entered twice", () => {
    const p = onlyPerson([
      person("Professor Park", "professor", [["Biology", "All Biology"], ["Biology", "All Biology"]], [
        ["Tuesday", "12:00", "13:30", "SQ-231"],
      ]),
    ]);
    expect(p.detail).toBe("All Biology");
  });

  it("keeps a professor's different hours on one line, Monday first", () => {
    const p = onlyPerson([
      person("Professor Park", "professor", [["Computer Science", "Computer Science"]], [
        ["Thursday", "12:00", "15:00"],
        ["Monday", "13:00", "15:00"],
      ]),
    ]);
    expect(p.hours).toEqual(["Mondays 1:00-3:00pm, Thursdays 12:00-3:00pm"]);
  });

  it("writes staff days as letters and drops :00, as William does", () => {
    const p = onlyPerson([
      person("Casey Morgan", "staff", [["Mathematics", "Math Instructional Assistant, All Math"]], [
        ["Tuesday", "11:30", "20:00"],
        ["Wednesday", "17:00", "20:00"],
        ["Thursday", "11:30", "20:00"],
      ]),
    ]);
    expect(p.detail).toBe("Math Instructional Assistant, All Math");
    expect(p.hours).toEqual(["TTh 11:30am-8pm, Wed 5-8pm"]);
  });

  it("writes four and five staff days as letters", () => {
    const fourDays = onlyPerson([
      person("Casey Morgan", "staff", [["Mathematics", "Lab Lead"]], [
        ["Monday", "09:00", "18:00"],
        ["Tuesday", "09:00", "18:00"],
        ["Wednesday", "09:00", "18:00"],
        ["Thursday", "09:00", "18:00"],
        ["Friday", "09:00", "17:00"],
      ]),
    ]);
    expect(fourDays.hours).toEqual(["MTWTh 9am-6pm, Fri 9am-5pm"]);

    const fiveDays = onlyPerson([
      person("Casey Morgan", "staff", [["Mathematics", "Lab Lead"]], [
        ["Monday", "08:00", "17:00"],
        ["Tuesday", "08:00", "17:00"],
        ["Wednesday", "08:00", "17:00"],
        ["Thursday", "08:00", "17:00"],
        ["Friday", "08:00", "17:00"],
      ]),
    ]);
    expect(fiveDays.hours).toEqual(["MTWThF 8am-5pm"]);
  });
});

describe("buildPrintSchedule", () => {
  it("lists sections alphabetically, each naming its room", () => {
    const sections = buildPrintSchedule(
      [
        tutor("Alex Rivera", [["Physics", "PHYS 002A"]], [["Monday", "09:00", "11:00"]]),
        tutor("Sam Lee", [["Biology", "BIOL 071"]], [["Monday", "09:00", "11:00", "SQ-231"]]),
        tutor("Jordan Diaz", [["English", "ENGL C1000"]], [["Monday", "09:00", "11:00", "LE-237"]]),
      ],
      ALL,
    );
    expect(sections.map((s) => [s.field, s.room])).toEqual([
      ["Biology", "Biology Skills Lab – BSL, SQ-231 of Sequoia"],
      ["English", "LE-237"],
      ["Physics", "Math and Science Resource Center-MSRC, MS-112 of MS3"],
    ]);
    expect(sections.map((s) => s.locations)).toEqual([["SQ-231"], ["LE-237"], ["MS-112"]]);
  });

  it("names every room a section's shifts are in, in building order", () => {
    const sections = buildPrintSchedule(
      [
        tutor("Alex Rivera", [["Mathematics", "MATH 071"]], [["Monday", "09:00", "11:00", "LE-237"]]),
        tutor("Sam Lee", [["Mathematics", "MATH 020"]], [["Monday", "09:00", "11:00", "MS-112"]]),
      ],
      ALL,
    );
    expect(sections[0].room).toBe("Math and Science Resource Center-MSRC, MS-112 of MS3; LE-237");
    expect(sections[0].locations).toEqual(["MS-112", "LE-237"]);
  });

  it("puts professors first, then staff, then student tutors, each alphabetical", () => {
    const sections = buildPrintSchedule(
      [
        tutor("zoe Tran", [["Mathematics", "MATH 071"]], [["Monday", "09:00", "11:00"]]),
        person("Professor Yu", "professor", [["Mathematics", "Mathematics"]], [["Monday", "09:00", "11:00"]]),
        tutor("Alex Rivera", [["Mathematics", "MATH 020"]], [["Monday", "09:00", "11:00"]]),
        person("Casey Morgan", "staff", [["Mathematics", "Lab Lead"]], [["Monday", "09:00", "11:00"]]),
        person("Professor Adams", "professor", [["Mathematics", "Mathematics"]], [["Monday", "09:00", "11:00"]]),
        tutor("Mia Lopez", [["Mathematics", "MATH 062"]], [["Monday", "09:00", "11:00"]]),
      ],
      ALL,
    );
    expect(sections[0].people.map((p) => p.name)).toEqual([
      "Professor Adams",
      "Professor Yu",
      "Casey Morgan",
      "Alex Rivera",
      "Mia Lopez",
      "zoe Tran",
    ]);
  });

  it("treats someone without a type as a student tutor", () => {
    const p = onlyPerson([person("Alex Rivera", undefined, [["Mathematics", "MATH 071"]], [["Monday", "09:00", "11:00"]])]);
    expect(p.type).toBe("tutor");
    expect(p.hours).toEqual(["Mon 9:00-11:00am (in MS-112)"]);
  });

  it("prints only the shifts in the ticked buildings", () => {
    const p = onlyPerson(
      [
        tutor("Alex Rivera", [["Mathematics", "MATH 071"]], [
          ["Monday", "09:00", "11:00", "MS-112"],
          ["Tuesday", "09:00", "11:00", "LE-237"],
        ]),
      ],
      MS_SQ,
    );
    expect(p.hours).toEqual(["Mon 9:00-11:00am (in MS-112)"]);
  });

  it("leaves out people with no shifts in the ticked buildings, and sections left empty", () => {
    const sections = buildPrintSchedule(
      [
        tutor("Alex Rivera", [["English", "ENGL C1000"]], [["Monday", "09:00", "11:00", "LE-237"]]),
        tutor("Sam Lee", [["Mathematics", "MATH 071"]], [["Monday", "09:00", "11:00", "LE-237"]]),
        tutor("Mia Lopez", [["Mathematics", "MATH 020"]], [["Monday", "09:00", "11:00", "MS-112"]]),
        person("Professor Park", "professor", [["Mathematics", "Mathematics"]], []),
      ],
      MS_SQ,
    );
    expect(sections.map((s) => s.field)).toEqual(["Mathematics"]);
    expect(sections[0].people.map((p) => p.name)).toEqual(["Mia Lopez"]);
  });

  it("prints nothing when no building is ticked", () => {
    const sections = buildPrintSchedule(
      [tutor("Alex Rivera", [["Mathematics", "MATH 071"]], [["Monday", "09:00", "11:00"]])],
      [],
    );
    expect(sections).toEqual([]);
  });

  it("prints a room it doesn't know by its own name", () => {
    const p = onlyPerson(
      [tutor("Alex Rivera", [["Mathematics", "MATH 071"]], [["Monday", "09:00", "11:00", "Online"]])],
      ["Online"],
    );
    expect(p.hours).toEqual(["Mon 9:00-11:00am (in Online)"]);
  });
});

describe("printLocations", () => {
  it("offers the four buildings, then any other room on the schedule", () => {
    expect(
      printLocations([
        tutor("Alex Rivera", [["Mathematics", "MATH 071"]], [
          ["Monday", "09:00", "11:00", "Online"],
          ["Monday", "09:00", "11:00", "MS-112"],
        ]),
      ]),
    ).toEqual(["MS-112", "LE-237", "SQ-231", "VPA-109/111", "Online"]);
  });

  it("always offers the four buildings, even with nobody on the schedule", () => {
    expect(printLocations([])).toEqual(ALL);
  });
});

describe("printTitle", () => {
  it("uses William's title for MS and SQ, whatever order they were ticked in", () => {
    const stem = "Fall 2026 Math and Science (STEM) Faculty/Staff/Tutor Tutoring Schedule";
    expect(printTitle("Fall 2026", ["MS-112", "SQ-231"])).toBe(stem);
    expect(printTitle("Fall 2026", ["SQ-231", "MS-112"])).toBe(stem);
  });

  it("names one building's own schedule", () => {
    expect(printTitle("Fall 2026", ["SQ-231"])).toBe("Fall 2026 Biology Tutoring Schedule");
    expect(printTitle("Fall 2026", ["LE-237"])).toBe("Fall 2026 Campus Tutoring Center Schedule");
    expect(printTitle("Fall 2026", ["VPA-109/111"])).toBe("Fall 2026 Music Tutoring Schedule");
  });

  it("falls back to a plain title for any other mix", () => {
    expect(printTitle("Fall 2026", ["MS-112"])).toBe("Fall 2026 Tutoring Schedule");
    expect(printTitle("Fall 2026", ALL)).toBe("Fall 2026 Tutoring Schedule");
    expect(printTitle("Fall 2026", ["MS-112", "SQ-231", "Online"])).toBe("Fall 2026 Tutoring Schedule");
  });

  it("leaves the term out when no term is active", () => {
    expect(printTitle(null, ["SQ-231"])).toBe("Biology Tutoring Schedule");
  });
});

describe("printHeading", () => {
  it("uses the website team's title when every kind of room is mixed", () => {
    expect(printHeading("Fall 2026", ALL)).toBe("EVC Campus Tutoring Drop-In schedule, Fall 2026");
    expect(printHeading("Fall 2026", ["MS-112", "LE-237"])).toBe(
      "EVC Campus Tutoring Drop-In schedule, Fall 2026",
    );
  });

  it("keeps William's own titles for one building or MS + SQ", () => {
    expect(printHeading("Fall 2026", MS_SQ)).toBe(printTitle("Fall 2026", MS_SQ));
    expect(printHeading("Fall 2026", ["SQ-231"])).toBe("Fall 2026 Biology Tutoring Schedule");
  });

  it("leaves the term out when no term is active", () => {
    expect(printHeading(null, ALL)).toBe("EVC Campus Tutoring Drop-In schedule");
  });
});

describe("termDateRange", () => {
  it("writes a term inside one year like the website team does", () => {
    expect(termDateRange("2026-08-31", "2026-12-10")).toEqual({
      from: { date: "August 31", suffix: "st", year: null },
      to: { date: "December 10", suffix: "th", year: 2026 },
    });
  });

  it("gives both years when a term crosses New Year", () => {
    expect(termDateRange("2026-12-14", "2027-01-22")).toEqual({
      from: { date: "December 14", suffix: "th", year: 2026 },
      to: { date: "January 22", suffix: "nd", year: 2027 },
    });
  });

  it("uses st, nd, rd and th like English does, including 11th to 13th", () => {
    const suffix = (day: number) =>
      termDateRange(`2026-01-${String(day).padStart(2, "0")}`, "2026-02-01")!.from.suffix;
    const expected: Record<number, string> = {
      1: "st", 2: "nd", 3: "rd", 4: "th", 10: "th", 11: "th", 12: "th", 13: "th",
      14: "th", 20: "th", 21: "st", 22: "nd", 23: "rd", 24: "th", 30: "th", 31: "st",
    };
    for (const [day, want] of Object.entries(expected)) expect(suffix(Number(day))).toBe(want);
  });

  it("gives up rather than print a wrong date", () => {
    expect(termDateRange(null, "2026-12-10")).toBeNull();
    expect(termDateRange("2026-08-31", undefined)).toBeNull();
    expect(termDateRange("", "2026-12-10")).toBeNull();
    expect(termDateRange("2026-13-01", "2026-12-10")).toBeNull();
    expect(termDateRange("2026-02-30", "2026-12-10")).toBeNull();
    expect(termDateRange("2026-08-00", "2026-12-10")).toBeNull();
    expect(termDateRange("Aug 31", "2026-12-10")).toBeNull();
    expect(termDateRange("2026-08-31T00:00:00.000Z", "2026-12-10")).toBeNull();
  });

  it("reads every real day of a leap year and an ordinary year", () => {
    for (const year of [2027, 2028]) {
      const day = new Date(Date.UTC(year, 0, 1));
      while (day.getUTCFullYear() === year) {
        const iso = day.toISOString().slice(0, 10);
        const range = termDateRange(iso, `${year}-12-31`);
        expect(range, iso).not.toBeNull();
        expect(range!.from.date.endsWith(` ${day.getUTCDate()}`), iso).toBe(true);
        day.setUTCDate(day.getUTCDate() + 1);
      }
    }
  });
});

describe("campusLocations", () => {
  it("names the rooms the way the website team's schedule does, in its order", () => {
    expect(campusLocations(["MS-112", "SQ-231", "LE-237"])).toBe(
      "Campus Tutoring in LE-237 (Library building), the Math and Science Resource Center (MSRC) in MS-112 (MS3 building), and the Biology Lab in SQ-231 (Sequoia building)",
    );
  });

  it("joins one or two rooms without a list comma", () => {
    expect(campusLocations(["SQ-231"])).toBe("the Biology Lab in SQ-231 (Sequoia building)");
    expect(campusLocations(MS_SQ)).toBe(
      "the Math and Science Resource Center (MSRC) in MS-112 (MS3 building) and the Biology Lab in SQ-231 (Sequoia building)",
    );
  });

  it("prints a room it has no name for as itself, after the named ones", () => {
    expect(campusLocations(["VPA-109/111", "LE-237"])).toBe(
      "Campus Tutoring in LE-237 (Library building) and VPA-109/111",
    );
  });

  it("is empty when nothing is ticked", () => {
    expect(campusLocations([])).toBe("");
  });
});
