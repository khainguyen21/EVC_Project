import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/client";
import { requireAdmin } from "@/lib/session";
import { serializeSubmission } from "@/lib/submissions";
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

const createSchema = submissionSchema.extend({ termId: z.number().int() });

// Admin: add a submission by hand, e.g. for a tutor who replied by email.
// Works whether or not the term's form is open.
export async function POST(request: Request) {
  try {
    const unauthorized = await requireAdmin();
    if (unauthorized) return unauthorized;

    const validation = createSchema.safeParse(await request.json());
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message ?? "Invalid submission" },
        { status: 400 },
      );
    }
    const { termId, studentId, ...fields } = validation.data;

    const term = await prisma.term.findUnique({ where: { id: termId } });
    if (!term) {
      return NextResponse.json({ error: "Term not found" }, { status: 404 });
    }

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
      data: { termId, studentId, ...toSubmissionData(fields) },
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
