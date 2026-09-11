import { NextResponse } from "next/server";
import { getActiveTerm } from "@/lib/activeTerm";

// Public: the active academic term. Pages read the term server-side via
// getActiveTerm(); this endpoint exposes the same data over HTTP.
export async function GET() {
  try {
    return NextResponse.json({ term: await getActiveTerm() });
  } catch (error) {
    console.error("[GET /api/term]", error);
    return NextResponse.json(
      { error: "Failed to fetch active term" },
      { status: 500 },
    );
  }
}
