import type { Tutor } from "@/types";

/**
 * Loads the public tutor list, or throws if it could not be read.
 *
 * Any failure has to throw rather than return an empty list: an empty list
 * makes the home page say "No tutors found", and a student would take that to
 * mean there is no tutoring. A 500 from the route, a Vercel 503 page in HTML
 * or a body without a tutor list all count as failures.
 */
export async function fetchTutors(fetchImpl: typeof fetch = fetch): Promise<Tutor[]> {
  const res = await fetchImpl("/api/tutors");
  if (!res.ok) throw new Error(`/api/tutors answered ${res.status}`);

  const data: unknown = await res.json();
  const tutors = (data as { tutors?: unknown } | null)?.tutors;
  if (!Array.isArray(tutors)) throw new Error("/api/tutors sent no tutor list");

  return tutors as Tutor[];
}
