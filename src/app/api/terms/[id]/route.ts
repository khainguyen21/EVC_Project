import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/client";
import { getSession } from "@/lib/session";
import { isoDateSchema, serializeTerm, toIsoDate } from "@/lib/terms";

const updateTermSchema = z.object({
  name: z.string().trim().min(1, "Name cannot be empty").optional(),
  startDate: isoDateSchema.optional(),
  endDate: isoDateSchema.optional(),
  isActive: z.boolean().optional(),
});

// Admin: update name/dates, or flip which term is active.
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const existing = await prisma.term.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Term not found" }, { status: 404 });
    }

    const validation = updateTermSchema.safeParse(await request.json());
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message ?? "Invalid term" },
        { status: 400 },
      );
    }
    const data = validation.data;

    // Validate the range against whichever dates will be in effect after the update.
    const startDate = data.startDate ?? toIsoDate(existing.startDate);
    const endDate = data.endDate ?? toIsoDate(existing.endDate);
    if (startDate > endDate) {
      return NextResponse.json(
        { error: "End date must be on or after the start date" },
        { status: 400 },
      );
    }

    const term = await prisma.$transaction(async (tx) => {
      // Only one term may be active at a time.
      if (data.isActive) {
        await tx.term.updateMany({
          where: { isActive: true, id: { not: id } },
          data: { isActive: false },
        });
      }
      return tx.term.update({
        where: { id },
        data: {
          name: data.name,
          startDate: data.startDate ? new Date(data.startDate) : undefined,
          endDate: data.endDate ? new Date(data.endDate) : undefined,
          isActive: data.isActive,
        },
        include: { holidays: true },
      });
    });

    return NextResponse.json({ term: serializeTerm(term) });
  } catch (error) {
    console.error("[PUT /api/terms/[id]]", error);
    return NextResponse.json(
      { error: "Failed to update term" },
      { status: 500 },
    );
  }
}

// Admin: delete a term (its holidays cascade-delete via the Prisma schema).
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const existing = await prisma.term.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Term not found" }, { status: 404 });
    }

    await prisma.term.delete({ where: { id } });
    return NextResponse.json({ message: "Term deleted successfully" });
  } catch (error) {
    console.error("[DELETE /api/terms/[id]]", error);
    return NextResponse.json(
      { error: "Failed to delete term" },
      { status: 500 },
    );
  }
}
