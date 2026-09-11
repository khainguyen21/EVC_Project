import { z } from "zod";
import type { Holiday, Term } from "@/types";

// Structural shapes of the Prisma rows we serialize (so this file doesn't
// depend on the generated client's export names).
interface DbHoliday {
  id: number;
  name: string;
  date: Date;
}

interface DbTerm {
  id: number;
  name: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  holidays: DbHoliday[];
}

// Prisma hands back @db.Date columns as UTC-midnight Date objects; slicing the
// ISO string recovers the calendar date exactly, with no timezone drift.
export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Accepts "YYYY-MM-DD" only, and rejects impossible dates like 2026-02-30.
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
  .refine((s) => {
    // An out-of-range month or day (e.g. "2026-13-01") parses to an Invalid
    // Date, and toISOString() throws on it. Zod propagates that out of
    // safeParse, which would turn a bad request into a 500 — so check the
    // time value before formatting.
    const parsed = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && toIsoDate(parsed) === s;
  }, "Invalid calendar date");

export function serializeHoliday(holiday: DbHoliday): Holiday {
  return { id: holiday.id, name: holiday.name, date: toIsoDate(holiday.date) };
}

export function serializeTerm(term: DbTerm): Term {
  return {
    id: term.id,
    name: term.name,
    startDate: toIsoDate(term.startDate),
    endDate: toIsoDate(term.endDate),
    isActive: term.isActive,
    holidays: [...term.holidays]
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(serializeHoliday),
  };
}
