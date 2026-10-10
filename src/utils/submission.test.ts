import { describe, expect, it } from "vitest";
import {
  findUnrecognizedSubjects,
  resolveAvailability,
  submissionFlags,
  submissionSchema,
  toResubmissionData,
  toSubmissionData,
  type SubmissionInput,
} from "./submission";
import type { BuildingHours } from "./centerHours";
import { FALL_2026_HOURS } from "./testFixtures";

const validInput = {
  name: "Sam Tutor",
  studentId: "1234567",
  email: "sam@example.com",
  units: 17,
  trainingDone: true,
  subjects: "COMSC-020, COMSC-075",
  availability: [
    { day: "Tuesday", allDay: false, start: "10:00", end: "13:00" },
    { day: "Friday", allDay: true, start: "", end: "" },
  ],
  notes: "",
};

function parse(overrides: Record<string, unknown>, hours: BuildingHours = FALL_2026_HOURS) {
  return submissionSchema(hours).safeParse({ ...validInput, ...overrides });
}

function firstError(overrides: Record<string, unknown>, hours?: BuildingHours) {
  const result = parse(overrides, hours);
  return result.success ? null : result.error.issues[0]?.message;
}

describe("submissionSchema", () => {
  it("accepts the sample reply", () => {
    // "All day" rows arrive with blank times; that has to pass.
    expect(parse({}).success).toBe(true);
  });

  it("keeps the leading zero in a student ID", () => {
    const result = parse({ studentId: "0123456" });
    expect(result.success && result.data.studentId).toBe("0123456");
  });

  it.each(["123456", "12345678", "12a4567", ""])(
    "rejects student ID %j",
    (studentId) => {
      expect(firstError({ studentId })).toBe(
        "Student ID must be exactly 7 digits",
      );
    },
  );

  it("rejects the '10:00 am - 13:00 am' kind of time", () => {
    expect(
      firstError({
        availability: [
          { day: "Tuesday", allDay: false, start: "10:00", end: "10:00" },
        ],
      }),
    ).toBe("Tuesday: end time must be after start time");
  });

  it("rejects times outside the week's hours", () => {
    // In Fall 2026, the first building opens at 8 am and the last closes at 8 pm.
    expect(
      firstError({
        availability: [
          { day: "Friday", allDay: false, start: "07:00", end: "10:00" },
        ],
      }),
    ).toBe("Friday times must be between 8:00 am and 8:00 pm");
  });

  it("accepts evening times on a day every building closes earlier", () => {
    // Every building closes by 5 pm on Fridays, but William still wants to know.
    expect(
      parse({
        availability: [
          { day: "Friday", allDay: false, start: "15:00", end: "20:00" },
        ],
      }).success,
    ).toBe(true);
  });

  it("accepts times from when the first building opens", () => {
    // MS-112 opens at 8 am, an hour before the others.
    expect(
      parse({
        availability: [
          { day: "Monday", allDay: false, start: "08:00", end: "10:00" },
        ],
      }).success,
    ).toBe(true);
  });

  it("rejects a day every building is closed", () => {
    const noFridays = Object.fromEntries(
      Object.entries(FALL_2026_HOURS).map(([b, week]) => [b, { ...week, Friday: undefined }]),
    ) as BuildingHours;
    expect(firstError({}, noFridays)).toBe("Tutoring is closed on Fridays");
  });

  it("accepts quarter-hour times, since real shifts start at 9:15 or 1:45", () => {
    expect(
      parse({
        availability: [
          { day: "Monday", allDay: false, start: "09:15", end: "13:45" },
        ],
      }).success,
    ).toBe(true);
  });

  it("rejects times between the quarter hours", () => {
    expect(
      firstError({
        availability: [
          { day: "Monday", allDay: false, start: "09:00", end: "12:10" },
        ],
      }),
    ).toBe("Times must be in 15-minute steps");
  });

  it("rejects weekends", () => {
    expect(
      parse({
        availability: [
          { day: "Saturday", allDay: true, start: "", end: "" },
        ],
      }).success,
    ).toBe(false);
  });

  it("requires at least one availability row", () => {
    expect(firstError({ availability: [] })).toBe(
      "Add at least one day you are available",
    );
  });

  it("accepts fewer than 6 units; that is a flag, not an error", () => {
    expect(parse({ units: 4 }).success).toBe(true);
  });
});

describe("resolveAvailability", () => {
  it("fills 'all day' with the form's hours", () => {
    expect(
      resolveAvailability(
        [
          { day: "Friday", allDay: true, start: "", end: "" },
          { day: "Tuesday", allDay: true, start: "", end: "" },
        ],
        FALL_2026_HOURS,
      ),
    ).toEqual([
      { day: "Tuesday", allDay: true, start: "08:00", end: "20:00" },
      { day: "Friday", allDay: true, start: "08:00", end: "20:00" },
    ]);
  });

  it("leaves explicit times alone and sorts by day, then start", () => {
    expect(
      resolveAvailability([
        { day: "Wednesday", allDay: false, start: "14:00", end: "16:00" },
        { day: "Monday", allDay: false, start: "12:00", end: "13:00" },
        { day: "Monday", allDay: false, start: "09:00", end: "10:00" },
      ], FALL_2026_HOURS).map((r) => `${r.day} ${r.start}`),
    ).toEqual(["Monday 09:00", "Monday 12:00", "Wednesday 14:00"]);
  });
});

describe("findUnrecognizedSubjects", () => {
  it("reads numbers after a department as that department's courses", () => {
    expect(findUnrecognizedSubjects("MATH 63, 71, Mus 99")).toEqual([]);
  });

  it("does not flag a course listed twice", () => {
    expect(findUnrecognizedSubjects("Math 63, Math 63")).toEqual([]);
  });

  it("flags numbers that follow a word it can't read, not only the word", () => {
    expect(findUnrecognizedSubjects("English 1A, Mth 20, 21")).toEqual(["Mth 20", "21"]);
  });

  it("reads a C-number after a department as that department's course", () => {
    expect(findUnrecognizedSubjects("English C1000, C1001")).toEqual([]);
    expect(findUnrecognizedSubjects("english c1000, c1001, ESL")).toEqual([]);
    expect(
      findUnrecognizedSubjects("English C1000, C1001, Psych C1000, 018, 092, Span 211"),
    ).toEqual([]);
  });

  it("still flags a word with a number on the end", () => {
    expect(findUnrecognizedSubjects("Math 71, Calc2")).toEqual(["Calc2"]);
  });

  it("flags parts that name no known course", () => {
    expect(
      findUnrecognizedSubjects("COMSC 75, Intro to Python, COMPSC 76"),
    ).toEqual(["Intro to Python", "COMPSC 76"]);
  });

  it.each([
    "MATH020, 021, 022, 025, 062, 066/67, 071, 72, 78",
    "PHYSIC 02A/2B, 7A, 7B",
    "CHEM 015, 30A, 01A",
    "MATH STAT C1000, MATH 020, 21-25, 062, 066, 071",
  ])("reads subjects written like William's schedule: %s", (subjects) => {
    expect(findUnrecognizedSubjects(subjects)).toEqual([]);
  });

  it("asks to double-check a part with words the reader can't use", () => {
    // Read as only MATH 20, or any Math, these would quietly be wrong.
    expect(findUnrecognizedSubjects("Math 20 and up, Chem 1A")).toEqual(["Math 20 and up"]);
    expect(findUnrecognizedSubjects("any math up to Calc")).toEqual(["any math up to Calc"]);
  });

  it("leaves course names it can't match to a number for William to check", () => {
    expect(findUnrecognizedSubjects("Calc 1, Precalc")).toEqual(["Calc 1", "Precalc"]);
  });

  it("accepts any Math course and Stats", () => {
    expect(findUnrecognizedSubjects("Math Any, Stats")).toEqual([]);
  });

  it("knows Open Computer Lab, which has no course code", () => {
    expect(findUnrecognizedSubjects("Open Computer Lab, English 1A")).toEqual([]);
    expect(findUnrecognizedSubjects("open lab")).toEqual([]);
  });
});

describe("submissionFlags", () => {
  it("flags under 6 units and unreadable subjects", () => {
    expect(submissionFlags({ units: 5, subjectsRaw: "Python" })).toEqual([
      "under-units",
      "subjects-need-review",
    ]);
  });

  it("has no flags for a clean submission", () => {
    expect(submissionFlags({ units: 6, subjectsRaw: "Math 71" })).toEqual([]);
  });

  it("notes a course that isn't in EVC's catalog, without calling the subjects unreadable", () => {
    expect(submissionFlags({ units: 6, subjectsRaw: "COMSC 9999" })).toEqual([
      "courses-not-in-catalog",
    ]);
    expect(submissionFlags({ units: 6, subjectsRaw: "English 1A, Math 63" })).toEqual([
      "courses-not-in-catalog",
    ]);
  });

  it("gives every flag that applies, in the same order", () => {
    expect(submissionFlags({ units: 3, subjectsRaw: "Mth 71, Math 8000" })).toEqual([
      "under-units",
      "subjects-need-review",
      "courses-not-in-catalog",
    ]);
  });
});

describe("toSubmissionData / toResubmissionData", () => {
  const input = submissionSchema(FALL_2026_HOURS).parse(validInput) as SubmissionInput;

  it("stores the raw subjects, parsed codes and resolved times", () => {
    const data = toSubmissionData(input, FALL_2026_HOURS);
    expect(data.subjectsRaw).toBe("COMSC-020, COMSC-075");
    expect(data.subjectCodes).toEqual(["COMSC-20", "COMSC-75"]);
    expect(data.availability[1]).toEqual({
      day: "Friday",
      allDay: true,
      start: "08:00",
      end: "20:00",
    });
    expect(data.notes).toBeNull();
  });

  it("puts a resubmission back to pending and stamps it", () => {
    const now = new Date("2026-08-21T21:09:00Z");
    const data = toResubmissionData(input, FALL_2026_HOURS, now, false);
    expect(data.status).toBe("pending");
    expect(data.resubmittedAt).toBe(now);
    // Everything the tutor sent replaces what was there, William's edits included.
    expect(data.name).toBe("Sam Tutor");
  });

  it("marks the availability changed only for a tutor already on the planner", () => {
    const now = new Date("2026-08-21T21:09:00Z");
    expect(toResubmissionData(input, FALL_2026_HOURS, now, true).availabilityChanged).toBe(true);
    expect(toResubmissionData(input, FALL_2026_HOURS, now, false).availabilityChanged).toBe(false);
  });
});
