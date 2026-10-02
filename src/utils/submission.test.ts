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

const validInput = {
  name: "Hong Khai Nguyen",
  studentId: "1068957",
  email: "khai@example.com",
  units: 17,
  trainingDone: true,
  subjects: "COMSC-020, COMSC-075",
  availability: [
    { day: "Tuesday", allDay: false, start: "10:00", end: "13:00" },
    { day: "Friday", allDay: true, start: "", end: "" },
  ],
  notes: "",
};

function parse(overrides: Record<string, unknown>) {
  return submissionSchema.safeParse({ ...validInput, ...overrides });
}

function firstError(overrides: Record<string, unknown>) {
  const result = parse(overrides);
  return result.success ? null : result.error.issues[0]?.message;
}

describe("submissionSchema", () => {
  it("accepts the sample reply", () => {
    // "All day" rows arrive with blank times; that has to pass.
    expect(parse({}).success).toBe(true);
  });

  it("keeps the leading zero in a student ID", () => {
    const result = parse({ studentId: "0202849" });
    expect(result.success && result.data.studentId).toBe("0202849");
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

  it("rejects times outside center hours", () => {
    // Friday closes at 5 pm.
    expect(
      firstError({
        availability: [
          { day: "Friday", allDay: false, start: "15:00", end: "18:00" },
        ],
      }),
    ).toBe("Friday times must be within center hours");
  });

  it("rejects times off the half-hour grid", () => {
    expect(
      firstError({
        availability: [
          { day: "Monday", allDay: false, start: "09:15", end: "11:00" },
        ],
      }),
    ).toBe("Times must be on the hour or half hour");
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
  it("fills 'all day' with that day's center hours", () => {
    expect(
      resolveAvailability([
        { day: "Friday", allDay: true, start: "", end: "" },
        { day: "Tuesday", allDay: true, start: "", end: "" },
      ]),
    ).toEqual([
      { day: "Tuesday", allDay: true, start: "09:00", end: "20:00" },
      { day: "Friday", allDay: true, start: "09:00", end: "17:00" },
    ]);
  });

  it("leaves explicit times alone and sorts by day, then start", () => {
    expect(
      resolveAvailability([
        { day: "Wednesday", allDay: false, start: "14:00", end: "16:00" },
        { day: "Monday", allDay: false, start: "12:00", end: "13:00" },
        { day: "Monday", allDay: false, start: "09:00", end: "10:00" },
      ]).map((r) => `${r.day} ${r.start}`),
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

  it("flags parts that name no known course", () => {
    expect(
      findUnrecognizedSubjects("COMSC 75, Intro to Python, COMS 76"),
    ).toEqual(["Intro to Python", "COMS 76"]);
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
    expect(submissionFlags({ units: 6, subjectsRaw: "Math 63" })).toEqual([]);
  });
});

describe("toSubmissionData / toResubmissionData", () => {
  const input = submissionSchema.parse(validInput) as SubmissionInput;

  it("stores the raw subjects, parsed codes and resolved times", () => {
    const data = toSubmissionData(input);
    expect(data.subjectsRaw).toBe("COMSC-020, COMSC-075");
    expect(data.subjectCodes).toEqual(["COMSC-20", "COMSC-75"]);
    expect(data.availability[1]).toEqual({
      day: "Friday",
      allDay: true,
      start: "09:00",
      end: "17:00",
    });
    expect(data.notes).toBeNull();
  });

  it("puts a resubmission back to pending and stamps it", () => {
    const now = new Date("2026-08-21T21:09:00Z");
    const data = toResubmissionData(input, now, false);
    expect(data.status).toBe("pending");
    expect(data.resubmittedAt).toBe(now);
    // Everything the tutor sent replaces what was there, William's edits included.
    expect(data.name).toBe("Hong Khai Nguyen");
  });

  it("marks the availability changed only for a tutor already on the planner", () => {
    const now = new Date("2026-08-21T21:09:00Z");
    expect(toResubmissionData(input, now, true).availabilityChanged).toBe(true);
    expect(toResubmissionData(input, now, false).availabilityChanged).toBe(false);
  });
});
