import { NextResponse } from "next/server";
import { prisma } from "@/lib/client";
import { requireAdmin } from "@/lib/session";
import { serializeShift, serializeSubmission } from "@/lib/submissions";

// Admin: everything the shift planner shows for one term.
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

    const [submissions, shifts, settings] = await Promise.all([
      // Approved tutors, plus anyone William placed who has since resubmitted:
      // they stay on the board, badged, until he approves them again.
      prisma.availabilitySubmission.findMany({
        where: {
          termId,
          OR: [
            { status: "approved" },
            { status: "pending", shifts: { some: {} } },
          ],
        },
        include: { _count: { select: { shifts: true } } },
        orderBy: [{ name: "asc" }, { id: "asc" }],
      }),
      prisma.plannedShift.findMany({ where: { submission: { termId } } }),
      prisma.siteSettings.findUnique({
        where: { id: 1 },
        select: { usualHoursMin: true, usualHoursMax: true },
      }),
    ]);

    return NextResponse.json({
      tutors: submissions.map(serializeSubmission),
      shifts: shifts.map(serializeShift),
      usualHours:
        settings?.usualHoursMin != null && settings.usualHoursMax != null
          ? { min: settings.usualHoursMin, max: settings.usualHoursMax }
          : null,
    });
  } catch (error) {
    console.error("[GET /api/planner]", error);
    return NextResponse.json(
      { error: "Failed to load the planner" },
      { status: 500 },
    );
  }
}
