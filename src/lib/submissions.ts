import "server-only";
import { randomInt } from "node:crypto";
import type { Submission } from "@/types";
import type { Weekday } from "@/utils/centerHours";
import { parseCourseCodes } from "@/utils/courseCodes";
import type { Building, Shift } from "@/utils/planner";
import {
  submissionFlags,
  type AvailabilityRow,
  type SubmissionStatus,
} from "@/utils/submission";

// Structural shape of the Prisma row (see lib/terms.ts for why).
interface DbSubmission {
  id: number;
  termId: number;
  name: string;
  studentId: string;
  email: string;
  units: number;
  trainingDone: boolean;
  subjectsRaw: string;
  availability: unknown;
  notes: string | null;
  status: string;
  resubmittedAt: Date | null;
  availabilityChanged: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: { shifts: number };
}

export function serializeSubmission(s: DbSubmission): Submission {
  return {
    id: s.id,
    termId: s.termId,
    name: s.name,
    studentId: s.studentId,
    email: s.email,
    units: s.units,
    trainingDone: s.trainingDone,
    subjectsRaw: s.subjectsRaw,
    // Read again, like the flags below, so a submission sent before the course
    // reader learned a spelling ("MATH020", "PHYSIC") gets its courses now.
    subjectCodes: parseCourseCodes(s.subjectsRaw),
    // Only ever written through toSubmissionData, so the shape is known.
    availability: s.availability as AvailabilityRow[],
    notes: s.notes,
    status: s.status as SubmissionStatus,
    resubmittedAt: s.resubmittedAt?.toISOString() ?? null,
    availabilityChanged: s.availabilityChanged,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    flags: submissionFlags(s),
    shiftCount: s._count.shifts,
  };
}

interface DbPlannedShift {
  id: string;
  submissionId: number;
  day: string;
  building: string;
  start: number;
  end: number;
}

export function serializeShift(s: DbPlannedShift): Shift {
  return {
    id: s.id,
    tutorId: s.submissionId,
    // Only ever written through the planner's validated route.
    day: s.day as Weekday,
    building: s.building as Building,
    start: s.start,
    end: s.end,
  };
}

// No 0/o, 1/l/i: people read these codes off a screen.
const CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/**
 * A code like "f26-k7qm2x": season letter and year so William can tell links
 * apart at a glance, then enough randomness that nobody can guess one.
 */
export function generateAvailabilityCode(term: {
  name: string;
  startDate: Date;
}): string {
  const season = /[a-z]/i.exec(term.name)?.[0].toLowerCase() ?? "t";
  const year = String(term.startDate.getUTCFullYear()).slice(-2);
  let random = "";
  for (let i = 0; i < 6; i++) {
    random += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return `${season}${year}-${random}`;
}
