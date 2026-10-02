/**
 * Validation and shaping for tutor availability submissions.
 *
 * Pure and browser-safe: the public form, the admin inbox and the API routes
 * all use the same rules, so a submission William edits is held to exactly
 * what a tutor had to pass.
 */
import { z } from "zod";
import { parseCourseCodes } from "./courseCodes";
import {
  CENTER_HOURS,
  SLOT_MINUTES,
  WEEKDAYS,
  hhmmToMinutes,
} from "./centerHours";

export const SUBMISSION_STATUSES = ["pending", "approved", "declined"] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

/** William's minimum. Below it a submission is flagged, not refused. */
export const MIN_UNITS = 6;

const HHMM = /^\d{2}:\d{2}$/;

export const availabilityRowSchema = z
  .object({
    day: z.enum(WEEKDAYS, "Pick a weekday"),
    allDay: z.boolean(),
    // Blank on "all day" rows, which get the center's hours instead.
    start: z.string(),
    end: z.string(),
  })
  .superRefine((row, ctx) => {
    if (row.allDay) return;

    if (!HHMM.test(row.start) || !HHMM.test(row.end)) {
      ctx.addIssue({
        code: "custom",
        message: `${row.day}: pick a start and end time`,
      });
      return;
    }

    const { open, close } = CENTER_HOURS[row.day];
    const start = hhmmToMinutes(row.start);
    const end = hhmmToMinutes(row.end);

    if (start % SLOT_MINUTES !== 0 || end % SLOT_MINUTES !== 0) {
      ctx.addIssue({
        code: "custom",
        message: "Times must be on the hour or half hour",
      });
    } else if (start < hhmmToMinutes(open) || end > hhmmToMinutes(close)) {
      ctx.addIssue({
        code: "custom",
        message: `${row.day} times must be within center hours`,
      });
    } else if (start >= end) {
      ctx.addIssue({
        code: "custom",
        message: `${row.day}: end time must be after start time`,
      });
    }
  });

export type AvailabilityRow = z.infer<typeof availabilityRowSchema>;

/** Every field except the student ID, which only the tutor ever sets. */
export const submissionFieldsSchema = z.object({
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
    .array(availabilityRowSchema)
    .min(1, "Add at least one day you are available")
    .max(25),
  notes: z.string().trim().max(1000).optional().default(""),
});

export const studentIdSchema = z
  .string()
  .trim()
  .regex(/^\d{7}$/, "Student ID must be exactly 7 digits");

export const submissionSchema = submissionFieldsSchema.extend({
  studentId: studentIdSchema,
});

export type SubmissionFields = z.infer<typeof submissionFieldsSchema>;
export type SubmissionInput = z.infer<typeof submissionSchema>;

/**
 * Turns "all day" rows into the center's hours for that day and puts rows in
 * week order, so everything downstream deals only in concrete times.
 */
export function resolveAvailability(rows: AvailabilityRow[]): AvailabilityRow[] {
  return rows
    .map((row) =>
      row.allDay
        ? {
            ...row,
            start: CENTER_HOURS[row.day].open,
            end: CENTER_HOURS[row.day].close,
          }
        : row,
    )
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
 * the COMSC before it, and William should get to check that guess.
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
    const onlyNumbers = parts[i].split(/\s+/).every((w) => /^\d/.test(w));
    // A repeat ("Math 63, Math 63") adds nothing new but still names a course.
    const standsAlone = parseCourseCodes(parts[i]).length > 0;
    const openLab = OPEN_LAB_PATTERN.test(parts[i]);
    if (!standsAlone && !(onlyNumbers && addedSomething) && !openLab) {
      unrecognized.push(parts[i]);
    }
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
export function toSubmissionData(input: SubmissionFields) {
  return {
    name: input.name,
    email: input.email,
    units: input.units,
    trainingDone: input.trainingDone,
    subjectsRaw: input.subjects,
    subjectCodes: parseCourseCodes(input.subjects),
    availability: resolveAvailability(input.availability),
    notes: input.notes ? input.notes : null,
  };
}

/**
 * What a tutor's second submission for the same term writes over the first.
 * It replaces everything, including any edits William made, and goes back to
 * pending so he knows to look again.
 */
export function toResubmissionData(input: SubmissionFields, now: Date) {
  return {
    ...toSubmissionData(input),
    status: "pending" as const,
    resubmittedAt: now,
  };
}
