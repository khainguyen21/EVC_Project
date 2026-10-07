import { describe, expect, it } from "vitest";
import { hhmmToMinutes, type Weekday } from "./centerHours";
import type { AvailabilityRow } from "./submission";
import {
  addsNothingNew,
  buildingWeeklyMinutes,
  buildingsFor,
  coverageAt,
  hoursColor,
  moveShift,
  resizeShift,
  shiftForDrop,
  shiftProblem,
  shiftWarnings,
  sortByFewestHours,
  tutorCourses,
  weeklyMinutes,
  type Building,
  type PlannerTutor,
  type Shift,
} from "./planner";

function tutor(id: number, courses: string[], availability: AvailabilityRow[] = []): PlannerTutor {
  return { id, courses, availability };
}

let nextShiftId = 1;
function shift(
  tutorId: number,
  building: Building,
  day: Weekday,
  start: string,
  end: string,
): Shift {
  return {
    id: String(nextShiftId++),
    tutorId,
    building,
    day,
    start: hhmmToMinutes(start),
    end: hhmmToMinutes(end),
  };
}

const at = hhmmToMinutes;

function free(day: Weekday, start: string, end: string): AvailabilityRow {
  return { day, allDay: false, start, end };
}

describe("buildingsFor", () => {
  it("puts a tutor in every building one of their courses is taught in", () => {
    expect(buildingsFor(["BIOL-71", "CHEM-1A", "ENGL-1A"])).toEqual([
      "MS-112",
      "LE-237",
      "SQ-231",
    ]);
  });
});

describe("tutorCourses", () => {
  it("counts Open Computer Lab as an LE course even though it has no code", () => {
    const courses = tutorCourses({ subjectCodes: [], subjectsRaw: "Open Computer Lab" });
    expect(buildingsFor(courses)).toEqual(["LE-237"]);
  });

  it("gives a tutor whose subjects name no course no building", () => {
    const courses = tutorCourses({ subjectCodes: [], subjectsRaw: "Calculus and anatomy" });
    expect(buildingsFor(courses)).toEqual([]);
  });

  it("counts nothing until William fixes subjects that need review", () => {
    const courses = tutorCourses({ subjectCodes: ["MATH-71"], subjectsRaw: "Math 71, Calculus" });
    expect(courses).toEqual([]);
  });
});

describe("coverageAt", () => {
  it("counts a Calc tutor and a Stat tutor as two, meeting the MS goal", () => {
    const tutors = [tutor(1, ["MATH-71"]), tutor(2, ["STAT-C1000"])];
    const shifts = [
      shift(1, "MS-112", "Monday", "10:00", "12:00"),
      shift(2, "MS-112", "Monday", "10:00", "12:00"),
    ];
    expect(coverageAt(tutors, shifts, "MS-112", "Monday", at("10:30"))).toMatchObject({
      count: 2,
      goal: 2,
      sameSubjects: [],
    });
  });

  it("counts two tutors with the same subjects as one and flags both", () => {
    const tutors = [tutor(1, ["MATH-71"]), tutor(2, ["MATH-71"])];
    const shifts = [
      shift(1, "MS-112", "Monday", "10:00", "12:00"),
      shift(2, "MS-112", "Monday", "11:00", "13:00"),
    ];
    expect(coverageAt(tutors, shifts, "MS-112", "Monday", at("11:15"))).toMatchObject({
      count: 1,
      sameSubjects: [1, 2],
    });
  });

  it("doesn't count a tutor whose courses someone there already covers", () => {
    const kevin = tutor(1, ["MATH-71", "MATH-72", "MATH-73"]);
    const olivia = tutor(2, ["MATH-71"]);
    const shifts = [
      shift(1, "MS-112", "Tuesday", "09:00", "11:00"),
      shift(2, "MS-112", "Tuesday", "09:00", "11:00"),
    ];
    expect(coverageAt([kevin, olivia], shifts, "MS-112", "Tuesday", at("09:00"))).toMatchObject({
      count: 1,
      sameSubjects: [2],
    });
  });

  it("counts the fewest tutors who cover every course when lists overlap", () => {
    const tutors = [
      tutor(1, ["MATH-71", "MATH-72"]),
      tutor(2, ["MATH-72", "MATH-73"]),
      tutor(3, ["MATH-71", "MATH-73"]),
    ];
    const shifts = [1, 2, 3].map((id) => shift(id, "MS-112", "Monday", "13:00", "15:00"));
    expect(coverageAt(tutors, shifts, "MS-112", "Monday", at("14:00"))).toMatchObject({
      count: 2,
      sameSubjects: [1, 2, 3],
    });
  });

  it("only counts the courses taught in that building", () => {
    const chemAndEnglish = tutor(1, ["CHEM-1A", "ENGL-1A"]);
    const biologyOnly = tutor(2, ["BIOL-71"]);
    const shifts = [
      shift(1, "MS-112", "Wednesday", "10:00", "12:00"),
      shift(2, "MS-112", "Wednesday", "10:00", "12:00"),
    ];
    expect(
      coverageAt([chemAndEnglish, biologyOnly], shifts, "MS-112", "Wednesday", at("10:00")),
    ).toEqual({ count: 1, goal: 2, courses: ["CHEM-1A"], sameSubjects: [] });
  });

  it("treats a tutor for any course in a department as covering its numbered courses", () => {
    const anyChemistry = tutor(1, ["CHEM-*"]);
    const chem1A = tutor(2, ["CHEM-1A"]);
    const shifts = [
      shift(1, "MS-112", "Friday", "09:00", "11:00"),
      shift(2, "MS-112", "Friday", "09:00", "11:00"),
    ];
    expect(coverageAt([anyChemistry, chem1A], shifts, "MS-112", "Friday", at("10:00"))).toMatchObject({
      count: 1,
      sameSubjects: [2],
    });
  });

  it("only counts shifts in that building on that day, not ones that just ended", () => {
    const tutors = [tutor(1, ["BIOL-71"]), tutor(2, ["BIOL-72"])];
    const shifts = [
      shift(1, "SQ-231", "Thursday", "08:00", "10:00"),
      shift(2, "SQ-231", "Tuesday", "10:00", "12:00"),
    ];
    expect(coverageAt(tutors, shifts, "SQ-231", "Thursday", at("10:00"))).toEqual({
      count: 0,
      goal: 1,
      courses: [],
      sameSubjects: [],
    });
  });
});

describe("shiftWarnings", () => {
  const linh = tutor(1, ["COMSC-75"], [free("Tuesday", "09:00", "12:00"), free("Tuesday", "15:00", "18:00")]);

  it("warns when a shift runs past the tutor's free time", () => {
    expect(shiftWarnings(shift(1, "MS-112", "Tuesday", "11:00", "13:00"), linh)).toEqual([
      "outside-availability",
    ]);
  });

  it("treats back-to-back free times as one stretch", () => {
    const backToBack = tutor(2, ["MATH-71"], [free("Monday", "09:00", "12:00"), free("Monday", "12:00", "15:00")]);
    expect(shiftWarnings(shift(2, "MS-112", "Monday", "11:00", "13:00"), backToBack)).toEqual([]);
  });

  it("warns when none of the tutor's courses are taught in that building", () => {
    const mondays = [free("Monday", "09:00", "15:00")];
    const biologyOnly = tutor(3, ["BIOL-71"], mondays);
    const maiLe = tutor(4, ["BIOL-71", "CHEM-1A", "ENGL-1A"], mondays);
    expect(shiftWarnings(shift(3, "MS-112", "Monday", "09:00", "11:00"), biologyOnly)).toEqual([
      "wrong-building",
    ]);
    expect(shiftWarnings(shift(4, "LE-237", "Monday", "09:00", "11:00"), maiLe)).toEqual([]);
  });

  it("says the subjects need fixing rather than blaming the building", () => {
    const unreadable = tutor(5, [], [free("Tuesday", "14:00", "18:00")]);
    expect(shiftWarnings(shift(5, "MS-112", "Tuesday", "14:00", "16:00"), unreadable)).toEqual([
      "unknown-subjects",
    ]);
  });
});

describe("shiftForDrop", () => {
  it("makes a three-hour shift starting where the card is dropped, like William's 1-4", () => {
    const alex = tutor(1, ["MATH-71"], [free("Monday", "09:00", "18:00")]);
    expect(shiftForDrop(alex, [], "Monday", at("13:00"))).toEqual({
      start: at("13:00"),
      end: at("16:00"),
    });
  });

  it("shrinks to fit the tutor's free time, but never below an hour", () => {
    const maria = tutor(2, ["ENGL-1A"], [free("Tuesday", "09:00", "10:30")]);
    expect(shiftForDrop(maria, [], "Tuesday", at("09:00"))).toEqual({
      start: at("09:00"),
      end: at("10:30"),
    });
    const briefly = tutor(3, ["ENGL-1A"], [free("Tuesday", "09:00", "09:30")]);
    expect(shiftForDrop(briefly, [], "Tuesday", at("09:00"))).toEqual({
      start: at("09:00"),
      end: at("10:00"),
    });
  });

  it("stops at closing time, and makes nothing if under an hour is left", () => {
    const kevin = tutor(4, ["MATH-71"], [free("Friday", "09:00", "17:00")]);
    expect(shiftForDrop(kevin, [], "Friday", at("16:00"))).toEqual({
      start: at("16:00"),
      end: at("17:00"),
    });
    expect(shiftForDrop(kevin, [], "Friday", at("16:30"))).toBeNull();
  });

  it("never overlaps another shift of the same tutor", () => {
    const kevin = tutor(4, ["MATH-71"], [free("Monday", "09:00", "18:00")]);
    const shifts = [
      shift(4, "MS-112", "Monday", "11:00", "13:00"),
      shift(9, "MS-112", "Monday", "10:00", "12:00"),
      shift(4, "MS-112", "Tuesday", "10:00", "12:00"),
    ];
    expect(shiftForDrop(kevin, shifts, "Monday", at("10:00"))).toEqual({
      start: at("10:00"),
      end: at("11:00"),
    });
    expect(shiftForDrop(kevin, shifts, "Monday", at("10:30"))).toBeNull();
    expect(shiftForDrop(kevin, shifts, "Monday", at("11:30"))).toBeNull();
  });

  it("starts at the quarter hour the card was dropped in", () => {
    const alex = tutor(1, ["MATH-71"], [free("Monday", "09:00", "18:00")]);
    expect(shiftForDrop(alex, [], "Monday", at("10:14"))).toEqual({
      start: at("10:00"),
      end: at("13:00"),
    });
  });
});

describe("moveShift", () => {
  it("keeps the shift's length and snaps it to the nearest quarter hour", () => {
    const monday = shift(1, "MS-112", "Monday", "10:00", "12:00");
    expect(moveShift(monday, [monday], "Tuesday", "LE-237", at("14:05"))).toEqual({
      ...monday,
      day: "Tuesday",
      building: "LE-237",
      start: at("14:00"),
      end: at("16:00"),
    });
  });

  it("stays inside center hours", () => {
    const monday = shift(1, "MS-112", "Monday", "10:00", "12:00");
    expect(moveShift(monday, [monday], "Friday", "MS-112", at("16:00"))).toMatchObject({
      start: at("15:00"),
      end: at("17:00"),
    });
  });

  it("refuses to put a tutor in two places at once", () => {
    const monday = shift(1, "MS-112", "Monday", "10:00", "12:00");
    const tuesday = shift(1, "LE-237", "Tuesday", "15:00", "17:00");
    const shifts = [monday, tuesday];
    expect(moveShift(monday, shifts, "Tuesday", "MS-112", at("14:00"))).toBeNull();
    expect(moveShift(monday, shifts, "Monday", "MS-112", at("11:00"))).toMatchObject({
      start: at("11:00"),
      end: at("13:00"),
    });
  });

  it("refuses a shift longer than that day's center hours", () => {
    const allTuesday = shift(1, "MS-112", "Tuesday", "09:00", "20:00");
    expect(moveShift(allTuesday, [allTuesday], "Friday", "MS-112", at("09:00"))).toBeNull();
  });
});

describe("resizeShift", () => {
  it("ends at the nearest quarter hour", () => {
    const monday = shift(1, "MS-112", "Monday", "10:00", "12:00");
    expect(resizeShift(monday, [monday], at("13:05"))).toEqual({ ...monday, end: at("13:00") });
    expect(resizeShift(monday, [monday], at("13:10"))).toEqual({ ...monday, end: at("13:15") });
  });

  it("stays at least an hour long, inside center hours, and before the tutor's next shift", () => {
    const morning = shift(1, "MS-112", "Friday", "10:00", "12:00");
    const afternoon = shift(1, "LE-237", "Friday", "14:00", "16:00");
    const shifts = [morning, afternoon];
    expect(resizeShift(morning, shifts, at("10:20")).end).toBe(at("11:00"));
    expect(resizeShift(morning, shifts, at("15:00")).end).toBe(at("14:00"));
    expect(resizeShift(afternoon, shifts, at("18:00")).end).toBe(at("17:00"));
  });
});

describe("weeklyMinutes", () => {
  it("adds up a tutor's shifts across the week", () => {
    const shifts = [
      shift(1, "MS-112", "Monday", "10:00", "12:00"),
      shift(1, "MS-112", "Wednesday", "09:00", "10:30"),
      shift(1, "LE-237", "Friday", "09:00", "10:00"),
      shift(2, "MS-112", "Monday", "10:00", "18:00"),
    ];
    expect(weeklyMinutes(1, shifts)).toBe(4.5 * 60);
  });
});

describe("hoursColor", () => {
  it("compares a tutor's week with William's usual hours", () => {
    expect(hoursColor(9.75 * 60, 10)).toBe("below");
    expect(hoursColor(10 * 60, 10)).toBe("at");
    expect(hoursColor(10.25 * 60, 10)).toBe("above");
  });

  it("turns red at 20 hours, and has no color until the usual hours are set", () => {
    expect(hoursColor(19.75 * 60, 10)).toBe("above");
    expect(hoursColor(20 * 60, 10)).toBe("limit");
    expect(hoursColor(5 * 60, null)).toBe("unset");
    expect(hoursColor(20 * 60, null)).toBe("limit");
  });
});

describe("sortByFewestHours", () => {
  it("puts the tutors with the fewest hours first, then by name", () => {
    const tutors = [
      { id: 1, name: "Zoe" },
      { id: 2, name: "Alex" },
      { id: 3, name: "Bao" },
    ];
    const shifts = [shift(2, "MS-112", "Monday", "10:00", "12:00")];
    expect(sortByFewestHours(tutors, shifts).map((t) => t.name)).toEqual(["Bao", "Zoe", "Alex"]);
  });
});

describe("buildingWeeklyMinutes", () => {
  it("totals each building's planned hours for the week, including empty ones", () => {
    const shifts = [
      shift(1, "MS-112", "Monday", "10:00", "12:00"),
      shift(2, "MS-112", "Tuesday", "09:00", "10:30"),
      shift(3, "LE-237", "Friday", "13:00", "17:00"),
    ];
    expect(buildingWeeklyMinutes(shifts)).toEqual({
      "MS-112": 3.5 * 60,
      "LE-237": 4 * 60,
      "SQ-231": 0,
      "VPA-109/111": 0,
    });
  });
});

describe("shiftProblem", () => {
  const ok = shift(1, "MS-112", "Monday", "10:00", "12:00");

  it("accepts a shift William could have made on the board", () => {
    expect(shiftProblem(ok, [])).toBeNull();
  });

  it("refuses times off the quarter hour", () => {
    expect(shiftProblem({ ...ok, start: at("10:10") }, [])).toMatch(/15-minute/);
  });

  it("refuses a shift outside center hours", () => {
    expect(shiftProblem({ ...ok, start: at("08:00"), end: at("10:00") }, [])).toMatch(
      /center hours/,
    );
    expect(
      shiftProblem({ ...ok, day: "Friday", start: at("16:00"), end: at("18:00") }, []),
    ).toMatch(/center hours/);
  });

  it("refuses a shift under an hour", () => {
    expect(shiftProblem({ ...ok, end: at("10:45") }, [])).toMatch(/at least 1 hour/);
  });

  it("refuses to put a tutor in two places at once", () => {
    const other = shift(1, "LE-237", "Monday", "11:00", "13:00");
    expect(shiftProblem(ok, [other])).toMatch(/already has a shift/);
  });

  it("allows back-to-back shifts, other tutors at the same time, and the shift itself", () => {
    expect(
      shiftProblem(ok, [
        shift(1, "LE-237", "Monday", "12:00", "14:00"),
        shift(2, "MS-112", "Monday", "10:00", "12:00"),
        shift(1, "MS-112", "Tuesday", "10:00", "12:00"),
        { ...ok, start: at("09:00") },
      ]),
    ).toBeNull();
  });
});

describe("addsNothingNew", () => {
  const tutors = [tutor(1, ["MATH-71"]), tutor(2, ["MATH-71"]), tutor(3, ["STAT-C1000"])];

  it("flags a shift whose courses someone else there covers the whole time", () => {
    const mine = shift(1, "MS-112", "Monday", "10:00", "12:00");
    const other = shift(2, "MS-112", "Monday", "09:00", "13:00");
    expect(addsNothingNew(mine, tutors, [mine, other])).toBe(true);
  });

  it("doesn't flag a handover overlap, or a tutor who brings a new course", () => {
    const mine = shift(1, "MS-112", "Monday", "10:00", "12:00");
    const handover = shift(2, "MS-112", "Monday", "11:00", "13:00");
    expect(addsNothingNew(mine, tutors, [mine, handover])).toBe(false);

    const stat = shift(3, "MS-112", "Monday", "10:00", "12:00");
    const calc = shift(2, "MS-112", "Monday", "10:00", "12:00");
    expect(addsNothingNew(stat, tutors, [stat, calc])).toBe(false);
  });
});
