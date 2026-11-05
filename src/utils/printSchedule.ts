import { toMinutes } from "./availability";
import { BUILDINGS } from "./centerHours";
import { sortSchedules } from "./sortSchedules";
import { sortSubjectAlphabetically } from "./subjectMapping";

/**
 * The schedule William prints for the wall and sends to the EVC website team,
 * laid out like his Fall 2026 Word document: a section per subject, with
 * professors first, then staff, then student tutors.
 *
 * It reads the public schedule, so professors and staff come from Manage
 * Staff. Decisions are in docs/ROADMAP.md, feature 3.
 */

/** One person on the public schedule, as /api/tutors sends them. */
export interface PrintTutor {
  name: string;
  type?: string;
  subjects: { name: string; field: string }[];
  schedule: { day: string; start?: string; end?: string; location: string }[];
}

export type PrintPersonType = "professor" | "staff" | "tutor";

export interface PrintPerson {
  type: PrintPersonType;
  name: string;
  /**
   * Professors and staff: every subject line they have, e.g. "Physics/Astronomy"
   * or a staff member's role. Student tutors: this section's courses.
   */
  detail: string;
  /** Professors and staff: one line. Student tutors: one bullet each. */
  hours: string[];
}

export interface PrintSection {
  field: string;
  /** The heading's room, e.g. "Biology Skills Lab – BSL, SQ-231 of Sequoia". */
  room: string;
  /** The rooms this section's printed shifts are in, in building order. */
  locations: string[];
  people: PrintPerson[];
}

// From William's document. A room he hasn't named prints as itself.
const ROOM_NAMES: Record<string, string> = {
  "MS-112": "Math and Science Resource Center-MSRC, MS-112 of MS3",
  "SQ-231": "Biology Skills Lab – BSL, SQ-231 of Sequoia",
};
const ROOM_IN: Record<string, string> = {
  "SQ-231": "SQ-231 in Sequoia building",
};

// William writes days three ways: "Mon/Wed" for students, "Mondays/Wednesdays"
// for professors, and "MTWTh" for staff (but "Wed" for a single day).
const SHORT_DAYS: Record<string, string> = {
  Monday: "Mon",
  Tuesday: "Tues",
  Wednesday: "Wed",
  Thursday: "Thurs",
  Friday: "Fri",
  Saturday: "Sat",
  Sunday: "Sun",
};
const DAY_LETTERS: Record<string, string> = {
  Monday: "M",
  Tuesday: "T",
  Wednesday: "W",
  Thursday: "Th",
  Friday: "F",
  Saturday: "Sa",
  Sunday: "Su",
};

const TYPE_ORDER: PrintPersonType[] = ["professor", "staff", "tutor"];

function clock(hhmm: string, short: boolean) {
  const minutes = toMinutes(hhmm);
  if (minutes === null) return null;
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const h = hour % 12 || 12;
  return {
    text: short && minute === 0 ? `${h}` : `${h}:${String(minute).padStart(2, "0")}`,
    period: hour >= 12 ? "pm" : "am",
  };
}

/**
 * "12:00"–"18:00" → "12:00-6:00pm", "10:00"–"12:00" → "10:00am-12:00pm".
 * The short style, for staff, drops ":00": "9am-6pm", "5-8pm".
 */
export function formatRange(start: string, end: string, style: "full" | "short" = "full"): string {
  const from = clock(start, style === "short");
  const to = clock(end, style === "short");
  if (!from || !to) return `${start}-${end}`;
  return `${from.text}${from.period === to.period ? "" : from.period}-${to.text}${to.period}`;
}

interface Slot {
  day: string;
  start: string;
  end: string;
  location: string;
}

interface DayGroup {
  days: string[];
  ranges: string[];
  location: string;
}

/**
 * Days with exactly the same shifts share a group, Monday first. With
 * `byRoom`, shifts in different rooms never share one, even on the same day.
 */
function groupDays(slots: Slot[], byRoom: boolean, style: "full" | "short"): DayGroup[] {
  const days = new Map<string, DayGroup>();
  for (const slot of sortSchedules(slots)) {
    const location = byRoom ? slot.location : "";
    const key = `${location}\n${slot.day}`;
    const entry = days.get(key) ?? { days: [slot.day], ranges: [], location };
    days.set(key, entry);
    const range = formatRange(slot.start, slot.end, style);
    if (!entry.ranges.includes(range)) entry.ranges.push(range);
  }

  const groups = new Map<string, DayGroup>();
  for (const entry of days.values()) {
    const key = `${entry.location}\n${entry.ranges.join("\n")}`;
    const group = groups.get(key);
    if (group) group.days.push(...entry.days);
    else groups.set(key, entry);
  }
  return [...groups.values()];
}

function dayLabel(type: PrintPersonType, allDays: string[]): string {
  const days = allDays.filter(Boolean);
  if (type === "professor") {
    return days.map((day) => (day in SHORT_DAYS ? `${day}s` : day)).join("/");
  }
  if (type === "staff" && days.length > 1) {
    return days.map((day) => DAY_LETTERS[day] ?? day).join("");
  }
  return days.map((day) => SHORT_DAYS[day] ?? day).join("/");
}

function hoursFor(type: PrintPersonType, slots: Slot[]): string[] {
  // A blank day is refused on Manage Staff, but would otherwise leave a stray space.
  const when = (group: DayGroup) =>
    [dayLabel(type, group.days), group.ranges.join(", ")].filter(Boolean).join(" ");

  if (type === "tutor") {
    return groupDays(slots, true, "full").map(
      (group) => `${when(group)} (in ${ROOM_IN[group.location] ?? group.location})`,
    );
  }
  const style = type === "staff" ? "short" : "full";
  return [groupDays(slots, false, style).map(when).join(", ")];
}

const unique = (values: string[]) => [...new Set(values)];

/** The four buildings in their usual order, then any other room, A to Z. */
function locationOrder(locations: Iterable<string>): string[] {
  const rooms = new Set(locations);
  const known: readonly string[] = BUILDINGS;
  const others = [...rooms].filter((l) => !known.includes(l)).sort();
  return [...BUILDINGS.filter((b) => rooms.has(b)), ...others];
}

/** The rooms William can tick: the four buildings, plus any other room on the schedule. */
export function printLocations(tutors: PrintTutor[]): string[] {
  const rooms = tutors.flatMap((t) => t.schedule.map((s) => s.location)).filter((l) => l.trim() !== "");
  return locationOrder([...BUILDINGS, ...rooms]);
}

export function buildPrintSchedule(tutors: PrintTutor[], locations: string[]): PrintSection[] {
  const ticked = new Set(locations);
  const sections = new Map<string, { people: PrintPerson[]; locations: Set<string> }>();

  for (const tutor of tutors) {
    const slots: Slot[] = tutor.schedule
      .filter((s) => ticked.has(s.location))
      .map((s) => ({ day: s.day, start: s.start ?? "", end: s.end ?? "", location: s.location }));
    if (slots.length === 0) continue;

    const type: PrintPersonType =
      tutor.type === "professor" || tutor.type === "staff" ? tutor.type : "tutor";
    const hours = hoursFor(type, slots);
    const everySubject = unique(tutor.subjects.map((s) => s.name)).join("/");

    for (const field of unique(tutor.subjects.map((s) => s.field))) {
      const detail =
        type === "tutor"
          ? unique(tutor.subjects.filter((s) => s.field === field).map((s) => s.name)).join(", ")
          : everySubject;
      const section = sections.get(field) ?? { people: [], locations: new Set<string>() };
      sections.set(field, section);
      section.people.push({ type, name: tutor.name, detail, hours });
      for (const slot of slots) section.locations.add(slot.location);
    }
  }

  return sortSubjectAlphabetically([...sections.keys()]).map((field) => {
    const { people, locations: used } = sections.get(field)!;
    const rooms = locationOrder(used);
    return {
      field,
      room: rooms.map((l) => ROOM_NAMES[l] ?? l).join("; "),
      locations: rooms,
      people: people.sort(
        (a, b) =>
          TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) ||
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      ),
    };
  });
}

/** The page title, which follows the buildings ticked (docs/ROADMAP.md, feature 3). */
export function printTitle(term: string | null, locations: string[]): string {
  const ticked = new Set(locations);
  const only = (...rooms: string[]) => ticked.size === rooms.length && rooms.every((r) => ticked.has(r));
  const title = only("MS-112", "SQ-231")
    ? "Math and Science (STEM) Faculty/Staff/Tutor Tutoring Schedule"
    : only("SQ-231")
      ? "Biology Tutoring Schedule"
      : only("LE-237")
        ? "Campus Tutoring Center Schedule"
        : only("VPA-109/111")
          ? "Music Tutoring Schedule"
          : "Tutoring Schedule";
  return term ? `${term} ${title}` : title;
}
