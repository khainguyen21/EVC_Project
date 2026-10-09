// The shift planner's undo list. Changes to different shifts don't affect each
// other, so a failed save only touches the changes to that one shift.
import type { Shift } from "./planner";

/** Changes kept for undo while the page is open. */
export const UNDO_LIMIT = 20;

/** One shift added (before null), changed, or removed (after null). */
export interface Change {
  before: Shift | null;
  after: Shift | null;
}

const shiftId = (c: Change) => (c.before ?? c.after)!.id;

function sameShift(a: Shift | null, b: Shift | null): boolean {
  if (a === null || b === null) return a === b;
  return (
    a.id === b.id &&
    a.tutorId === b.tutorId &&
    a.day === b.day &&
    a.building === b.building &&
    a.start === b.start &&
    a.end === b.end
  );
}

export function recordChange(history: Change[], change: Change): Change[] {
  return [...history, change].slice(-UNDO_LIMIT);
}

/**
 * A change whose save failed never happened, so undoing it would do the wrong
 * thing. Later changes to the same shift were made on top of it and go too.
 * Every other change saved and can still be undone.
 */
export function forgetFailedChange(history: Change[], failed: Change): Change[] {
  const i = history.indexOf(failed);
  if (i === -1) return history;
  const id = shiftId(failed);
  return [...history.slice(0, i), ...history.slice(i + 1).filter((c) => shiftId(c) !== id)];
}

/**
 * An undo whose save failed left the change in place, so it goes back on the
 * list to be undone again. Not if William changed that shift again after the
 * undo: his newer change is what the shift is now.
 */
export function restoreChange(history: Change[], undone: Change): Change[] {
  const id = shiftId(undone);
  const latest = history.findLast((c) => shiftId(c) === id);
  // The shift's last change on the list should lead to where the undo put it.
  if (latest && !sameShift(latest.after, undone.before)) return history;
  return recordChange(history, undone);
}
