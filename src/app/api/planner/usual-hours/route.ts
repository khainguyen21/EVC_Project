import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/client";
import { requireAdmin } from "@/lib/session";

// Null clears it. Above 20 makes no sense: student tutors must stay under 20.
const hours = z
  .number("Usual hours must be numbers")
  .positive("Usual hours must be more than 0")
  .max(20, "Usual hours can't be more than 20");
const usualHoursSchema = z.object({
  usualHours: z
    .object({ min: hours, max: hours })
    .refine((r) => r.min <= r.max, "The first number can't be more than the second")
    .nullable(),
});

// Admin: William's usual weekly hours per tutor, a range. Kept in the
// database, never in this public repo.
export async function PUT(request: Request) {
  try {
    const unauthorized = await requireAdmin();
    if (unauthorized) return unauthorized;

    const validation = usualHoursSchema.safeParse(await request.json());
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message ?? "Invalid hours" },
        { status: 400 },
      );
    }
    const { usualHours } = validation.data;
    const range = { usualHoursMin: usualHours?.min ?? null, usualHoursMax: usualHours?.max ?? null };

    // Leaves scheduleLastUpdated alone: this is not a public schedule change.
    await prisma.siteSettings.upsert({
      where: { id: 1 },
      update: range,
      create: { id: 1, ...range },
    });

    return NextResponse.json({ usualHours });
  } catch (error) {
    console.error("[PUT /api/planner/usual-hours]", error);
    return NextResponse.json(
      { error: "Failed to save usual hours" },
      { status: 500 },
    );
  }
}
