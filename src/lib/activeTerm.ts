import "server-only";
import { prisma } from "@/lib/client";
import { serializeTerm } from "@/lib/terms";
import type { Term } from "@/types";

/**
 * The active academic term, read straight from the database on the server.
 *
 * Pages call this so the term is present in the first HTML paint; /api/term
 * exposes the same data to anything that needs it from the browser.
 *
 * The `orderBy` is deliberate: only one term is meant to be active, but the
 * schema does not enforce it, so without an explicit order two active rows
 * would make the banner flip between them from one request to the next.
 */
export async function getActiveTerm(): Promise<Term | null> {
  const term = await prisma.term.findFirst({
    where: { isActive: true },
    orderBy: { startDate: "desc" },
    include: { holidays: true },
  });

  return term ? serializeTerm(term) : null;
}

/**
 * Same read, but never throws — a term lookup failing must not take down a
 * page that is mostly about the tutor schedule. Callers treat null as
 * "no term configured", which falls back to plain weekday/time behaviour.
 */
export async function getActiveTermSafe(): Promise<Term | null> {
  try {
    return await getActiveTerm();
  } catch (error) {
    console.error("[getActiveTermSafe]", error);
    return null;
  }
}
