/**
 * Rules for the shift planner, where William places approved tutors' shifts
 * into buildings. Pure and browser-safe, like utils/submission.
 *
 * Times are minutes after midnight, so 9:15 am is 555.
 */
import { CENTER_HOURS, hhmmToMinutes, type Weekday } from "./centerHours";
import type { AvailabilityRow } from "./submission";

/** Shifts start, end and move in 15-minute steps. */
export const STEP_MINUTES = 15;
export const DEFAULT_SHIFT_MINUTES = 120;
export const MIN_SHIFT_MINUTES = 60;

export const BUILDINGS = ["MS-112", "LE-237", "SQ-231", "VPA-109/111"] as const;
export type Building = (typeof BUILDINGS)[number];

/** Tutors William wants on at once. Fewer is a warning, never a block. */
export const COVERAGE_GOAL: Record<Building, number> = {
  "MS-112": 2,
  "LE-237": 2,
  "SQ-231": 1,
  "VPA-109/111": 1,
};

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

/** A submission's courses, as the planner counts them. */
export function tutorCourses(submission: {
  subjectCodes: string[];
  subjectsRaw: string;
}): string[] {
  return /open\s+(computer\s+)?lab/i.test(submission.subjectsRaw)
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

  return { count, goal: COVERAGE_GOAL[building], courses, sameSubjects };
}

/** A tutor's free time on one day, with touching or overlapping rows joined. */
function freeTimes(tutor: PlannerTutor, day: Weekday): { start: number; end: number }[] {
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

export type ShiftWarning = "outside-availability" | "wrong-building" | "unknown-subjects";

/** What William should know about a shift. He can still keep it. */
export function shiftWarnings(shift: Shift, tutor: PlannerTutor): ShiftWarning[] {
  const warnings: ShiftWarning[] = [];
  const fits = freeTimes(tutor, shift.day).some(
    (free) => free.start <= shift.start && shift.end <= free.end,
  );
  if (!fits) warnings.push("outside-availability");
  if (tutor.courses.length === 0) warnings.push("unknown-subjects");
  else if (!buildingsFor(tutor.courses).includes(shift.building)) warnings.push("wrong-building");
  return warnings;
}

/** The shift a tutor's card makes when dropped at a time, or null if none fits. */
export function shiftForDrop(
  tutor: PlannerTutor,
  shifts: Shift[],
  day: Weekday,
  minute: number,
): { start: number; end: number } | null {
  const start = Math.floor(minute / STEP_MINUTES) * STEP_MINUTES;
  const own = shifts.filter((s) => s.tutorId === tutor.id && s.day === day);
  if (own.some((s) => s.start <= start && start < s.end)) return null;

  let end = start + DEFAULT_SHIFT_MINUTES;
  const free = freeTimes(tutor, day).find((f) => f.start <= start && start < f.end);
  if (free) end = Math.min(end, Math.max(free.end, start + MIN_SHIFT_MINUTES));
  end = Math.min(
    end,
    hhmmToMinutes(CENTER_HOURS[day].close),
    ...own.filter((s) => s.start > start).map((s) => s.start),
  );
  return end - start >= MIN_SHIFT_MINUTES ? { start, end } : null;
}

/** A shift dragged to a new day, building or time, or null if it can't go there. */
export function moveShift(
  shift: Shift,
  shifts: Shift[],
  day: Weekday,
  building: Building,
  minute: number,
): Shift | null {
  const length = shift.end - shift.start;
  const open = hhmmToMinutes(CENTER_HOURS[day].open);
  const close = hhmmToMinutes(CENTER_HOURS[day].close);
  if (length > close - open) return null;
  const snapped = Math.round(minute / STEP_MINUTES) * STEP_MINUTES;
  const start = Math.max(open, Math.min(snapped, close - length));
  const end = start + length;
  const clash = shifts.some(
    (s) =>
      s.id !== shift.id &&
      s.tutorId === shift.tutorId &&
      s.day === day &&
      s.start < end &&
      start < s.end,
  );
  return clash ? null : { ...shift, day, building, start, end };
}

/** A shift whose bottom edge was dragged to a new end time. */
export function resizeShift(shift: Shift, shifts: Shift[], minute: number): Shift {
  const snapped = Math.round(minute / STEP_MINUTES) * STEP_MINUTES;
  const latest = Math.min(
    hhmmToMinutes(CENTER_HOURS[shift.day].close),
    ...shifts
      .filter(
        (s) =>
          s.id !== shift.id &&
          s.tutorId === shift.tutorId &&
          s.day === shift.day &&
          s.start >= shift.end,
      )
      .map((s) => s.start),
  );
  const end = Math.max(shift.start + MIN_SHIFT_MINUTES, Math.min(snapped, latest));
  return { ...shift, end };
}

/** Student tutors must stay under 20 hours a week. */
export const WEEKLY_LIMIT_MINUTES = 20 * 60;

export type HoursColor = "unset" | "below" | "at" | "above" | "limit";

/**
 * How a tutor's week compares with William's usual hours, for the card color.
 * The usual hours live in the database, never in this public repo; null means
 * William hasn't set them yet.
 */
export function hoursColor(minutes: number, usualHours: number | null): HoursColor {
  if (minutes >= WEEKLY_LIMIT_MINUTES) return "limit";
  if (usualHours === null) return "unset";
  const usual = usualHours * 60;
  if (minutes < usual) return "below";
  return minutes === usual ? "at" : "above";
}

export function weeklyMinutes(tutorId: number, shifts: Shift[]): number {
  return shifts
    .filter((s) => s.tutorId === tutorId)
    .reduce((total, s) => total + s.end - s.start, 0);
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
