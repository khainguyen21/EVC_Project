import { NextResponse } from "next/server";
import { prisma } from "@/lib/client";
import { serializeTerm } from "@/lib/terms";

// Public: the active academic term. Drives the homepage banner and decides
// whether "Available Now" runs today (holidays, semester breaks).
export async function GET() {
  try {
    const term = await prisma.term.findFirst({
      where: { isActive: true },
      include: { holidays: true },
    });

    return NextResponse.json({ term: term ? serializeTerm(term) : null });
  } catch (error) {
    console.error("[GET /api/term]", error);
    return NextResponse.json(
      { error: "Failed to fetch active term" },
      { status: 500 },
    );
  }
}
