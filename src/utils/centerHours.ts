import { formatTime } from "./formatTime";

/**
 * When the tutoring center is open, in 24-hour campus time.
 *
 * The rules page shows these to students and the availability form limits
 * tutors' times to them, so both read from here and cannot drift apart.
 */
export const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export const CENTER_HOURS: Record<Weekday, { open: string; close: string }> = {
  Monday: { open: "09:00", close: "18:00" },
  Tuesday: { open: "09:00", close: "20:00" },
  Wednesday: { open: "09:00", close: "20:00" },
  Thursday: { open: "09:00", close: "20:00" },
  Friday: { open: "09:00", close: "17:00" },
};

export const SLOT_MINUTES = 30;

export function toHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Every half-hour mark from opening to closing, both included. */
export function halfHourMarks(day: Weekday): string[] {
  const { open, close } = CENTER_HOURS[day];
  const marks: string[] = [];
  for (
    let t = hhmmToMinutes(open);
    t <= hhmmToMinutes(close);
    t += SLOT_MINUTES
  ) {
    marks.push(toHHMM(t));
  }
  return marks;
}

/** "9:00 am", matching how the rules page has always written times. */
export function formatHour(hhmm: string): string {
  return formatTime(hhmm).toLowerCase();
}

/**
 * Consecutive days with the same hours, merged for display:
 * [{ label: "Tuesday - Thursday", hours: "9:00 am – 8:00 pm" }, ...]
 */
export function groupedCenterHours(): { label: string; hours: string }[] {
  const groups: { days: Weekday[]; open: string; close: string }[] = [];
  for (const day of WEEKDAYS) {
    const { open, close } = CENTER_HOURS[day];
    const last = groups[groups.length - 1];
    if (last && last.open === open && last.close === close) {
      last.days.push(day);
    } else {
      groups.push({ days: [day], open, close });
    }
  }
  return groups.map((g) => ({
    label:
      g.days.length === 1
        ? g.days[0]
        : `${g.days[0]} - ${g.days[g.days.length - 1]}`,
    hours: `${formatHour(g.open)} – ${formatHour(g.close)}`,
  }));
}
