import { NextResponse } from "next/server";
import { prisma } from "@/lib/client";
import { requireAdmin } from "@/lib/session";
import { generateAvailabilityCode } from "@/lib/submissions";

async function findTerm(params: Promise<{ id: string }>) {
  const id = parseInt((await params).id, 10);
  if (isNaN(id)) return null;
  return prisma.term.findUnique({ where: { id } });
}

// Admin: open the availability form for a term, or replace its link. Either
// way a fresh code is issued, so any link sent before stops working.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const unauthorized = await requireAdmin();
    if (unauthorized) return unauthorized;

    const term = await findTerm(params);
    if (!term) {
      return NextResponse.json({ error: "Term not found" }, { status: 404 });
    }

    // The code is unique across terms. A collision is astronomically unlikely,
    // but retrying costs nothing.
    for (let attempt = 0; attempt < 3; attempt++) {
      const availabilityCode = generateAvailabilityCode(term);
      const clash = await prisma.term.findUnique({
        where: { availabilityCode },
        select: { id: true },
      });
      if (clash) continue;

      await prisma.term.update({
        where: { id: term.id },
        data: { availabilityCode },
      });
      return NextResponse.json({ availabilityCode });
    }
    throw new Error("Could not generate a unique availability code");
  } catch (error) {
    console.error("[POST /api/terms/[id]/availability-link]", error);
    return NextResponse.json(
      { error: "Failed to create the form link" },
      { status: 500 },
    );
  }
}

// Admin: close the form. Existing submissions are kept.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const unauthorized = await requireAdmin();
    if (unauthorized) return unauthorized;

    const term = await findTerm(params);
    if (!term) {
      return NextResponse.json({ error: "Term not found" }, { status: 404 });
    }

    await prisma.term.update({
      where: { id: term.id },
      data: { availabilityCode: null },
    });
    return NextResponse.json({ availabilityCode: null });
  } catch (error) {
    console.error("[DELETE /api/terms/[id]/availability-link]", error);
    return NextResponse.json(
      { error: "Failed to close the form" },
      { status: 500 },
    );
  }
}
