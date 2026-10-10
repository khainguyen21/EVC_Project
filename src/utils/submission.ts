/**
 * Validation and shaping for tutor availability submissions.
 *
 * Pure and browser-safe: the public form, the admin inbox and the API routes
 * all use the same rules, so a submission William edits is held to exactly
 * what a tutor had to pass.
 */
import { z } from "zod";
import { parseCourseCodes, unreadWords } from "./courseCodes";
import {
  SLOT_MINUTES,
  WEEKDAYS,
  formHours,
  formatHour,
  hhmmToMinutes,
  toHHMM,
  type BuildingHours,
} from "./centerHours";

export const SUBMISSION_STATUSES = ["pending", "approved", "declined"] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

/** William's minimum. Below it a submission is flagged, not refused. */
export const MIN_UNITS = 6;

const HHMM = /^\d{2}:\d{2}$/;

/** Times are checked against the hours the form offers (see formHours). */
function availabilityRowSchema(hours: BuildingHours) {
  return z
    .object({
      day: z.enum(WEEKDAYS, "Pick a weekday"),
      allDay: z.boolean(),
      // Blank on "all day" rows, which get the term's hours instead.
      start: z.string(),
      end: z.string(),
    })
    .superRefine((row, ctx) => {
      const span = formHours(hours, row.day);
      if (!span) {
        ctx.addIssue({ code: "custom", message: `Tutoring is closed on ${row.day}s` });
        return;
      }
      if (row.allDay) return;

      if (!HHMM.test(row.start) || !HHMM.test(row.end)) {
        ctx.addIssue({
          code: "custom",
          message: `${row.day}: pick a start and end time`,
        });
        return;
      }

      const start = hhmmToMinutes(row.start);
      const end = hhmmToMinutes(row.end);

      if (start % SLOT_MINUTES !== 0 || end % SLOT_MINUTES !== 0) {
        ctx.addIssue({
          code: "custom",
          message: "Times must be in 15-minute steps",
        });
      } else if (start < span.open || end > span.close) {
        ctx.addIssue({
          code: "custom",
          message: `${row.day} times must be between ${formatHour(toHHMM(span.open))} and ${formatHour(toHHMM(span.close))}`,
        });
      } else if (start >= end) {
        ctx.addIssue({
          code: "custom",
          message: `${row.day}: end time must be after start time`,
        });
      }
    });
}

export type AvailabilityRow = z.infer<ReturnType<typeof availabilityRowSchema>>;

/** Every field except the student ID, which only the tutor ever sets. */
export const submissionFieldsSchema = (hours: BuildingHours) => z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.email("Enter a valid email address").trim().max(200),
  units: z
    .number("Units must be a number")
    .min(0, "Units cannot be negative")
    .max(40, "Units look too high"),
  trainingDone: z.boolean(),
  subjects: z
    .string()
    .trim()
    .min(1, "List at least one subject")
    .max(1000),
  availability: z
    .array(availabilityRowSchema(hours))
    .min(1, "Add at least one day you are available")
    .max(25),
  notes: z.string().trim().max(1000).optional().default(""),
});

export const studentIdSchema = z
  .string()
  .trim()
  .regex(/^\d{7}$/, "Student ID must be exactly 7 digits");

export const submissionSchema = (hours: BuildingHours) =>
  submissionFieldsSchema(hours).extend({ studentId: studentIdSchema });

export type SubmissionFields = z.infer<ReturnType<typeof submissionFieldsSchema>>;
export type SubmissionInput = z.infer<ReturnType<typeof submissionSchema>>;

/**
 * Turns "all day" rows into the hours the form offers and puts rows in
 * week order, so everything downstream deals only in concrete times.
 */
export function resolveAvailability(
  rows: AvailabilityRow[],
  hours: BuildingHours,
): AvailabilityRow[] {
  return rows
    .map((row) => {
      const span = row.allDay ? formHours(hours, row.day) : null;
      return span ? { ...row, start: toHHMM(span.open), end: toHHMM(span.close) } : row;
    })
    .sort(
      (a, b) =>
        WEEKDAYS.indexOf(a.day) - WEEKDAYS.indexOf(b.day) ||
        hhmmToMinutes(a.start) - hhmmToMinutes(b.start),
    );
}

/** "Open Computer Lab" is a subject tutors list, but it has no course code. */
export const OPEN_LAB_PATTERN = /open\s+(computer\s+)?lab/i;

/**
 * The comma-separated parts of a subject list that name no course.
 *
 * A part that is only numbers ("71", "30A") continues the department before
 * it, so "MATH 63, 71" is fine. A part with words of its own must name a
 * department itself: the tokenizer would read "COMS 76" as a continuation of
 * the COMSC before it, and William should get to check that guess. So should
 * a part with words the reader had to skip: "Math 20 and up" would otherwise
 * quietly read as MATH 20 alone.
 */
export function findUnrecognizedSubjects(raw: string): string[] {
  const parts = raw
    .split(/[,;\n]/)
    .map((p) => p.trim())
    .filter(Boolean);

  const unrecognized: string[] = [];
  let seen = new Set<string>();
  for (let i = 0; i < parts.length; i++) {
    const soFar = new Set(parseCourseCodes(parts.slice(0, i + 1).join(", ")));
    const addedSomething = [...soFar].some((code) => !seen.has(code));
    // "018", "21-25" or a C-number like "C1001", going with the department before.
    const onlyNumbers = parts[i].split(/\s+/).every((w) => /^C?\d/i.test(w));
    // A repeat ("Math 63, Math 63") adds nothing new but still names a course.
    const standsAlone = parseCourseCodes(parts[i]).length > 0;
    const openLab = OPEN_LAB_PATTERN.test(parts[i]);
    const readable = standsAlone
      ? unreadWords(parts[i]).length === 0
      : onlyNumbers && addedSomething;
    if (!readable && !openLab) unrecognized.push(parts[i]);
    seen = soFar;
  }
  return unrecognized;
}

export type SubmissionFlag = "under-units" | "subjects-need-review";

export function submissionFlags(s: {
  units: number;
  subjectsRaw: string;
}): SubmissionFlag[] {
  const flags: SubmissionFlag[] = [];
  if (s.units < MIN_UNITS) flags.push("under-units");
  if (findUnrecognizedSubjects(s.subjectsRaw).length > 0) {
    flags.push("subjects-need-review");
  }
  return flags;
}

/** The database columns a validated form fills in. */
export function toSubmissionData(input: SubmissionFields, hours: BuildingHours) {
  return {
    name: input.name,
    email: input.email,
    units: input.units,
    trainingDone: input.trainingDone,
    subjectsRaw: input.subjects,
    subjectCodes: parseCourseCodes(input.subjects),
    availability: resolveAvailability(input.availability, hours),
    notes: input.notes ? input.notes : null,
  };
}

/**
 * What a tutor's second submission for the same term writes over the first.
 * It replaces everything, including any edits William made, and goes back to
 * pending so he knows to look again. If he had already placed them on the
 * planner, they get its "Availability changed" badge.
 */
export function toResubmissionData(
  input: SubmissionFields,
  hours: BuildingHours,
  now: Date,
  hasShifts: boolean,
) {
  return {
    ...toSubmissionData(input, hours),
    status: "pending" as const,
    resubmittedAt: now,
    availabilityChanged: hasShifts,
  };
}
