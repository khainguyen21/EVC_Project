import "server-only";
import { randomInt } from "node:crypto";
import type { Submission } from "@/types";
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
  subjectCodes: string[];
  availability: unknown;
  notes: string | null;
  status: string;
  resubmittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
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
    subjectCodes: s.subjectCodes,
    // Only ever written through toSubmissionData, so the shape is known.
    availability: s.availability as AvailabilityRow[],
    notes: s.notes,
    status: s.status as SubmissionStatus,
    resubmittedAt: s.resubmittedAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    flags: submissionFlags(s),
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
