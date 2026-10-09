import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/client";
import { requireAdmin } from "@/lib/session";
import { TERM_INCLUDE, buildingHoursSchema, serializeTerm } from "@/lib/terms";
import { toBuildingHoursRows } from "@/utils/centerHours";

const bodySchema = z.object({ hours: buildingHoursSchema });

// Admin: replace a term's building hours. Shifts and submissions already
// outside the new hours are kept; the planner and inbox show them as they are.
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const unauthorized = await requireAdmin();
    if (unauthorized) return unauthorized;

    const id = parseInt((await params).id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const validation = bodySchema.safeParse(await request.json());
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message ?? "Invalid building hours" },
        { status: 400 },
      );
    }

    const existing = await prisma.term.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ error: "Term not found" }, { status: 404 });
    }

    const [, , term] = await prisma.$transaction([
      prisma.buildingHours.deleteMany({ where: { termId: id } }),
      prisma.buildingHours.createMany({
        data: toBuildingHoursRows(validation.data.hours).map((row) => ({ termId: id, ...row })),
      }),
      prisma.term.findUniqueOrThrow({ where: { id }, include: TERM_INCLUDE }),
    ]);

    return NextResponse.json({ term: serializeTerm(term) });
  } catch (error) {
    console.error("[PUT /api/terms/[id]/building-hours]", error);
    return NextResponse.json(
      { error: "Failed to save the building hours" },
      { status: 500 },
    );
  }
}
