import { NextResponse } from "next/server";
import { prisma } from "@/lib/client";
import { getSession } from "@/lib/session";

// Admin: remove a closed day from a term.
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; holidayId: string }> },
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: idStr, holidayId: holidayIdStr } = await params;
    const termId = parseInt(idStr, 10);
    const holidayId = parseInt(holidayIdStr, 10);
    if (isNaN(termId) || isNaN(holidayId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Scoped to the term so a holiday can't be deleted through another term's URL.
    const { count } = await prisma.holiday.deleteMany({
      where: { id: holidayId, termId },
    });
    if (count === 0) {
      return NextResponse.json({ error: "Holiday not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Holiday deleted successfully" });
  } catch (error) {
    console.error("[DELETE /api/terms/[id]/holidays/[holidayId]]", error);
    return NextResponse.json(
      { error: "Failed to delete holiday" },
      { status: 500 },
    );
  }
}
