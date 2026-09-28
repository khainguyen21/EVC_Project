import { NextResponse } from "next/server";
import { prisma } from "@/lib/client";
import { allowSubmissionAttempt } from "@/lib/rateLimit";
import {
  submissionSchema,
  toResubmissionData,
  toSubmissionData,
} from "@/utils/submission";

// Public: a tutor sends their availability through the link William emailed.
// No login; the term code in the link is the gate.
export async function POST(request: Request) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (!(await allowSubmissionAttempt(request))) {
      return NextResponse.json(
        { error: "Too many submissions. Please try again in an hour." },
        { status: 429 },
      );
    }

    // Honeypot: a field people never see. Bots that fill it get a success
    // response so they have no reason to try again, and nothing is saved.
    if (typeof body.website === "string" && body.website.trim() !== "") {
      return NextResponse.json({ ok: true, resubmitted: false });
    }

    const code = typeof body.code === "string" ? body.code.trim() : "";
    const term = code
      ? await prisma.term.findUnique({ where: { availabilityCode: code } })
      : null;
    if (!term) {
      return NextResponse.json(
        {
          error:
            "This form is closed or your link is incomplete. Use the link from William's email.",
        },
        { status: 404 },
      );
    }

    const validation = submissionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message ?? "Invalid submission" },
        { status: 400 },
      );
    }
    const input = validation.data;
    const key = { termId: term.id, studentId: input.studentId };

    const existing = await prisma.availabilitySubmission.findUnique({
      where: { termId_studentId: key },
      select: { id: true },
    });

    // Same student, same term: the new submission replaces the old one.
    await prisma.availabilitySubmission.upsert({
      where: { termId_studentId: key },
      create: { ...key, ...toSubmissionData(input) },
      update: toResubmissionData(input, new Date()),
    });

    return NextResponse.json({ ok: true, resubmitted: existing !== null });
  } catch (error) {
    console.error("[POST /api/availability]", error);
    return NextResponse.json(
      { error: "Something went wrong saving your availability. Please try again." },
      { status: 500 },
    );
  }
}
