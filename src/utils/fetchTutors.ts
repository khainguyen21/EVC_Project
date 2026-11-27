import type { Tutor } from "@/types";

/**
 * Loads a tutor list from the tutors route, or throws if it could not be read.
 *
 * Any failure has to throw rather than return an empty list: an empty list
 * makes the home page say "No tutors found", and a student would take that to
 * mean there is no tutoring. On Admin → Manage Staff it looks as if every
 * tutor was deleted. A 500 from the route, a Vercel 503 page in HTML or a body
 * without a tutor list all count as failures.
 *
 * `url` defaults to the public list; Manage Staff passes `?sort=recent`.
 */
export async function fetchTutors(
  fetchImpl: typeof fetch = fetch,
  url = "/api/tutors",
): Promise<Tutor[]> {
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);

  const data: unknown = await res.json();
  const tutors = (data as { tutors?: unknown } | null)?.tutors;
  if (!Array.isArray(tutors)) throw new Error(`${url} sent no tutor list`);

  return tutors as Tutor[];
}
