/**
 * Shared test data. Only tests and prisma/sample-data import this: building
 * hours live in the database, never in the app's code.
 */
import { hhmmToMinutes, type BuildingHours, type OpenHours, type Weekday } from "./centerHours";

function hours(open: string, close: string): OpenHours {
  return { open: hhmmToMinutes(open), close: hhmmToMinutes(close) };
}

function week(
  monday: OpenHours,
  midweek: OpenHours,
  friday: OpenHours,
): Partial<Record<Weekday, OpenHours>> {
  return { Monday: monday, Tuesday: midweek, Wednesday: midweek, Thursday: midweek, Friday: friday };
}

/** The Fall 2026 hours from docs/ROADMAP.md. */
export const FALL_2026_HOURS: BuildingHours = {
  "MS-112": week(hours("08:00", "18:00"), hours("08:00", "20:00"), hours("08:00", "17:00")),
  "LE-237": week(hours("09:00", "17:00"), hours("09:00", "17:00"), hours("09:00", "13:00")),
  "SQ-231": week(hours("09:00", "16:00"), hours("09:00", "15:00"), hours("09:00", "13:00")),
  "VPA-109/111": week(hours("11:00", "15:00"), hours("11:00", "15:00"), hours("11:00", "15:00")),
};
