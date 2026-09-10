import type { ScheduleEntry, Tutor } from "@/types";

// Campus timezone — schedules are wall-clock times at EVC (San Jose, CA).
const CAMPUS_TIME_ZONE = "America/Los_Angeles";

// How far ahead (in minutes) a shift counts as "starting soon".
export const SOON_WINDOW_MINUTES = 60;

export interface CampusNow {
  day: string; // "Monday" ... "Sunday"
  minutes: number; // minutes since midnight, campus time
  date: string; // "YYYY-MM-DD", campus time — compared against term/holiday dates
}

export type SlotStatus = "now" | "soon";

// Weekday order used to measure how far `slot.day` is from `now.day` in a
// day-agnostic way, so the "soon" window can cross a midnight boundary.
const DAY_ORDER = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MINUTES_PER_WEEK = 7 * 24 * 60;

export interface TutorAvailability {
  status: SlotStatus;
  slot: ScheduleEntry;
}

/**
 * Current weekday and minutes-since-midnight in campus time,
 * regardless of the visitor's device timezone.
 */
// Constructed once — Intl.DateTimeFormat creation is the expensive part,
// and getCampusNow runs on every render via useCampusNow's getSnapshot.
const campusClock = new Intl.DateTimeFormat("en-US", {
  timeZone: CAMPUS_TIME_ZONE,
  weekday: "long",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function getCampusNow(): CampusNow {
  const parts = campusClock.formatToParts(new Date());

  let day = "";
  let hour = 0;
  let minute = 0;
  let year = "";
  let month = "";
  let dayOfMonth = "";
  for (const part of parts) {
    if (part.type === "weekday") day = part.value;
    else if (part.type === "hour") hour = parseInt(part.value, 10);
    else if (part.type === "minute") minute = parseInt(part.value, 10);
    else if (part.type === "year") year = part.value;
    else if (part.type === "month") month = part.value;
    else if (part.type === "day") dayOfMonth = part.value;
  }

  return {
    day,
    minutes: hour * 60 + minute,
    date: `${year}-${month}-${dayOfMonth}`,
  };
}

/** Parses "14:00" → 840. Returns null for missing/invalid input. */
export function toMinutes(hhmm: string | undefined): number | null {
  if (!hhmm) return null;
  const match = hhmm.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

/**
 * "now"  — the slot is active at this moment.
 * "soon" — the slot starts within SOON_WINDOW_MINUTES.
 * null   — neither (or the slot has no raw times to compare).
 */
export function getSlotStatus(
  slot: ScheduleEntry,
  now: CampusNow,
): SlotStatus | null {
  const start = toMinutes(slot.start);
  const end = toMinutes(slot.end);
  if (start === null || end === null) return null;

  if (slot.day === now.day && start <= now.minutes && now.minutes < end) {
    return "now";
  }

  // Measured across the week so a shift starting just after midnight (e.g.
  // Tuesday 00:10 while it's still Monday 23:40) is still caught as "soon"
  // instead of being excluded purely because slot.day !== now.day.
  const nowIndex = DAY_ORDER.indexOf(now.day);
  const slotIndex = DAY_ORDER.indexOf(slot.day);
  if (nowIndex === -1 || slotIndex === -1) return null;

  const nowTotal = nowIndex * 1440 + now.minutes;
  const slotStartTotal = slotIndex * 1440 + start;
  const untilStart = ((slotStartTotal - nowTotal) % MINUTES_PER_WEEK + MINUTES_PER_WEEK) % MINUTES_PER_WEEK;
  if (untilStart > 0 && untilStart <= SOON_WINDOW_MINUTES) return "soon";
  return null;
}

/**
 * The tutor's best current availability: an active shift wins over an
 * upcoming one; among upcoming shifts the earliest start wins.
 */
export function getTutorAvailability(
  tutor: Tutor,
  now: CampusNow,
): TutorAvailability | null {
  let best: TutorAvailability | null = null;

  for (const slot of tutor.schedule) {
    const status = getSlotStatus(slot, now);
    if (!status) continue;
    if (status === "now") return { status, slot };
    // getSlotStatus already returned non-null, so start is guaranteed parseable.
    if (!best || toMinutes(slot.start)! < toMinutes(best.slot.start)!) {
      best = { status, slot };
    }
  }

  return best;
}
