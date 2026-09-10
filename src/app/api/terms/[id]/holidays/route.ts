import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/client";
import { getSession } from "@/lib/session";
import { isoDateSchema, serializeHoliday, toIsoDate } from "@/lib/terms";

const createHolidaySchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  date: isoDateSchema,
});

// Admin: add a closed day to a term.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: idStr } = await params;
    const termId = parseInt(idStr, 10);
    if (isNaN(termId)) {
      return NextResponse.json({ error: "Invalid term ID" }, { status: 400 });
    }

    const term = await prisma.term.findUnique({ where: { id: termId } });
    if (!term) {
      return NextResponse.json({ error: "Term not found" }, { status: 404 });
    }

    const validation = createHolidaySchema.safeParse(await request.json());
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message ?? "Invalid holiday" },
        { status: 400 },
      );
    }
    const { name, date } = validation.data;

    if (date < toIsoDate(term.startDate) || date > toIsoDate(term.endDate)) {
      return NextResponse.json(
        { error: "Holiday must fall within the term's dates" },
        { status: 400 },
      );
    }

    const holiday = await prisma.holiday.create({
      data: { name, date: new Date(date), termId },
    });

    return NextResponse.json(
      { holiday: serializeHoliday(holiday) },
      { status: 201 },
    );
  } catch (error) {
    // P2002 = unique constraint (termId, date) — the day is already a holiday.
    if ((error as { code?: string })?.code === "P2002") {
      return NextResponse.json(
        { error: "That date is already a holiday for this term" },
        { status: 409 },
      );
    }
    console.error("[POST /api/terms/[id]/holidays]", error);
    return NextResponse.json(
      { error: "Failed to add holiday" },
      { status: 500 },
    );
  }
}
