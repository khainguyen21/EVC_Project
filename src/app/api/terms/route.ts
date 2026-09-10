import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/client";
import { getSession } from "@/lib/session";
import { isoDateSchema, serializeTerm } from "@/lib/terms";

const createTermSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    startDate: isoDateSchema,
    endDate: isoDateSchema,
    isActive: z.boolean().optional().default(false),
  })
  .refine((t) => t.startDate <= t.endDate, {
    message: "End date must be on or after the start date",
    path: ["endDate"],
  });

// Admin: every term, newest first.
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const terms = await prisma.term.findMany({
      include: { holidays: true },
      orderBy: { startDate: "desc" },
    });

    return NextResponse.json({ terms: terms.map(serializeTerm) });
  } catch (error) {
    console.error("[GET /api/terms]", error);
    return NextResponse.json(
      { error: "Failed to fetch terms" },
      { status: 500 },
    );
  }
}

// Admin: create a term. Activating it deactivates whichever term was active.
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const validation = createTermSchema.safeParse(await request.json());
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message ?? "Invalid term" },
        { status: 400 },
      );
    }

    const { name, startDate, endDate, isActive } = validation.data;

    const term = await prisma.$transaction(async (tx) => {
      // Only one term may be active at a time.
      if (isActive) {
        await tx.term.updateMany({
          where: { isActive: true },
          data: { isActive: false },
        });
      }
      return tx.term.create({
        data: {
          name,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          isActive,
        },
        include: { holidays: true },
      });
    });

    return NextResponse.json({ term: serializeTerm(term) }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/terms]", error);
    return NextResponse.json(
      { error: "Failed to create term" },
      { status: 500 },
    );
  }
}
