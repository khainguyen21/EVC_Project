import { formatHour, toHHMM } from "@/utils/centerHours";
import { shortenCourseCodes } from "@/utils/courseCodes";
import { OPEN_LAB, type Building, type HoursColor } from "@/utils/planner";

export const BUILDING_INFO: Record<Building, { name: string; color: string }> = {
  "MS-112": { name: "Math & Science", color: "#0891b2" },
  "LE-237": { name: "Library", color: "#4f46e5" },
  "SQ-231": { name: "Biology", color: "#139241" },
  "VPA-109/111": { name: "Music", color: "#db2777" },
};

export const HOURS_TONE: Record<HoursColor, { bg: string; color: string; label: string }> = {
  unset: { bg: "#f1f5f9", color: "#475569", label: "Hours this week" },
  below: { bg: "#f1f5f9", color: "#475569", label: "Below your usual hours" },
  at: { bg: "#dcfce7", color: "#15803d", label: "At your usual hours" },
  above: { bg: "#fef3c7", color: "#b45309", label: "Above your usual hours" },
  limit: { bg: "#fee2e2", color: "#b91c1c", label: "At the 20-hour limit" },
};

/** "9 am", "10:15 am". */
export function clock(minutes: number): string {
  return formatHour(toHHMM(minutes)).replace(":00", "");
}

export function timeRange(start: number, end: number): string {
  return `${clock(start)} – ${clock(end)}`;
}

/** "4 h", "4.5 h", "4.25 h". */
export function hoursText(minutes: number): string {
  return `${+(minutes / 60).toFixed(2)} h`;
}

/** "MATH 20-25, 62" lines, with Open Computer Lab spelled out. */
export function courseLines(courses: string[]): string[] {
  const lines = shortenCourseCodes(courses.filter((c) => c !== OPEN_LAB));
  return courses.includes(OPEN_LAB) ? [...lines, "Open Computer Lab"] : lines;
}
