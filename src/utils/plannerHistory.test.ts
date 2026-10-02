import { describe, expect, it } from "vitest";
import type { Shift } from "./planner";
import {
  UNDO_LIMIT,
  forgetFailedChange,
  recordChange,
  restoreChange,
  type Change,
} from "./plannerHistory";

function shift(id: string, start: number): Shift {
  return { id, tutorId: 1, day: "Monday", building: "MS-112", start, end: start + 120 };
}

const add = (s: Shift): Change => ({ before: null, after: s });
const move = (from: Shift, start: number): Change => ({
  before: from,
  after: { ...from, start, end: start + 120 },
});

describe("recordChange", () => {
  it("keeps only the last 20 changes", () => {
    let history: Change[] = [];
    for (let i = 0; i < UNDO_LIMIT + 5; i++) history = recordChange(history, add(shift(`s${i}`, 540)));
    expect(history).toHaveLength(UNDO_LIMIT);
    expect(history[0].after?.id).toBe("s5");
  });
});

describe("forgetFailedChange", () => {
  it("forgets only the change that didn't save", () => {
    const a = add(shift("a", 540));
    const b = add(shift("b", 600));
    const c = add(shift("c", 660));
    expect(forgetFailedChange([a, b, c], b)).toEqual([a, c]);
  });

  it("also forgets later changes to the same shift, which were built on it", () => {
    const first = add(shift("a", 540));
    const failed = move(first.after!, 600);
    const other = add(shift("b", 600));
    const after = move(failed.after!, 660);
    expect(forgetFailedChange([first, failed, other, after], failed)).toEqual([first, other]);
  });

  it("leaves the history alone if the change was already undone", () => {
    const a = add(shift("a", 540));
    const history = [a];
    expect(forgetFailedChange(history, add(shift("b", 600)))).toBe(history);
  });
});

describe("restoreChange", () => {
  it("puts back a change whose undo didn't save, so it can be undone again", () => {
    const a = add(shift("a", 540));
    const b = add(shift("b", 600));
    expect(restoreChange([a], b)).toEqual([a, b]);
  });

  it("puts it back after earlier changes to the same shift", () => {
    const first = add(shift("a", 540));
    const moved = move(first.after!, 600);
    expect(restoreChange([first], moved)).toEqual([first, moved]);
  });

  it("drops it if the shift was changed again after the undo", () => {
    const first = add(shift("a", 540));
    const moved = move(first.after!, 600);
    // Undoing `moved` showed the shift back at 540, and William moved it again.
    const movedAgain = move(first.after!, 720);
    expect(restoreChange([first, movedAgain], moved)).toEqual([first, movedAgain]);
  });
});
