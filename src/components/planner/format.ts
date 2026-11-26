import { formatHour, toHHMM, type Building } from "@/utils/centerHours";
import { shortenCourseCodes } from "@/utils/courseCodes";
import { OPEN_LAB, type HoursColor, type UsualHours } from "@/utils/planner";

export const BUILDING_INFO: Record<Building, { name: string; color: string }> = {
  "MS-112": { name: "Math & Science", color: "#0891b2" },
  "LE-237": { name: "Library", color: "#4f46e5" },
  "SQ-231": { name: "Biology", color: "#139241" },
  "VPA-109/111": { name: "Music", color: "#db2777" },
};

export const HOURS_TONE: Record<HoursColor, { bg: string; color: string; label: string }> = {
  unset: { bg: "#f1f5f9", color: "#475569", label: "Hours this week" },
  below: { bg: "#f1f5f9", color: "#475569", label: "Below your usual hours" },
  inside: { bg: "#dcfce7", color: "#15803d", label: "Within your usual hours" },
  above: { bg: "#fef3c7", color: "#b45309", label: "Above your usual hours" },
  limit: { bg: "#fee2e2", color: "#b91c1c", label: "At the 20-hour limit" },
};

/** "4–8", or "5" when the range is one number. */
export function usualHoursText(usual: UsualHours): string {
  return usual.min === usual.max ? String(usual.min) : `${usual.min}–${usual.max}`;
}

/** "9 am", "10:15 am". */
export function clock(minutes: number): string {
  return formatHour(toHHMM(minutes)).replace(":00", "");
}

export function timeRange(start: number, end: number): string {
  return `${clock(start)} – ${clock(end)}`;
}

/** "9–11", "1:30–3", or "11–1 pm" across noon, for shifts too narrow for the full range. */
export function shortTimeRange(start: number, end: number): string {
  const [from, to] = [clock(start), clock(end)];
  const range = `${from.slice(0, -3)}–${to.slice(0, -3)}`;
  // A non-breaking space, so "pm" never wraps onto a line by itself.
  return from.slice(-2) === to.slice(-2) ? range : `${range} ${to.slice(-2)}`;
}

/** "4 h", "4.5 h", "4.25 h". */
export function hoursText(minutes: number): string {
  return `${+(minutes / 60).toFixed(2)} h`;
}

/** "Nov 25, 3:10 PM", in William's own time zone. */
export function publishedAtText(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * A term in the planner's term menu. The current term is the one last
 * published, whose tutors students see now. Before the first publish no term
 * is current, so the menu shows plain names.
 */
export function termOptionLabel(name: string, termId: number, currentTermId: number | null): string {
  if (currentTermId === null) return name;
  return termId === currentTermId ? `${name} · Current` : `${name} · not current`;
}

/** The line beside Publish: is this term the one students see, and since when. */
export function publishStatusLine(
  isCurrent: boolean,
  lastPublishedAt: string | null,
): { text: string; current: boolean } {
  if (lastPublishedAt === null) return { text: "Not published yet", current: false };
  return isCurrent
    ? { text: `Current · published ${publishedAtText(lastPublishedAt)}`, current: true }
    : { text: `Not current · last published ${publishedAtText(lastPublishedAt)}`, current: false };
}

/** "MATH 20-25, 62" lines, with Open Computer Lab spelled out. */
export function courseLines(courses: string[]): string[] {
  const lines = shortenCourseCodes(courses.filter((c) => c !== OPEN_LAB));
  return courses.includes(OPEN_LAB) ? [...lines, "Open Computer Lab"] : lines;
}
