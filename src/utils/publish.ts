/**
 * Publish: turns the tutors William placed on the shift planner into the
 * public schedule's student tutors. Pure and browser-safe, like utils/planner,
 * so the review screen and the publish step read the same plan.
 *
 * Publish rebuilds every student tutor from this plan (docs/ROADMAP.md,
 * feature 4), so nothing here matches a submission to an existing tutor.
 */
import { WEEKDAYS, toHHMM, type Building, type Weekday } from "./centerHours";
import { parseCourseCodes, shortenCourseCodes } from "./courseCodes";
import { OPEN_LAB, tutorCourses, type Shift } from "./planner";
import type { SubmissionStatus } from "./submission";

/** The parts of a submission Publish reads. */
export interface PublishSubmission {
  id: number;
  name: string;
  status: SubmissionStatus;
  subjectsRaw: string;
  availabilityChanged: boolean;
}

/**
 * One student tutor as the public schedule stores it. A type rather than an
 * interface so Prisma accepts it as JSON on a Publication.
 */
export type PublicTutorRow = {
  name: string;
  subjects: { name: string; field: string }[];
  schedules: { day: Weekday; start: string; end: string; location: Building }[];
};

/** A tutor the review screen names. */
export interface PlanTutor {
  id: number;
  name: string;
}

export interface PublishPlan {
  tutors: PublicTutorRow[];
  /** Approved, but William placed no shifts for them. Left out. */
  noShifts: PlanTutor[];
  /**
   * Has shifts, but their subjects couldn't be read ("subjects need review" in
   * the inbox). Left out: with no subjects they'd appear under no section.
   */
  needsReview: PlanTutor[];
  /**
   * Resubmitted after William placed them. Published with their shifts as he
   * left them, and named so he can check before he publishes.
   */
  availabilityChanged: PlanTutor[];
}

/**
 * The website's subject area for each department the course reader knows,
 * named as the live schedule already names them, so published tutors land in
 * the same sections as the professors and staff. Stats sits with Math there.
 */
export const SUBJECT_AREAS: Record<string, string> = {
  ACCT: "Accounting",
  ART: "Art",
  ASTR: "Astronomy",
  BIOL: "Biology",
  BIS: "Business",
  BUS: "Business",
  CHEM: "Chemistry",
  COMSC: "Computer Science",
  ECON: "Economics",
  ENGL: "English",
  ENGR: "Engineering",
  ESL: "ESL",
  ETHN: "Ethnic Studies",
  HIST: "History",
  MATH: "Mathematics",
  MUS: "Music",
  PHYS: "Physics",
  PSYC: "Psychology",
  SOCI: "Sociology",
  SPAN: "Spanish",
  STAT: "Mathematics",
  VIET: "Vietnamese",
};

/**
 * A whole department's name on a subject line, where the subject area's name
 * would read as its sibling: "Mathematics" means any Math course to students
 * and to the public search, not any Stats one.
 */
const WHOLE_DEPARTMENT_NAMES: Record<string, string> = {
  BIS: "BIS",
  STAT: "Statistics",
};

/** One line per subject area, shortened the way William types them. */
function subjectLines(subjectsRaw: string): PublicTutorRow["subjects"] {
  // Read again from the raw text, like the inbox, so a submission sent before
  // the reader learned a spelling still gets its courses.
  const courses = tutorCourses({ subjectCodes: parseCourseCodes(subjectsRaw), subjectsRaw });
  const byArea = new Map<string, string[]>();
  for (const code of courses) {
    const department = code.split("-")[0];
    const area = code === OPEN_LAB ? "Open Computer Lab" : (SUBJECT_AREAS[department] ?? department);
    byArea.set(area, [...(byArea.get(area) ?? []), code]);
  }
  return [...byArea].map(([field, codes]) => {
    // "Any English" reads as just "English", the way William lists it. Open
    // Computer Lab has no courses at all.
    const whole = (c: string) => c.endsWith("-*") || c === OPEN_LAB;
    const anyOf = new Set(codes.filter(whole).map((c) => c.split("-")[0]));
    const numbered = codes.filter((c) => !anyOf.has(c.split("-")[0]));
    const wholeNames = new Set([...anyOf].map((d) => WHOLE_DEPARTMENT_NAMES[d] ?? field));
    const lines = [...wholeNames, ...shortenCourseCodes(numbered)];
    return { name: lines.join(", "), field };
  });
}

export function planPublish(submissions: PublishSubmission[], shifts: Shift[]): PublishPlan {
  const tutors: PublicTutorRow[] = [];
  const noShifts: PlanTutor[] = [];
  const needsReview: PlanTutor[] = [];
  const availabilityChanged: PlanTutor[] = [];
  for (const submission of submissions) {
    if (submission.status === "declined") continue;
    const own = shifts
      .filter((s) => s.tutorId === submission.id)
      .sort((a, b) => WEEKDAYS.indexOf(a.day) - WEEKDAYS.indexOf(b.day) || a.start - b.start);
    if (own.length === 0) {
      // A pending tutor William hasn't placed is still waiting in the inbox.
      if (submission.status === "approved") {
        noShifts.push({ id: submission.id, name: submission.name });
      }
      continue;
    }
    const subjects = subjectLines(submission.subjectsRaw);
    if (subjects.length === 0) {
      needsReview.push({ id: submission.id, name: submission.name });
      continue;
    }
    if (submission.availabilityChanged) {
      availabilityChanged.push({ id: submission.id, name: submission.name });
    }
    tutors.push({
      name: submission.name,
      subjects,
      schedules: own.map((s) => ({
        day: s.day,
        start: toHHMM(s.start),
        end: toHHMM(s.end),
        location: s.building,
      })),
    });
  }
  return { tutors, noShifts, needsReview, availabilityChanged };
}

/**
 * Whether two plans put the same tutors on the website. Compared field by
 * field because a plan read back from the database has its JSON keys in
 * another order.
 */
export function samePublicRows(a: PublicTutorRow[], b: PublicTutorRow[]): boolean {
  const flat = (rows: PublicTutorRow[]) =>
    JSON.stringify(
      rows.map((t) => [
        t.name,
        t.subjects.map((s) => [s.name, s.field]),
        t.schedules.map((s) => [s.day, s.start, s.end, s.location]),
      ]),
    );
  return flat(a) === flat(b);
}

/** What the planner needs to know about publishing, besides its own plan. */
export interface PublishStatus {
  /** This term's last publish, and the tutors it put up. */
  lastPublished: { at: string; tutors: PublicTutorRow[] } | null;
  /** Student tutors on the public schedule now, which Publish removes. */
  onSchedule: string[];
  /** Student tutors William changed on Manage Staff since the last publish. */
  editedOnManageStaff: string[];
}
