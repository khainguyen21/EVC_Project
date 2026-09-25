/**
 * Fired in the browser after any admin change to submissions, so the sidebar
 * can refresh its pending count without a page reload.
 */
export const SUBMISSIONS_CHANGED = "submissions-changed";

export function announceSubmissionsChanged() {
  window.dispatchEvent(new Event(SUBMISSIONS_CHANGED));
}
