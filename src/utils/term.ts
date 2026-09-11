import type { Term } from "@/types";
import type { CampusNow } from "./availability";

export type CampusClosedReason = "before-term" | "after-term" | "holiday";

export interface CampusStatus {
  open: boolean;
  reason?: CampusClosedReason;
  holidayName?: string;
}

/**
 * Whether drop-in tutoring is running today according to the active term.
 *
 * No term configured → treated as open, so the schedule falls back to the
 * plain weekday/time behaviour instead of hiding "Available Now" entirely.
 */
export function getCampusStatus(
  now: CampusNow,
  term: Term | null | undefined,
): CampusStatus {
  if (!term) return { open: true };

  // "YYYY-MM-DD" strings compare correctly as plain strings.
  if (now.date < term.startDate) return { open: false, reason: "before-term" };
  if (now.date > term.endDate) return { open: false, reason: "after-term" };

  const holiday = term.holidays.find((h) => h.date === now.date);
  if (holiday) {
    return { open: false, reason: "holiday", holidayName: holiday.name };
  }

  return { open: true };
}

export type TermLifecycle = "upcoming" | "current" | "ended";

/**
 * Where `todayIso` ("YYYY-MM-DD", campus time) falls relative to a term.
 *
 * The admin panel uses this to warn when the active term has ended: the
 * public site hides live availability outside the term, so a term nobody
 * rolled forward silently reads as "Semester Over" to students.
 */
export function getTermLifecycle(term: Term, todayIso: string): TermLifecycle {
  if (todayIso < term.startDate) return "upcoming";
  if (todayIso > term.endDate) return "ended";
  return "current";
}

/** 31 → "31st", 2 → "2nd", 11 → "11th" */
function ordinal(n: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0]}`;
}

/**
 * "2026-08-31" → "August 31st, 2026", matching the site's existing banner copy.
 * Built from the calendar parts (not `new Date(iso)`) so the visitor's timezone
 * can never shift the day.
 */
export function formatTermDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const monthName = new Date(year, month - 1, day, 12).toLocaleDateString(
    "en-US",
    { month: "long" },
  );
  return `${monthName} ${ordinal(day)}, ${year}`;
}
