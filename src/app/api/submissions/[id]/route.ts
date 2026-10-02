import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/client";
import { requireAdmin } from "@/lib/session";
import { serializeSubmission } from "@/lib/submissions";
import {
  SUBMISSION_STATUSES,
  submissionFieldsSchema,
  toSubmissionData,
} from "@/utils/submission";

// Either or both: a new status, and/or corrected fields. The student ID is
// not editable; it is how a tutor's resubmission finds this row.
const updateSchema = z.object({
  status: z.enum(SUBMISSION_STATUSES).optional(),
  fields: submissionFieldsSchema.optional(),
});

async function readId(params: Promise<{ id: string }>) {
  const id = parseInt((await params).id, 10);
  return isNaN(id) ? null : id;
}

// Admin: approve/decline, or correct what a tutor sent.
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const unauthorized = await requireAdmin();
    if (unauthorized) return unauthorized;

    const id = await readId(params);
    if (id === null) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const validation = updateSchema.safeParse(await request.json());
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message ?? "Invalid update" },
        { status: 400 },
      );
    }
    const { status, fields } = validation.data;

    const existing = await prisma.availabilitySubmission.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 },
      );
    }

    const update = prisma.availabilitySubmission.update({
      where: { id },
      data: {
        ...(fields ? toSubmissionData(fields) : {}),
        ...(status ? { status } : {}),
        // Approving means William has checked their new hours; declining
        // removes their shifts. Either way the planner badge is done.
        ...(status === "approved" || status === "declined"
          ? { availabilityChanged: false }
          : {}),
      },
      include: { _count: { select: { shifts: true } } },
    });
    // A declined tutor can't keep shifts on the planner. The inbox warns
    // William before he declines someone who has any.
    const submission =
      status === "declined"
        ? (
            await prisma.$transaction([
              prisma.plannedShift.deleteMany({ where: { submissionId: id } }),
              update,
            ])
          )[1]
        : await update;

    return NextResponse.json({ submission: serializeSubmission(submission) });
  } catch (error) {
    console.error("[PUT /api/submissions/[id]]", error);
    return NextResponse.json(
      { error: "Failed to update submission" },
      { status: 500 },
    );
  }
}

// Admin: remove a submission (spam, a test entry, someone who backed out).
// Its planned shifts go with it.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const unauthorized = await requireAdmin();
    if (unauthorized) return unauthorized;

    const id = await readId(params);
    if (id === null) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const { count } = await prisma.availabilitySubmission.deleteMany({
      where: { id },
    });
    if (count === 0) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ message: "Submission deleted" });
  } catch (error) {
    console.error("[DELETE /api/submissions/[id]]", error);
    return NextResponse.json(
      { error: "Failed to delete submission" },
      { status: 500 },
    );
  }
}
