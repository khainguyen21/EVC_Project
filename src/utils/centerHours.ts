import { formatTime } from "./formatTime";

/**
 * When the tutoring buildings are open, in 24-hour campus time.
 *
 * Each building keeps its own hours, and they change every term, so they are
 * stored per term in the database (BuildingHours) and travel on the Term. The
 * rules page, the availability form and the planner all read them from there.
 */
export const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export const BUILDINGS = ["MS-112", "LE-237", "SQ-231", "VPA-109/111"] as const;
export type Building = (typeof BUILDINGS)[number];

/** One building's opening and closing on one day, in minutes after midnight. */
export interface OpenHours {
  open: number;
  close: number;
}

/** A term's hours. A building with no entry for a day is closed that day. */
export type BuildingHours = Record<Building, Partial<Record<Weekday, OpenHours>>>;

// Kept until the planner and rules page read a term's hours.
export const CENTER_HOURS: Record<Weekday, { open: string; close: string }> = {
  Monday: { open: "09:00", close: "18:00" },
  Tuesday: { open: "09:00", close: "20:00" },
  Wednesday: { open: "09:00", close: "20:00" },
  Thursday: { open: "09:00", close: "20:00" },
  Friday: { open: "09:00", close: "17:00" },
};

/** Real shifts start at times like 9:15 and 1:45, so tutors pick quarter hours. */
export const SLOT_MINUTES = 15;

export function toHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Files BuildingHours rows by building and day, skipping any it doesn't know. */
export function toBuildingHours(
  rows: { building: string; day: string; open: number; close: number }[],
): BuildingHours {
  const hours = Object.fromEntries(BUILDINGS.map((b) => [b, {}])) as BuildingHours;
  for (const row of rows) {
    const building = BUILDINGS.find((b) => b === row.building);
    const day = WEEKDAYS.find((d) => d === row.day);
    if (building && day) hours[building][day] = { open: row.open, close: row.close };
  }
  return hours;
}

/**
 * From the first building to open until the last one closes, or null when
 * every building is closed. Tutors can offer any time in it: the form doesn't
 * ask which building they want.
 */
export function dayHours(hours: BuildingHours, day: Weekday): OpenHours | null {
  const open = BUILDINGS.map((b) => hours[b][day]).filter((h) => h !== undefined);
  if (open.length === 0) return null;
  return {
    open: Math.min(...open.map((h) => h.open)),
    close: Math.max(...open.map((h) => h.close)),
  };
}

/** Every quarter-hour mark that day, opening and closing both included. */
export function timeMarks(hours: BuildingHours, day: Weekday): string[] {
  const span = dayHours(hours, day);
  const marks: string[] = [];
  if (!span) return marks;
  for (let t = span.open; t <= span.close; t += SLOT_MINUTES) marks.push(toHHMM(t));
  return marks;
}

/** "9:00 am", matching how the rules page has always written times. */
export function formatHour(hhmm: string): string {
  return formatTime(hhmm).toLowerCase();
}

/** "8:00 am – 6:00 pm". */
export function formatOpenHours(hours: OpenHours): string {
  return `${formatHour(toHHMM(hours.open))} – ${formatHour(toHHMM(hours.close))}`;
}

/**
 * One building's week, with days in a row that keep the same hours joined:
 * [{ label: "Tuesday - Thursday", hours: "8:00 am – 8:00 pm" }, ...]
 */
export function groupedHours(
  week: Partial<Record<Weekday, OpenHours>>,
): { label: string; hours: string }[] {
  const groups: { days: Weekday[]; hours: string }[] = [];
  for (const day of WEEKDAYS) {
    const today = week[day];
    const hours = today ? formatOpenHours(today) : "Closed";
    const last = groups[groups.length - 1];
    if (last && last.hours === hours) last.days.push(day);
    else groups.push({ days: [day], hours });
  }
  return groups.map((g) => ({
    label: g.days.length === 1 ? g.days[0] : `${g.days[0]} - ${g.days[g.days.length - 1]}`,
    hours: g.hours,
  }));
}

/** The rules page's old list, until it reads a term's hours. */
export function groupedCenterHours(): { label: string; hours: string }[] {
  return groupedHours(
    Object.fromEntries(
      WEEKDAYS.map((d) => [
        d,
        { open: hhmmToMinutes(CENTER_HOURS[d].open), close: hhmmToMinutes(CENTER_HOURS[d].close) },
      ]),
    ),
  );
}
