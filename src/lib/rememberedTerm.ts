/**
 * The term William last picked on the shift planner or Tutor Availability, so
 * coming back from another admin page opens the same term. Kept for this
 * browser tab only: a fresh visit opens the usual default (pickDefaultTerm).
 *
 * Storage can be unavailable (private windows, blocked site data), and then
 * the pages simply open the default.
 */
const KEY = "admin-term";

export function readRememberedTerm(): number | null {
  try {
    const id = Number(sessionStorage.getItem(KEY));
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

export function rememberTerm(id: number) {
  try {
    sessionStorage.setItem(KEY, String(id));
  } catch {
    // Not remembered; the page still works.
  }
}
