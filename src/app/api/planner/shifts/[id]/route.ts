import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/client";
import { requireAdmin } from "@/lib/session";
import { serializeShift } from "@/lib/submissions";
import { BUILDINGS, WEEKDAYS, toBuildingHours } from "@/utils/centerHours";
import { shiftProblem } from "@/utils/planner";

const shiftSchema = z.object({
  tutorId: z.number().int(),
  day: z.enum(WEEKDAYS),
  building: z.enum(BUILDINGS),
  start: z.number().int(),
  end: z.number().int(),
});

// The browser makes shift ids, so undo can put a deleted shift back as it was.
const idSchema = z.uuid();

// Admin: create or replace one shift, as William drops, moves or resizes it.
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const unauthorized = await requireAdmin();
    if (unauthorized) return unauthorized;

    const id = idSchema.safeParse((await params).id);
    if (!id.success) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const validation = shiftSchema.safeParse(await request.json());
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message ?? "Invalid shift" },
        { status: 400 },
      );
    }
    const shift = { id: id.data, ...validation.data };

    const submission = await prisma.availabilitySubmission.findUnique({
      where: { id: shift.tutorId },
      select: { status: true, shifts: true, term: { select: { buildingHours: true } } },
    });
    if (!submission) {
      return NextResponse.json({ error: "Tutor not found" }, { status: 404 });
    }
    if (submission.status === "declined") {
      return NextResponse.json(
        { error: "This tutor was declined. Approve them in the inbox first." },
        { status: 400 },
      );
    }

    // A shift id belongs to one tutor for good; moving it to another would
    // let one request quietly rewrite someone else's week.
    const existing = await prisma.plannedShift.findUnique({
      where: { id: shift.id },
      select: { submissionId: true },
    });
    if (existing && existing.submissionId !== shift.tutorId) {
      return NextResponse.json(
        { error: "That shift belongs to another tutor" },
        { status: 409 },
      );
    }

    const problem = shiftProblem(
      shift,
      submission.shifts.map(serializeShift),
      toBuildingHours(submission.term.buildingHours),
    );
    if (problem) {
      return NextResponse.json({ error: problem }, { status: 400 });
    }

    const data = {
      day: shift.day,
      building: shift.building,
      start: shift.start,
      end: shift.end,
    };
    const saved = await prisma.plannedShift.upsert({
      where: { id: shift.id },
      update: data,
      create: { id: shift.id, submissionId: shift.tutorId, ...data },
    });

    return NextResponse.json({ shift: serializeShift(saved) });
  } catch (error) {
    console.error("[PUT /api/planner/shifts/[id]]", error);
    return NextResponse.json(
      { error: "Failed to save the shift" },
      { status: 500 },
    );
  }
}

// Admin: remove one shift. Removing one that is already gone succeeds, so a
// retried request or a fast undo/redo doesn't show William an error.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const unauthorized = await requireAdmin();
    if (unauthorized) return unauthorized;

    const id = idSchema.safeParse((await params).id);
    if (!id.success) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    await prisma.plannedShift.deleteMany({ where: { id: id.data } });
    return NextResponse.json({ message: "Shift removed" });
  } catch (error) {
    console.error("[DELETE /api/planner/shifts/[id]]", error);
    return NextResponse.json(
      { error: "Failed to remove the shift" },
      { status: 500 },
    );
  }
}
