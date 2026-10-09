import { describe, expect, it } from "vitest";
import { hhmmToMinutes, type Building, type Weekday } from "./centerHours";
import { parseCourseCodes } from "./courseCodes";
import type { Shift } from "./planner";
import { SUBJECT_AREAS, planPublish, type PublishSubmission } from "./publish";

function submission(
  id: number,
  name: string,
  subjectsRaw: string,
  more: Partial<PublishSubmission> = {},
): PublishSubmission {
  return { id, name, subjectsRaw, status: "approved", availabilityChanged: false, ...more };
}

let nextShiftId = 1;
function shift(tutorId: number, building: Building, day: Weekday, start: string, end: string): Shift {
  return {
    id: String(nextShiftId++),
    tutorId,
    building,
    day,
    start: hhmmToMinutes(start),
    end: hhmmToMinutes(end),
  };
}

describe("planPublish", () => {
  it("turns a tutor with shifts into one website tutor with each shift's day, times and room", () => {
    const plan = planPublish(
      [submission(1, "Alex Rivera", "Math 71")],
      [shift(1, "MS-112", "Monday", "09:15", "12:00")],
    );

    expect(plan.tutors).toHaveLength(1);
    expect(plan.tutors[0].name).toBe("Alex Rivera");
    expect(plan.tutors[0].schedules).toEqual([
      { day: "Monday", start: "09:15", end: "12:00", location: "MS-112" },
    ]);
  });

  it("lists a tutor's shifts Monday first, earliest first, whatever order they were placed in", () => {
    const plan = planPublish(
      [submission(1, "Alex Rivera", "Math 71")],
      [
        shift(1, "MS-112", "Wednesday", "13:00", "16:00"),
        shift(1, "MS-112", "Monday", "13:00", "15:00"),
        shift(1, "LE-237", "Monday", "09:00", "11:00"),
      ],
    );

    expect(plan.tutors[0].schedules.map((s) => `${s.day} ${s.start}`)).toEqual([
      "Monday 09:00",
      "Monday 13:00",
      "Wednesday 13:00",
    ]);
  });

  it("writes one subject line per website subject area, with Stats in the Math line", () => {
    const plan = planPublish(
      [submission(1, "Alex Rivera", "Math 71, 72, Stat C1000, Chem 1A")],
      [shift(1, "MS-112", "Monday", "09:00", "12:00")],
    );

    expect(plan.tutors[0].subjects).toHaveLength(2);
    expect(plan.tutors[0].subjects).toEqual(
      expect.arrayContaining([
        { name: "MATH 71-72, STAT C1000", field: "Mathematics" },
        { name: "CHEM 1A", field: "Chemistry" },
      ]),
    );
  });

  it("writes a subject with no course number as just its name, the way William lists them", () => {
    const plan = planPublish(
      [submission(1, "Alex Rivera", "Any English")],
      [shift(1, "LE-237", "Monday", "09:00", "12:00")],
    );

    expect(plan.tutors[0].subjects).toEqual([{ name: "English", field: "English" }]);
  });

  it("names a whole subject by its own name when it shares a section, like Stats with Math", () => {
    const plan = planPublish(
      [submission(1, "Alex Rivera", "Math 071, Chem1A, STAT, CHEM1b")],
      [shift(1, "MS-112", "Monday", "09:00", "12:00")],
    );

    expect(plan.tutors[0].subjects).toEqual(
      expect.arrayContaining([{ name: "Statistics, MATH 71", field: "Mathematics" }]),
    );
  });

  it("writes every whole subject so the public search still finds it", () => {
    for (const department of Object.keys(SUBJECT_AREAS)) {
      // Next to a course in each shared section, where the section's name
      // would read as a different subject. Not its own: "BUS, BUS 71" names
      // one course, not every BUS course.
      const others = ["MATH 71", "BUS 71"].filter((c) => !c.startsWith(`${department} `));
      const plan = planPublish(
        [submission(1, "Alex Rivera", [department, ...others].join(", "))],
        [shift(1, "MS-112", "Monday", "09:00", "12:00")],
      );

      const searchable = plan.tutors[0].subjects.flatMap((s) => parseCourseCodes(s.name));
      expect(searchable, department).toContain(`${department}-*`);
    }
  });

  it("lists Open Computer Lab under its own name", () => {
    const plan = planPublish(
      [submission(1, "Alex Rivera", "Open Computer Lab")],
      [shift(1, "LE-237", "Monday", "09:00", "12:00")],
    );

    expect(plan.tutors[0].subjects).toEqual([
      { name: "Open Computer Lab", field: "Open Computer Lab" },
    ]);
  });

  it("leaves out an approved tutor with no shifts, and names them for the review screen", () => {
    const plan = planPublish(
      [submission(1, "Alex Rivera", "Math 71"), submission(2, "Bo Tran", "Chem 1A")],
      [shift(1, "MS-112", "Monday", "09:00", "12:00")],
    );

    expect(plan.tutors.map((t) => t.name)).toEqual(["Alex Rivera"]);
    expect(plan.noShifts).toEqual([{ id: 2, name: "Bo Tran" }]);
  });

  it("leaves out a tutor whose subjects need review, even with shifts, and names them", () => {
    const plan = planPublish(
      [submission(1, "Alex Rivera", "Math 20 and up")],
      [shift(1, "MS-112", "Monday", "09:00", "12:00")],
    );

    expect(plan.tutors).toEqual([]);
    expect(plan.needsReview).toEqual([{ id: 1, name: "Alex Rivera" }]);
  });

  it("still publishes a tutor who resubmitted after being placed, and names them for a warning", () => {
    const plan = planPublish(
      [submission(1, "Alex Rivera", "Math 71", { status: "pending", availabilityChanged: true })],
      [shift(1, "MS-112", "Monday", "09:00", "12:00")],
    );

    expect(plan.tutors.map((t) => t.name)).toEqual(["Alex Rivera"]);
    expect(plan.availabilityChanged).toEqual([{ id: 1, name: "Alex Rivera" }]);
  });

  it("never publishes or lists a declined tutor, or a pending one William hasn't placed", () => {
    const plan = planPublish(
      [
        submission(1, "Alex Rivera", "Math 71", { status: "declined" }),
        submission(2, "Bo Tran", "Chem 1A", { status: "pending" }),
      ],
      [shift(1, "MS-112", "Monday", "09:00", "12:00")],
    );

    expect(plan).toEqual({ tutors: [], noShifts: [], needsReview: [], availabilityChanged: [] });
  });
});
