import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/client";

const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 50;

/**
 * Records one public submission attempt and says whether it is allowed:
 * at most 50 per IP per hour. Tutors on campus Wi-Fi share a few public
 * addresses, so the limit has to cover a whole room of them.
 *
 * Counted in the database because Vercel runs many short-lived instances and
 * an in-memory counter would reset between them. IPs are hashed with the
 * session secret, so the table never holds a raw address.
 */
export async function allowSubmissionAttempt(request: Request): Promise<boolean> {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const ipHash = createHash("sha256")
    .update(`${process.env.SESSION_SECRET ?? ""}:${ip}`)
    .digest("hex");

  const since = new Date(Date.now() - WINDOW_MS);
  const recent = await prisma.submissionAttempt.count({
    where: { ipHash, createdAt: { gte: since } },
  });
  if (recent >= MAX_PER_WINDOW) return false;

  await prisma.submissionAttempt.create({ data: { ipHash } });
  // Nothing older than the window matters; keep the table from growing.
  await prisma.submissionAttempt.deleteMany({
    where: { createdAt: { lt: since } },
  });
  return true;
}
