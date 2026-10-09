import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/client";
import { requireAdmin } from "@/lib/session";
import { NothingToPublishError, loadPublishStatus, publishTerm } from "@/lib/publish";

const publishSchema = z.object({ termId: z.number().int().positive() });

// Admin: when the term was last published, and the student tutors on the
// public schedule now, for the planner's Publish button and review screen.
export async function GET(request: Request) {
  try {
    const unauthorized = await requireAdmin();
    if (unauthorized) return unauthorized;

    const termId = parseInt(new URL(request.url).searchParams.get("termId") ?? "", 10);
    if (isNaN(termId)) {
      return NextResponse.json({ error: "termId is required" }, { status: 400 });
    }

    return NextResponse.json(await loadPublishStatus(termId));
  } catch (error) {
    console.error("[GET /api/planner/publish]", error);
    return NextResponse.json(
      { error: "Failed to load publish status" },
      { status: 500 },
    );
  }
}

// Admin: copy a term's planner onto the public schedule, replacing every
// student tutor there. Professors and staff are left alone.
export async function POST(request: Request) {
  try {
    const unauthorized = await requireAdmin();
    if (unauthorized) return unauthorized;

    const validation = publishSchema.safeParse(await request.json());
    if (!validation.success) {
      return NextResponse.json({ error: "termId is required" }, { status: 400 });
    }
    const { termId } = validation.data;

    const term = await prisma.term.findUnique({ where: { id: termId }, select: { id: true } });
    if (!term) {
      return NextResponse.json({ error: "Term not found" }, { status: 404 });
    }

    return NextResponse.json(await publishTerm(termId));
  } catch (error) {
    if (error instanceof NothingToPublishError) {
      return NextResponse.json(
        { error: "No tutors have shifts yet, so there is nothing to publish." },
        { status: 400 },
      );
    }
    console.error("[POST /api/planner/publish]", error);
    return NextResponse.json({ error: "Failed to publish" }, { status: 500 });
  }
}
