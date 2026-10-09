/**
 * Rules for the shift planner, where William places approved tutors' shifts
 * into buildings. Pure and browser-safe, like utils/submission.
 *
 * Times are minutes after midnight, so 9:15 am is 555.
 */
import {
  BUILDINGS,
  SLOT_MINUTES,
  WEEKDAYS,
  formatOpenHours,
  hhmmToMinutes,
  type Building,
  type BuildingHours,
  type Weekday,
} from "./centerHours";
import { OPEN_LAB_PATTERN, findUnrecognizedSubjects, type AvailabilityRow } from "./submission";

/** Shifts start, end and move in the same 15-minute steps tutors pick on the form. */
export const STEP_MINUTES = SLOT_MINUTES;
/** William's usual shifts are 9-12 or 1-4. Only where a dropped shift starts. */
export const DEFAULT_SHIFT_MINUTES = 180;
export const MIN_SHIFT_MINUTES = 60;

/** Tutors William wants on at once. Fewer is a warning, never a block. */
export const COVERAGE_GOAL: Record<Building, number> = {
  "MS-112": 2,
  "LE-237": 2,
  "SQ-231": 1,
  "VPA-109/111": 1,
};

/** From 5 pm it's slower and MSRC staff are there, so one tutor is the goal. */
export const EVENING_START = 17 * 60;

/** MS-112 must always have both. "Any Math" and the old MATH 63 don't count. */
const CALC = ["MATH-66", "MATH-67", "MATH-71", "MATH-72", "MATH-73", "MATH-78", "MATH-79"];
const STATS = ["STAT-C1000"];

/** Nice to have in MS-112 through the day. Any course in the department counts. */
const WANTED = [
  { label: "Chemistry", department: "CHEM" },
  { label: "Physics", department: "PHYS" },
];

export interface PlannerTutor {
  id: number;
  courses: string[];
  availability: AvailabilityRow[];
}

export interface Shift {
  id: string;
  tutorId: number;
  day: Weekday;
  building: Building;
  start: number;
  end: number;
}

export interface Coverage {
  count: number;
  goal: number;
  courses: string[];
  /** Tutors here whose every course someone else here already covers. */
  sameSubjects: number[];
  /** Must-haves nobody here covers, the strongest warning: "Calc", "Stats". */
  missing: string[];
  /** Nice-to-haves nobody here covers, a lighter warning: "Chemistry". */
  wanted: string[];
}

/** Departments taught outside LE-237, which takes everything else. */
const DEPARTMENT_BUILDINGS: Record<string, Building> = {
  ASTR: "MS-112",
  CHEM: "MS-112",
  COMSC: "MS-112",
  ENGR: "MS-112",
  MATH: "MS-112",
  PHYS: "MS-112",
  STAT: "MS-112",
  BIOL: "SQ-231",
  MUS: "VPA-109/111",
};

function buildingOf(code: string): Building {
  return DEPARTMENT_BUILDINGS[code.split("-")[0]] ?? "LE-237";
}

/** Stands in for "Open Computer Lab", which the course parser can't read. */
export const OPEN_LAB = "OPEN-LAB";

/**
 * A submission's courses, as the planner counts them. None while any of its
 * subjects need review: a half-read list would light up the wrong buildings.
 */
export function tutorCourses(submission: {
  subjectCodes: string[];
  subjectsRaw: string;
}): string[] {
  if (findUnrecognizedSubjects(submission.subjectsRaw).length > 0) return [];
  return OPEN_LAB_PATTERN.test(submission.subjectsRaw)
    ? [...submission.subjectCodes, OPEN_LAB]
    : submission.subjectCodes;
}

/** The buildings a tutor's courses are taught in, in board order. */
export function buildingsFor(courses: string[]): Building[] {
  const buildings = new Set(courses.map(buildingOf));
  return BUILDINGS.filter((b) => buildings.has(b));
}

/** "CHEM-*" (any CHEM course) covers "CHEM-1A"; the reverse is not true. */
function covers(own: string, course: string): boolean {
  return own === course || (own.endsWith("-*") && course.startsWith(own.slice(0, -1)));
}

/** Who is on in one building at one moment, and whether that is enough. */
export function coverageAt(
  tutors: PlannerTutor[],
  shifts: Shift[],
  building: Building,
  day: Weekday,
  minute: number,
): Coverage {
  const here = shifts.filter(
    (s) => s.building === building && s.day === day && s.start <= minute && minute < s.end,
  );
  // A tutor with nothing taught here gets the wrong-building warning instead.
  const present = [...new Set(here.map((s) => s.tutorId))]
    .map((id) => ({
      id,
      courses: (tutors.find((t) => t.id === id)?.courses ?? []).filter(
        (c) => buildingOf(c) === building,
      ),
    }))
    .filter((p) => p.courses.length > 0);
  const courses = [...new Set(present.flatMap((p) => p.courses))];
  const coversAll = (group: typeof present) =>
    courses.every((c) => group.some((p) => p.courses.some((own) => covers(own, c))));

  // The fewest tutors who between them still cover every course here. Trying
  // every group is fine: a building only ever has a handful of tutors at once.
  let count = 0;
  if (courses.length > 0) {
    count = present.length;
    for (let mask = 1; mask < 1 << present.length; mask++) {
      const group = present.filter((_, i) => mask & (1 << i));
      if (group.length < count && coversAll(group)) count = group.length;
    }
  }

  const sameSubjects = present
    .filter((p) => coversAll(present.filter((o) => o.id !== p.id)))
    .map((p) => p.id);

  const evening = minute >= EVENING_START;
  const goal = evening ? Math.min(COVERAGE_GOAL[building], 1) : COVERAGE_GOAL[building];

  const missing: string[] = [];
  const wanted: string[] = [];
  if (building === "MS-112") {
    const calc = courses.some((c) => CALC.includes(c));
    const stats = courses.some((c) => STATS.includes(c));
    if (evening) {
      if (!calc && !stats) missing.push("Calc or Stats");
    } else {
      if (!calc) missing.push("Calc");
      if (!stats) missing.push("Stats");
      for (const w of WANTED) {
        if (!courses.some((c) => c.startsWith(`${w.department}-`))) wanted.push(w.label);
      }
    }
  }

  return { count, goal, courses, sameSubjects, missing, wanted };
}

/**
 * Whether everything a shift's tutor covers, someone else in that building
 * already covers for the whole shift. A short overlap at a handover is fine.
 */
export function addsNothingNew(shift: Shift, tutors: PlannerTutor[], shifts: Shift[]): boolean {
  for (let minute = shift.start; minute < shift.end; minute += STEP_MINUTES) {
    const here = coverageAt(tutors, shifts, shift.building, shift.day, minute);
    if (!here.sameSubjects.includes(shift.tutorId)) return false;
  }
  return true;
}

/** A tutor's free time on one day, with touching or overlapping rows joined. */
export function freeTimes(tutor: PlannerTutor, day: Weekday): { start: number; end: number }[] {
  const rows = tutor.availability
    .filter((row) => row.day === day)
    .map((row) => ({ start: hhmmToMinutes(row.start), end: hhmmToMinutes(row.end) }))
    .sort((a, b) => a.start - b.start);
  const joined: { start: number; end: number }[] = [];
  for (const row of rows) {
    const last = joined[joined.length - 1];
    if (last && row.start <= last.end) last.end = Math.max(last.end, row.end);
    else joined.push({ ...row });
  }
  return joined;
}

export type ShiftWarning =
  | "outside-availability"
  | "building-closed"
  | "wrong-building"
  | "unknown-subjects";

/** Whether the building is open for the whole shift. */
function insideBuildingHours(shift: Shift, hours: BuildingHours): boolean {
  const open = hours[shift.building][shift.day];
  return open !== undefined && open.open <= shift.start && shift.end <= open.close;
}

/**
 * What William should know about a shift. He can still keep it. The board only
 * makes shifts inside their building's hours, so "building-closed" means the
 * hours changed on the Terms page after the shift was placed.
 */
export function shiftWarnings(shift: Shift, tutor: PlannerTutor, hours: BuildingHours): ShiftWarning[] {
  const warnings: ShiftWarning[] = [];
  const fits = freeTimes(tutor, shift.day).some(
    (free) => free.start <= shift.start && shift.end <= free.end,
  );
  if (!fits) warnings.push("outside-availability");
  if (!insideBuildingHours(shift, hours)) warnings.push("building-closed");
  if (tutor.courses.length === 0) warnings.push("unknown-subjects");
  else if (!buildingsFor(tutor.courses).includes(shift.building)) warnings.push("wrong-building");
  return warnings;
}

/**
 * The shift a tutor's card makes when dropped at a time, or null if none fits.
 * Dropped before the building opens, it starts at opening.
 */
export function shiftForDrop(
  tutor: PlannerTutor,
  shifts: Shift[],
  hours: BuildingHours,
  building: Building,
  day: Weekday,
  minute: number,
): { start: number; end: number } | null {
  const open = hours[building][day];
  if (!open) return null;
  const start = Math.max(open.open, Math.floor(minute / STEP_MINUTES) * STEP_MINUTES);
  const own = shifts.filter((s) => s.tutorId === tutor.id && s.day === day);
  if (own.some((s) => s.start <= start && start < s.end)) return null;

  let end = start + DEFAULT_SHIFT_MINUTES;
  const free = freeTimes(tutor, day).find((f) => f.start <= start && start < f.end);
  if (free) end = Math.min(end, Math.max(free.end, start + MIN_SHIFT_MINUTES));
  end = Math.min(end, open.close, ...own.filter((s) => s.start > start).map((s) => s.start));
  return end - start >= MIN_SHIFT_MINUTES ? { start, end } : null;
}

/** A shift dragged to a new day, building or time, or null if it can't go there. */
export function moveShift(
  shift: Shift,
  shifts: Shift[],
  hours: BuildingHours,
  day: Weekday,
  building: Building,
  minute: number,
): Shift | null {
  const length = shift.end - shift.start;
  const hoursThere = hours[building][day];
  if (!hoursThere || length > hoursThere.close - hoursThere.open) return null;
  const { open, close } = hoursThere;
  const snapped = Math.round(minute / STEP_MINUTES) * STEP_MINUTES;
  const start = Math.max(open, Math.min(snapped, close - length));
  const moved = { ...shift, day, building, start, end: start + length };
  return clashes(moved, shifts) ? null : moved;
}

/** Whether a tutor would be in two places at once. */
function clashes(shift: Shift, shifts: Shift[]): boolean {
  return shifts.some(
    (s) =>
      s.id !== shift.id &&
      s.tutorId === shift.tutorId &&
      s.day === shift.day &&
      s.start < shift.end &&
      shift.start < s.end,
  );
}

/**
 * Why the server should refuse a shift, or null if it is fine. The board never
 * makes these, so one means a stale page or a hand-made request.
 */
export function shiftProblem(shift: Shift, shifts: Shift[], hours: BuildingHours): string | null {
  const open = hours[shift.building][shift.day];
  if (shift.start % STEP_MINUTES !== 0 || shift.end % STEP_MINUTES !== 0) {
    return "Shifts start and end in 15-minute steps";
  }
  if (!open) {
    return `${shift.building} is closed on ${shift.day}s`;
  }
  if (!insideBuildingHours(shift, hours)) {
    return `${shift.building} is open ${formatOpenHours(open)} on ${shift.day}s`;
  }
  if (shift.end - shift.start < MIN_SHIFT_MINUTES) {
    return "A shift must be at least 1 hour";
  }
  if (clashes(shift, shifts)) {
    return "This tutor already has a shift at that time";
  }
  return null;
}

/** A shift whose top ("start") or bottom ("end") edge was dragged to a new time. */
export function resizeShift(
  shift: Shift,
  shifts: Shift[],
  hours: BuildingHours,
  minute: number,
  edge: "start" | "end",
): Shift {
  const snapped = Math.round(minute / STEP_MINUTES) * STEP_MINUTES;
  const others = shifts.filter(
    (s) => s.id !== shift.id && s.tutorId === shift.tutorId && s.day === shift.day,
  );
  // A shift left in a closed building after its hours changed keeps its ends.
  const open = hours[shift.building][shift.day];

  if (edge === "start") {
    const earliest = Math.max(
      open?.open ?? shift.start,
      ...others.filter((s) => s.end <= shift.start).map((s) => s.end),
    );
    const start = Math.min(shift.end - MIN_SHIFT_MINUTES, Math.max(snapped, earliest));
    return { ...shift, start };
  }

  const latest = Math.min(
    open?.close ?? shift.end,
    ...others.filter((s) => s.start >= shift.end).map((s) => s.start),
  );
  const end = Math.max(shift.start + MIN_SHIFT_MINUTES, Math.min(snapped, latest));
  return { ...shift, end };
}

/** Student tutors must stay under 20 hours a week. */
export const WEEKLY_LIMIT_MINUTES = 20 * 60;

export type HoursColor = "unset" | "below" | "inside" | "above" | "limit";

/** William's fair share of hours per tutor per week, from min to max, both included. */
export interface UsualHours {
  min: number;
  max: number;
}

/**
 * How a tutor's week compares with William's usual hours, for the card color.
 * The usual hours live in the database, never in this public repo; null means
 * William hasn't set them yet.
 */
export function hoursColor(minutes: number, usual: UsualHours | null): HoursColor {
  if (minutes >= WEEKLY_LIMIT_MINUTES) return "limit";
  if (usual === null) return "unset";
  if (minutes < usual.min * 60) return "below";
  return minutes <= usual.max * 60 ? "inside" : "above";
}

export function weeklyMinutes(tutorId: number, shifts: Shift[]): number {
  return shifts
    .filter((s) => s.tutorId === tutorId)
    .reduce((total, s) => total + s.end - s.start, 0);
}

/** Planned minutes each weekday, for one tutor or, without one, for everyone. */
export function minutesByDay(shifts: Shift[], tutorId?: number): Record<Weekday, number> {
  const totals = Object.fromEntries(WEEKDAYS.map((d) => [d, 0])) as Record<Weekday, number>;
  for (const s of shifts) {
    if (tutorId === undefined || s.tutorId === tutorId) totals[s.day] += s.end - s.start;
  }
  return totals;
}

export function buildingWeeklyMinutes(shifts: Shift[]): Record<Building, number> {
  const totals = Object.fromEntries(BUILDINGS.map((b) => [b, 0])) as Record<Building, number>;
  for (const s of shifts) totals[s.building] += s.end - s.start;
  return totals;
}

/** Fewest hours first, so nobody gets forgotten at the bottom of the list. */
export function sortByFewestHours<T extends { id: number; name: string }>(
  tutors: T[],
  shifts: Shift[],
): T[] {
  return [...tutors].sort(
    (a, b) =>
      weeklyMinutes(a.id, shifts) - weeklyMinutes(b.id, shifts) || a.name.localeCompare(b.name),
  );
}

/**
 * The tutors in the order the list had when William opened the day, so a card
 * doesn't jump away from under him as its hours grow. Anyone not in that order
 * yet goes at the end, in the order given.
 */
export function keepOrder<T extends { id: number }>(tutors: T[], order: number[]): T[] {
  const place = new Map(order.map((id, i) => [id, i]));
  return [...tutors].sort(
    (a, b) => (place.get(a.id) ?? order.length) - (place.get(b.id) ?? order.length),
  );
}
