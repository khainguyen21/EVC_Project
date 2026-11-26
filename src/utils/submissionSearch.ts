import { matchesQuery, parseQuery } from "./courseCodes";

/** What the search reads from a submission. */
type Searchable = { name: string; subjectsRaw: string; subjectCodes: string[] };

/** Lowercase, straight apostrophes, single spaces: "Women’s  Studies" -> "women's studies". */
function tidy(text: string): string {
  return text.replace(/’/g, "'").replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * "Who can tutor ___?" on Tutor Availability: the submissions that match what
 * William typed, in their original order.
 *
 * A course or department ("math 71", "ethnic studies") is matched the way the
 * public schedule's search matches it, against the courses read from the form,
 * so "eth 1" doesn't find ETH 10 and a tutor who wrote "Any math" counts for
 * every math course. Anything else ("Criminology", "calc", a name) is matched
 * against the words the tutor wrote and their name.
 */
export function searchSubmissions<T extends Searchable>(submissions: T[], query: string): T[] {
  const needle = tidy(query);
  if (!needle) return submissions;

  const course = parseQuery(needle);
  return submissions.filter((s) =>
    course
      ? matchesQuery(s.subjectCodes, course)
      : tidy(s.name).includes(needle) || tidy(s.subjectsRaw).includes(needle),
  );
}
