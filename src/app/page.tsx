import HomePage from "@/components/HomePage";
import { getActiveTermSafe } from "@/lib/activeTerm";

/**
 * The active term is read here rather than fetched from the browser so the
 * banner dates are in the first HTML paint: no swap from generic copy to
 * "Fall 2026 …" after hydration, and crawlers see the real dates.
 *
 * The tutor list is still fetched client-side by HomePage.
 */
// Without this the term read is baked in at build time and the banner would
// stay frozen until the next deploy. 60s keeps the database read off the
// per-visitor path while making a term change visible within a minute.
export const revalidate = 60;

export default async function Page() {
  const term = await getActiveTermSafe();
  return <HomePage term={term} />;
}
