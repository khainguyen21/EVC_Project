import { toMinutes } from "./availability";

// Display order for schedule rows. The campus week runs Monday→Friday; weekend
// days trail behind so they still land somewhere predictable if one shows up.
const WEEKDAY_ORDER = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// Unknown/misspelled days sort last instead of jumping to the top.
function dayIndex(day: string) {
  const index = WEEKDAY_ORDER.indexOf(day);
  return index === -1 ? WEEKDAY_ORDER.length : index;
}

/**
 * Orders shifts Monday→Friday, then by start time within a day.
 * `day` is a free-text column, so this can't be an `orderBy` in Prisma.
 */
export function sortSchedules<T extends { day: string; start: string }>(
  schedules: T[],
): T[] {
  return [...schedules].sort((a, b) => {
    const byDay = dayIndex(a.day) - dayIndex(b.day);
    if (byDay !== 0) return byDay;
    return (toMinutes(a.start) ?? 0) - (toMinutes(b.start) ?? 0);
  });
}
