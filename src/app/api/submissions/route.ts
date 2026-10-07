import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/client";
import { requireAdmin } from "@/lib/session";
import { serializeSubmission } from "@/lib/submissions";
import { toBuildingHours } from "@/utils/centerHours";
import { submissionSchema, toSubmissionData } from "@/utils/submission";

// Admin: every submission for one term, by name. A stable order, so a row
// William approves or edits stays where it was.
export async function GET(request: Request) {
  try {
    const unauthorized = await requireAdmin();
    if (unauthorized) return unauthorized;

    const termId = parseInt(
      new URL(request.url).searchParams.get("termId") ?? "",
      10,
    );
    if (isNaN(termId)) {
      return NextResponse.json({ error: "termId is required" }, { status: 400 });
    }

    const submissions = await prisma.availabilitySubmission.findMany({
      where: { termId },
      include: { _count: { select: { shifts: true } } },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });

    return NextResponse.json({
      submissions: submissions.map(serializeSubmission),
    });
  } catch (error) {
    console.error("[GET /api/submissions]", error);
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 },
    );
  }
}

const termIdSchema = z.object({ termId: z.number().int() });

// Admin: add a submission by hand, e.g. for a tutor who replied by email.
// Works whether or not the term's form is open.
export async function POST(request: Request) {
  try {
    const unauthorized = await requireAdmin();
    if (unauthorized) return unauthorized;

    const body = await request.json();
    const target = termIdSchema.safeParse(body);
    if (!target.success) {
      return NextResponse.json({ error: "termId is required" }, { status: 400 });
    }
    const { termId } = target.data;

    // The term first: its building hours decide which times are allowed.
    const term = await prisma.term.findUnique({
      where: { id: termId },
      include: { buildingHours: true },
    });
    if (!term) {
      return NextResponse.json({ error: "Term not found" }, { status: 404 });
    }
    const hours = toBuildingHours(term.buildingHours);

    const validation = submissionSchema(hours).safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message ?? "Invalid submission" },
        { status: 400 },
      );
    }
    const { studentId, ...fields } = validation.data;

    const existing = await prisma.availabilitySubmission.findUnique({
      where: { termId_studentId: { termId, studentId } },
      select: { name: true },
    });
    if (existing) {
      return NextResponse.json(
        {
          error: `${existing.name} already has a submission with ID ${studentId} for ${term.name}. Edit that one instead.`,
        },
        { status: 409 },
      );
    }

    const submission = await prisma.availabilitySubmission.create({
      data: { termId, studentId, ...toSubmissionData(fields, hours) },
      include: { _count: { select: { shifts: true } } },
    });

    return NextResponse.json(
      { submission: serializeSubmission(submission) },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/submissions]", error);
    return NextResponse.json(
      { error: "Failed to add submission" },
      { status: 500 },
    );
  }
}
