import "server-only";
import { prisma } from "@/lib/client";
import { serializeShift } from "@/lib/submissions";
import {
  planPublish,
  type PublicTutorRow,
  type PublishPlan,
  type PublishStatus,
} from "@/utils/publish";
import type { Building, Weekday } from "@/utils/centerHours";
import type { SubmissionStatus } from "@/utils/submission";

/** What Publish would put on the public schedule for a term right now. */
export async function loadPublishPlan(termId: number): Promise<PublishPlan> {
  const [submissions, shifts] = await Promise.all([
    prisma.availabilitySubmission.findMany({
      where: { termId },
      select: { id: true, name: true, status: true, subjectsRaw: true, availabilityChanged: true },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    }),
    prisma.plannedShift.findMany({ where: { submission: { termId } } }),
  ]);
  return planPublish(
    submissions.map((s) => ({ ...s, status: s.status as SubmissionStatus })),
    shifts.map(serializeShift),
  );
}

export async function loadPublishStatus(termId: number): Promise<PublishStatus> {
  const [lastForTerm, lastOfAny, onSchedule] = await Promise.all([
    prisma.publication.findFirst({
      where: { termId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, published: true },
    }),
    // Any term's: whichever publish last replaced the student tutors.
    prisma.publication.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    prisma.tutor.findMany({
      where: { type: "tutor" },
      select: { name: true, editedOnManageStaffAt: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return {
    lastPublished: lastForTerm && {
      at: lastForTerm.createdAt.toISOString(),
      // Only ever written by publishTerm.
      tutors: lastForTerm.published as PublicTutorRow[],
    },
    onSchedule: onSchedule.map((t) => t.name),
    // Before the first publish every student tutor was typed by hand, and
    // the review screen already names them all as removed.
    editedOnManageStaff: lastOfAny
      ? onSchedule
          .filter((t) => t.editedOnManageStaffAt && t.editedOnManageStaffAt > lastOfAny.createdAt)
          .map((t) => t.name)
      : [],
  };
}

export class NothingToPublishError extends Error {}

/**
 * Replaces every student tutor on the public schedule with the term's plan,
 * in one transaction so students never see half a schedule. Professors and
 * staff are left alone. The replaced tutors are kept on the Publication.
 *
 * A fixed handful of queries however many tutors there are: the site and the
 * database are in different regions, so a few queries per tutor would be slow.
 */
export async function publishTerm(termId: number) {
  const plan = await loadPublishPlan(termId);
  // Publishing nothing would empty the public schedule of student tutors.
  if (plan.tutors.length === 0) throw new NothingToPublishError();

  return prisma.$transaction(async (tx) => {
    const old = await tx.tutor.findMany({
      where: { type: "tutor" },
      include: { subjects: true, schedules: true },
      orderBy: { name: "asc" },
    });
    const replaced: PublicTutorRow[] = old.map((t) => ({
      name: t.name,
      subjects: t.subjects.map((s) => ({ name: s.name, field: s.field })),
      schedules: t.schedules.map((s) => ({
        // Typed by hand on Manage Staff, so not always a planner building.
        day: s.day as Weekday,
        start: s.start,
        end: s.end,
        location: s.location as Building,
      })),
    }));

    // Subjects and shifts go with them (onDelete: Cascade).
    await tx.tutor.deleteMany({ where: { type: "tutor" } });

    const created = await tx.tutor.createManyAndReturn({
      data: plan.tutors.map((t) => ({ name: t.name, type: "tutor" })),
      select: { id: true, name: true },
    });
    // Rows come back in the order they were sent. Check rather than assume,
    // since every subject and shift below is matched to its tutor by position.
    if (created.some((row, i) => row.name !== plan.tutors[i].name)) {
      throw new Error("Created tutors came back out of order");
    }

    await tx.subject.createMany({
      data: plan.tutors.flatMap((t, i) =>
        t.subjects.map((s) => ({ ...s, tutorId: created[i].id })),
      ),
    });
    await tx.schedule.createMany({
      data: plan.tutors.flatMap((t, i) =>
        t.schedules.map((s) => ({ ...s, tutorId: created[i].id })),
      ),
    });

    const publication = await tx.publication.create({
      data: { termId, replaced, published: plan.tutors },
      select: { createdAt: true },
    });
    await tx.siteSettings.upsert({
      where: { id: 1 },
      update: { scheduleLastUpdated: publication.createdAt },
      create: { id: 1, scheduleLastUpdated: publication.createdAt },
    });

    return {
      publishedAt: publication.createdAt.toISOString(),
      tutors: created.length,
      shifts: plan.tutors.reduce((n, t) => n + t.schedules.length, 0),
      removed: old.length,
    };
  });
}
