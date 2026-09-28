import { NextResponse } from "next/server";
import { prisma } from "@/lib/client";
import { requireAdmin } from "@/lib/session";

// Admin: how many submissions are waiting, for the sidebar badge.
export async function GET() {
  try {
    const unauthorized = await requireAdmin();
    if (unauthorized) return unauthorized;

    const pending = await prisma.availabilitySubmission.count({
      where: { status: "pending" },
    });
    return NextResponse.json({ pending });
  } catch (error) {
    console.error("[GET /api/submissions/pending]", error);
    return NextResponse.json(
      { error: "Failed to count submissions" },
      { status: 500 },
    );
  }
}
