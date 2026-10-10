import { describe, expect, it } from "vitest";
import { hhmmToMinutes, type Building, type BuildingHours, type Weekday } from "./centerHours";
import { parseCourseCodes } from "./courseCodes";
import type { AvailabilityRow } from "./submission";
import { FALL_2026_HOURS as hours } from "./testFixtures";
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
  keepOrder,
  minutesByDay,
  sortByFewestHours,
  tutorCourses,
  weeklyMinutes,
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

  it.each([
    ["Astronomy", "MS-112"],
    ["Chemistry", "MS-112"],
    ["Computer Science", "MS-112"],
    ["Engineering", "MS-112"],
    ["Math", "MS-112"],
    ["Stats", "MS-112"],
    ["Physics", "MS-112"],
    ["Biology", "SQ-231"],
    ["Music", "VPA-109/111"],
    ["English", "LE-237"],
    ["Anthropology", "LE-237"],
  ])("puts %s in %s, as the roadmap's building table does", (subject, building) => {
    expect(buildingsFor(parseCourseCodes(subject))).toEqual([building]);
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

  it("still counts a tutor whose course isn't in EVC's catalog, a softer warning", () => {
    const courses = tutorCourses({ subjectCodes: parseCourseCodes("COMSC 9999"), subjectsRaw: "COMSC 9999" });
    expect(courses).toEqual(["COMSC-9999"]);
    expect(buildingsFor(courses)).toEqual(["MS-112"]);
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
    ).toMatchObject({ count: 1, goal: 2, courses: ["CHEM-1A"], sameSubjects: [] });
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
      missing: [],
      wanted: [],
    });
  });
});

describe("coverageAt must-haves", () => {
  const calc = tutor(1, ["MATH-71", "MATH-72"]);
  const stats = tutor(2, ["STAT-C1000"]);
  const chem = tutor(3, ["CHEM-1A", "CHEM-*"]);
  const physics = tutor(4, ["PHYS-2A"]);
  const onAt = (ids: number[], start: string, end: string) =>
    ids.map((id) => shift(id, "MS-112", "Tuesday", start, end));

  it("needs a Calc and a Stats tutor in MS-112, however many are on", () => {
    const calc2 = tutor(5, ["MATH-66", "MATH-79"]);
    expect(
      coverageAt([calc, calc2], onAt([1, 5], "10:00", "12:00"), "MS-112", "Tuesday", at("10:00")),
    ).toMatchObject({ count: 2, goal: 2, missing: ["Stats"] });
    expect(
      coverageAt([calc, stats], onAt([1, 2], "10:00", "12:00"), "MS-112", "Tuesday", at("10:00")),
    ).toMatchObject({ missing: [] });
  });

  it("doesn't count Any Math or the old MATH 63 as Calc or Stats", () => {
    const anyMath = tutor(6, ["MATH-*"]);
    const math63 = tutor(7, ["MATH-63"]);
    expect(
      coverageAt([anyMath, math63], onAt([6, 7], "10:00", "12:00"), "MS-112", "Tuesday", at("10:00")),
    ).toMatchObject({ missing: ["Calc", "Stats"] });
  });

  it("is happy with one tutor who covers Calc or Stats after 5 pm", () => {
    expect(
      coverageAt([stats], onAt([2], "17:00", "20:00"), "MS-112", "Tuesday", at("17:00")),
    ).toMatchObject({ count: 1, goal: 1, missing: [] });
    expect(
      coverageAt([chem], onAt([3], "17:00", "20:00"), "MS-112", "Tuesday", at("18:00")),
    ).toMatchObject({ goal: 1, missing: ["Calc or Stats"] });
    expect(
      coverageAt([stats], onAt([2], "16:00", "18:00"), "MS-112", "Tuesday", at("16:45")),
    ).toMatchObject({ goal: 2, missing: ["Calc"] });
  });

  it("asks for Chemistry and Physics during the day, as a lighter warning", () => {
    const shifts = onAt([1, 2, 3], "10:00", "20:00");
    expect(coverageAt([calc, stats, chem], shifts, "MS-112", "Tuesday", at("10:00"))).toMatchObject(
      { missing: [], wanted: ["Physics"] },
    );
    expect(
      coverageAt([calc, stats, chem, physics], [...shifts, ...onAt([4], "10:00", "12:00")], "MS-112", "Tuesday", at("10:00")),
    ).toMatchObject({ wanted: [] });
    expect(coverageAt([calc, stats, chem], shifts, "MS-112", "Tuesday", at("18:00"))).toMatchObject(
      { wanted: [] },
    );
  });

  it("drops LE-237's goal to 1 after 5 pm, and has no must-haves outside MS-112", () => {
    const english = tutor(8, ["ENGL-1A"]);
    const le = [shift(8, "LE-237", "Tuesday", "16:00", "18:00")];
    expect(coverageAt([english], le, "LE-237", "Tuesday", at("16:00"))).toMatchObject({
      goal: 2,
      missing: [],
      wanted: [],
    });
    expect(coverageAt([english], le, "LE-237", "Tuesday", at("17:00"))).toMatchObject({ goal: 1 });
  });
});

describe("shiftWarnings", () => {
  const linh = tutor(1, ["COMSC-75"], [free("Tuesday", "09:00", "12:00"), free("Tuesday", "15:00", "18:00")]);

  it("warns when a shift runs past the tutor's free time", () => {
    expect(shiftWarnings(shift(1, "MS-112", "Tuesday", "11:00", "13:00"), linh, hours)).toEqual([
      "outside-availability",
    ]);
  });

  it("treats back-to-back free times as one stretch", () => {
    const backToBack = tutor(2, ["MATH-71"], [free("Monday", "09:00", "12:00"), free("Monday", "12:00", "15:00")]);
    expect(shiftWarnings(shift(2, "MS-112", "Monday", "11:00", "13:00"), backToBack, hours)).toEqual(
      [],
    );
  });

  it("warns when none of the tutor's courses are taught in that building", () => {
    const mondays = [free("Monday", "09:00", "15:00")];
    const biologyOnly = tutor(3, ["BIOL-71"], mondays);
    const maiLe = tutor(4, ["BIOL-71", "CHEM-1A", "ENGL-1A"], mondays);
    expect(shiftWarnings(shift(3, "MS-112", "Monday", "09:00", "11:00"), biologyOnly, hours)).toEqual([
      "wrong-building",
    ]);
    expect(shiftWarnings(shift(4, "LE-237", "Monday", "09:00", "11:00"), maiLe, hours)).toEqual([]);
  });

  it("says the subjects need fixing rather than blaming the building", () => {
    const unreadable = tutor(5, [], [free("Tuesday", "14:00", "18:00")]);
    expect(shiftWarnings(shift(5, "MS-112", "Tuesday", "14:00", "16:00"), unreadable, hours)).toEqual([
      "unknown-subjects",
    ]);
  });

  it("warns about a shift left outside its building's hours after they changed", () => {
    // LE-237 closes at 1 pm on Fridays.
    const english = tutor(6, ["ENGL-1A"], [free("Friday", "09:00", "17:00")]);
    expect(shiftWarnings(shift(6, "LE-237", "Friday", "12:00", "14:00"), english, hours)).toEqual([
      "building-closed",
    ]);
  });
});

describe("shiftForDrop", () => {
  it("makes a three-hour shift starting where the card is dropped, like William's 1-4", () => {
    const alex = tutor(1, ["MATH-71"], [free("Monday", "09:00", "18:00")]);
    expect(shiftForDrop(alex, [], hours, "MS-112", "Monday", at("13:00"))).toEqual({
      start: at("13:00"),
      end: at("16:00"),
    });
  });

  it("shrinks to fit the tutor's free time, but never below an hour", () => {
    const maria = tutor(2, ["ENGL-1A"], [free("Tuesday", "09:00", "10:30")]);
    expect(shiftForDrop(maria, [], hours, "LE-237", "Tuesday", at("09:00"))).toEqual({
      start: at("09:00"),
      end: at("10:30"),
    });
    const briefly = tutor(3, ["ENGL-1A"], [free("Tuesday", "09:00", "09:30")]);
    expect(shiftForDrop(briefly, [], hours, "LE-237", "Tuesday", at("09:00"))).toEqual({
      start: at("09:00"),
      end: at("10:00"),
    });
  });

  it("stops when the building closes, and makes nothing if under an hour is left", () => {
    const kevin = tutor(4, ["MATH-71"], [free("Friday", "09:00", "17:00")]);
    expect(shiftForDrop(kevin, [], hours, "MS-112", "Friday", at("16:00"))).toEqual({
      start: at("16:00"),
      end: at("17:00"),
    });
    expect(shiftForDrop(kevin, [], hours, "MS-112", "Friday", at("16:30"))).toBeNull();
    // SQ-231 closes at 1 pm on Fridays.
    const bio = tutor(5, ["BIOL-71"], [free("Friday", "09:00", "17:00")]);
    expect(shiftForDrop(bio, [], hours, "SQ-231", "Friday", at("11:00"))).toEqual({
      start: at("11:00"),
      end: at("13:00"),
    });
  });

  it("starts no earlier than the building opens", () => {
    // MS-112 opens at 8 am, LE-237 at 9.
    const sam = tutor(6, ["ENGL-1A", "MATH-71"], [free("Monday", "08:00", "18:00")]);
    expect(shiftForDrop(sam, [], hours, "MS-112", "Monday", at("08:00"))).toEqual({
      start: at("08:00"),
      end: at("11:00"),
    });
    expect(shiftForDrop(sam, [], hours, "LE-237", "Monday", at("08:30"))).toEqual({
      start: at("09:00"),
      end: at("12:00"),
    });
  });

  it("makes nothing in a building that is closed that day", () => {
    const noVpaMondays: BuildingHours = { ...hours, "VPA-109/111": {} };
    const music = tutor(7, ["MUSIC-1"], [free("Monday", "09:00", "17:00")]);
    expect(shiftForDrop(music, [], noVpaMondays, "VPA-109/111", "Monday", at("12:00"))).toBeNull();
  });

  it("never overlaps another shift of the same tutor", () => {
    const kevin = tutor(4, ["MATH-71"], [free("Monday", "09:00", "18:00")]);
    const shifts = [
      shift(4, "MS-112", "Monday", "11:00", "13:00"),
      shift(9, "MS-112", "Monday", "10:00", "12:00"),
      shift(4, "MS-112", "Tuesday", "10:00", "12:00"),
    ];
    expect(shiftForDrop(kevin, shifts, hours, "MS-112", "Monday", at("10:00"))).toEqual({
      start: at("10:00"),
      end: at("11:00"),
    });
    expect(shiftForDrop(kevin, shifts, hours, "MS-112", "Monday", at("10:30"))).toBeNull();
    expect(shiftForDrop(kevin, shifts, hours, "MS-112", "Monday", at("11:30"))).toBeNull();
  });

  it("starts at the quarter hour the card was dropped in", () => {
    const alex = tutor(1, ["MATH-71"], [free("Monday", "09:00", "18:00")]);
    expect(shiftForDrop(alex, [], hours, "MS-112", "Monday", at("10:14"))).toEqual({
      start: at("10:00"),
      end: at("13:00"),
    });
  });
});

describe("moveShift", () => {
  it("keeps the shift's length and snaps it to the nearest quarter hour", () => {
    const monday = shift(1, "MS-112", "Monday", "10:00", "12:00");
    expect(moveShift(monday, [monday], hours, "Tuesday", "LE-237", at("14:05"))).toEqual({
      ...monday,
      day: "Tuesday",
      building: "LE-237",
      start: at("14:00"),
      end: at("16:00"),
    });
  });

  it("stays inside the building's hours", () => {
    const monday = shift(1, "MS-112", "Monday", "10:00", "12:00");
    expect(moveShift(monday, [monday], hours, "Friday", "MS-112", at("16:00"))).toMatchObject({
      start: at("15:00"),
      end: at("17:00"),
    });
    // SQ-231 is open 9 am to 1 pm on Fridays.
    expect(moveShift(monday, [monday], hours, "Friday", "SQ-231", at("12:00"))).toMatchObject({
      start: at("11:00"),
      end: at("13:00"),
    });
    expect(moveShift(monday, [monday], hours, "Friday", "SQ-231", at("08:00"))).toMatchObject({
      start: at("09:00"),
      end: at("11:00"),
    });
  });

  it("refuses to put a tutor in two places at once", () => {
    const monday = shift(1, "MS-112", "Monday", "10:00", "12:00");
    const tuesday = shift(1, "LE-237", "Tuesday", "15:00", "17:00");
    const shifts = [monday, tuesday];
    expect(moveShift(monday, shifts, hours, "Tuesday", "MS-112", at("14:00"))).toBeNull();
    expect(moveShift(monday, shifts, hours, "Monday", "MS-112", at("11:00"))).toMatchObject({
      start: at("11:00"),
      end: at("13:00"),
    });
  });

  it("refuses a shift longer than the building is open that day, or a closed building", () => {
    const allTuesday = shift(1, "MS-112", "Tuesday", "09:00", "20:00");
    expect(moveShift(allTuesday, [allTuesday], hours, "Friday", "MS-112", at("09:00"))).toBeNull();
    const monday = shift(1, "MS-112", "Monday", "10:00", "12:00");
    const noVpa: BuildingHours = { ...hours, "VPA-109/111": {} };
    expect(moveShift(monday, [monday], noVpa, "Monday", "VPA-109/111", at("12:00"))).toBeNull();
  });
});

describe("resizeShift", () => {
  it("ends at the nearest quarter hour when the bottom edge is dragged", () => {
    const monday = shift(1, "MS-112", "Monday", "10:00", "12:00");
    expect(resizeShift(monday, [monday], hours, at("13:05"), "end")).toEqual({ ...monday, end: at("13:00") });
    expect(resizeShift(monday, [monday], hours, at("13:10"), "end")).toEqual({ ...monday, end: at("13:15") });
  });

  it("stays at least an hour long, inside the building's hours, and before the tutor's next shift", () => {
    const morning = shift(1, "LE-237", "Friday", "10:00", "11:00");
    const afternoon = shift(1, "MS-112", "Friday", "14:00", "16:00");
    const shifts = [morning, afternoon];
    expect(resizeShift(morning, shifts, hours, at("10:20"), "end").end).toBe(at("11:00"));
    // LE-237 closes at 1 pm on Fridays, before this tutor's 2 pm shift.
    expect(resizeShift(morning, shifts, hours, at("15:00"), "end").end).toBe(at("13:00"));
    expect(resizeShift(afternoon, shifts, hours, at("18:00"), "end").end).toBe(at("17:00"));
    const twoShifts = [shift(1, "MS-112", "Friday", "10:00", "12:00"), afternoon];
    expect(resizeShift(twoShifts[0], twoShifts, hours, at("15:00"), "end").end).toBe(at("14:00"));
  });

  it("starts at the nearest quarter hour when the top edge is dragged", () => {
    const monday = shift(1, "MS-112", "Monday", "10:00", "12:00");
    expect(resizeShift(monday, [monday], hours, at("09:05"), "start")).toEqual({ ...monday, start: at("09:00") });
    expect(resizeShift(monday, [monday], hours, at("09:10"), "start")).toEqual({ ...monday, start: at("09:15") });
  });

  it("starts no later than an hour before the end, not before opening, and after the tutor's last shift", () => {
    const morning = shift(1, "LE-237", "Friday", "10:00", "11:00");
    const afternoon = shift(1, "MS-112", "Friday", "14:00", "16:00");
    const shifts = [morning, afternoon];
    expect(resizeShift(afternoon, shifts, hours, at("15:40"), "start").start).toBe(at("15:00"));
    // LE-237 opens at 9 am on Fridays.
    expect(resizeShift(morning, shifts, hours, at("07:00"), "start").start).toBe(at("09:00"));
    // MS-112 opens at 8, but the tutor is in LE until 11.
    expect(resizeShift(afternoon, shifts, hours, at("09:00"), "start").start).toBe(at("11:00"));
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

describe("minutesByDay", () => {
  it("adds up a tutor's shifts each day, with 0 on days they have none", () => {
    const shifts = [
      shift(1, "MS-112", "Monday", "09:00", "12:00"),
      shift(1, "LE-237", "Monday", "13:00", "14:30"),
      shift(1, "MS-112", "Thursday", "10:00", "11:00"),
      shift(2, "MS-112", "Tuesday", "10:00", "18:00"),
    ];
    expect(minutesByDay(shifts, 1)).toEqual({
      Monday: 4.5 * 60,
      Tuesday: 0,
      Wednesday: 0,
      Thursday: 60,
      Friday: 0,
    });
  });

  it("adds up everyone's shifts each day when no tutor is given", () => {
    const shifts = [
      shift(1, "MS-112", "Monday", "09:00", "12:00"),
      shift(2, "SQ-231", "Monday", "10:00", "11:00"),
    ];
    expect(minutesByDay(shifts).Monday).toBe(4 * 60);
  });
});

describe("hoursColor", () => {
  // Made-up numbers: William's real range lives in the database, not this repo.
  const usual = { min: 4, max: 8 };

  it("compares a tutor's week with William's usual range, both ends included", () => {
    expect(hoursColor(3.75 * 60, usual)).toBe("below");
    expect(hoursColor(4 * 60, usual)).toBe("inside");
    expect(hoursColor(8 * 60, usual)).toBe("inside");
    expect(hoursColor(8.25 * 60, usual)).toBe("above");
  });

  it("works with a range of one number", () => {
    expect(hoursColor(5 * 60, { min: 5, max: 5 })).toBe("inside");
    expect(hoursColor(5.25 * 60, { min: 5, max: 5 })).toBe("above");
  });

  it("turns red at 20 hours, and has no color until the range is set", () => {
    expect(hoursColor(19.75 * 60, usual)).toBe("above");
    expect(hoursColor(20 * 60, usual)).toBe("limit");
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

describe("keepOrder", () => {
  it("keeps the order the list had when the day opened, with anyone new at the end", () => {
    const tutors = [
      { id: 1, name: "Zoe" },
      { id: 2, name: "Alex" },
      { id: 3, name: "Bao" },
      { id: 4, name: "Chi" },
    ];
    expect(keepOrder(tutors, [3, 1, 2]).map((t) => t.name)).toEqual(["Bao", "Zoe", "Alex", "Chi"]);
  });

  it("leaves out tutors who are no longer listed", () => {
    expect(keepOrder([{ id: 2, name: "Alex" }], [3, 1, 2]).map((t) => t.id)).toEqual([2]);
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
    expect(shiftProblem(ok, [], hours)).toBeNull();
  });

  it("refuses times off the quarter hour", () => {
    expect(shiftProblem({ ...ok, start: at("10:10") }, [], hours)).toMatch(/15-minute/);
  });

  it("refuses a shift outside its building's hours", () => {
    expect(shiftProblem({ ...ok, start: at("08:00"), end: at("10:00") }, [], hours)).toBeNull();
    expect(shiftProblem({ ...ok, start: at("07:00"), end: at("09:00") }, [], hours)).toBe(
      "MS-112 is open 8:00 am – 6:00 pm on Mondays",
    );
    expect(
      shiftProblem({ ...ok, building: "LE-237", start: at("08:00"), end: at("10:00") }, [], hours),
    ).toBe("LE-237 is open 9:00 am – 5:00 pm on Mondays");
    expect(
      shiftProblem({ ...ok, day: "Friday", start: at("16:00"), end: at("18:00") }, [], hours),
    ).toBe("MS-112 is open 8:00 am – 5:00 pm on Fridays");
  });

  it("refuses a shift in a building that is closed that day", () => {
    expect(shiftProblem(ok, [], { ...hours, "MS-112": {} })).toBe("MS-112 is closed on Mondays");
  });

  it("refuses a shift under an hour", () => {
    expect(shiftProblem({ ...ok, end: at("10:45") }, [], hours)).toMatch(/at least 1 hour/);
  });

  it("refuses to put a tutor in two places at once", () => {
    const other = shift(1, "LE-237", "Monday", "11:00", "13:00");
    expect(shiftProblem(ok, [other], hours)).toMatch(/already has a shift/);
  });

  it("allows back-to-back shifts, other tutors at the same time, and the shift itself", () => {
    expect(
      shiftProblem(ok, [
        shift(1, "LE-237", "Monday", "12:00", "14:00"),
        shift(2, "MS-112", "Monday", "10:00", "12:00"),
        shift(1, "MS-112", "Tuesday", "10:00", "12:00"),
        { ...ok, start: at("09:00") },
      ], hours),
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
