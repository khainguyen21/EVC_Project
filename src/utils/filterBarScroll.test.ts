import { describe, expect, it } from "vitest";
import {
  SHOWN,
  isTextEntry,
  THRESHOLD_PX,
  nextBarState,
  type BarScrollState,
  type ScrollStep,
} from "./filterBarScroll";

const PHONE: Omit<ScrollStep, "delta"> = {
  mobile: true,
  pinned: true,
  typing: false,
};

/** Runs a list of scroll moves (positive = down) on a phone, pinned. */
function scroll(
  deltas: number[],
  from: BarScrollState = SHOWN,
  step: Omit<ScrollStep, "delta"> = PHONE,
): BarScrollState {
  return deltas.reduce(
    (state, delta) => nextBarState(state, { ...step, delta }),
    from,
  );
}

describe("nextBarState", () => {
  it("hides once the student scrolls down past the threshold", () => {
    expect(scroll([THRESHOLD_PX + 1]).hidden).toBe(true);
  });

  it("ignores a small jiggle down", () => {
    expect(scroll([THRESHOLD_PX]).hidden).toBe(false);
    expect(scroll([3, 3, 3]).hidden).toBe(false);
  });

  it("adds up small moves in the same direction", () => {
    expect(scroll([5, 5, 5]).hidden).toBe(true);
  });

  it("restarts the count when the direction flips", () => {
    // 10 down, 2 up, 10 down: never 13 in one direction.
    expect(scroll([10, -2, 10]).hidden).toBe(false);
  });

  it("does NOT come back when the student scrolls up", () => {
    const hidden = scroll([40]);
    expect(scroll([-20], hidden).hidden).toBe(true);
    expect(scroll([-500], hidden).hidden).toBe(true);
    expect(scroll([-5, -5, -5, -5, -5, -5], hidden).hidden).toBe(true);
  });

  it("stays hidden when scrolling down again", () => {
    const hidden = scroll([40, -30]);
    expect(scroll([1], hidden).hidden).toBe(true);
    expect(scroll([0], hidden).hidden).toBe(true);
  });

  it("after the arrow tab reveals it, scrolling up keeps it shown", () => {
    // reveal() resets to SHOWN.
    expect(scroll([-50, -50]).hidden).toBe(false);
  });

  it("after the arrow tab reveals it, scrolling down hides it again", () => {
    expect(scroll([-50, 20]).hidden).toBe(true);
  });

  it("comes back in its natural spot near the top of the page", () => {
    const hidden = scroll([40]);
    expect(
      nextBarState(hidden, { ...PHONE, pinned: false, delta: -10 }),
    ).toEqual(SHOWN);
  });

  it("never hides on wider screens", () => {
    const desktop = { ...PHONE, mobile: false };
    expect(scroll([100, 100], SHOWN, desktop)).toEqual(SHOWN);
    expect(nextBarState({ hidden: true, travel: 50 }, { ...desktop, delta: 5 }))
      .toEqual(SHOWN);
  });

  it("never hides while the student is typing in it", () => {
    const typing = { ...PHONE, typing: true };
    expect(scroll([100, 100], SHOWN, typing)).toEqual(SHOWN);
  });

  it("starts counting fresh after typing ends", () => {
    const afterTyping = scroll([100], SHOWN, { ...PHONE, typing: true });
    expect(scroll([THRESHOLD_PX], afterTyping).hidden).toBe(false);
  });

  it("does not hide while the bar is still in its natural spot", () => {
    const natural = { ...PHONE, pinned: false };
    expect(scroll([5, 5, 5, 5], SHOWN, natural).hidden).toBe(false);
  });

  it("a zero-pixel scroll event changes nothing visible", () => {
    expect(scroll([0]).hidden).toBe(false);
    expect(scroll([0], { hidden: true, travel: 20 }).hidden).toBe(true);
  });

  it("survives random scrolling: once hidden, only a reset shows it", () => {
    // Seeded so a failure can be replayed.
    let seed = 42;
    const random = () => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31;
      return seed / 2 ** 31;
    };
    for (let run = 0; run < 500; run++) {
      let state = SHOWN;
      let wasHidden = false;
      for (let i = 0; i < 40; i++) {
        const delta = Math.round((random() - 0.5) * 60);
        state = nextBarState(state, { ...PHONE, delta });
        if (wasHidden) expect(state.hidden).toBe(true);
        wasHidden ||= state.hidden;
        expect(Number.isFinite(state.travel)).toBe(true);
      }
    }
  });
});

describe("isTextEntry", () => {
  it("counts the search box and other text boxes", () => {
    expect(isTextEntry({ tagName: "INPUT", type: "search" })).toBe(true);
    expect(isTextEntry({ tagName: "INPUT", type: "text" })).toBe(true);
    expect(isTextEntry({ tagName: "INPUT", type: "" })).toBe(true);
    expect(isTextEntry({ tagName: "INPUT" })).toBe(true);
    expect(isTextEntry({ tagName: "INPUT", type: "SEARCH" })).toBe(true);
  });

  it("does not count the subject dropdown (it keeps focus after a pick)", () => {
    expect(isTextEntry({ tagName: "SELECT", type: "select-one" })).toBe(false);
  });

  it("does not count buttons, checkboxes or nothing focused", () => {
    expect(isTextEntry({ tagName: "BUTTON", type: "button" })).toBe(false);
    expect(isTextEntry({ tagName: "INPUT", type: "checkbox" })).toBe(false);
    expect(isTextEntry({ tagName: "INPUT", type: "button" })).toBe(false);
    expect(isTextEntry({ tagName: "DIV" })).toBe(false);
    expect(isTextEntry(null)).toBe(false);
  });
});

describe("picking a subject, then scrolling (Khai's bug)", () => {
  it("hides the bar even though the dropdown still has focus", () => {
    const typing = isTextEntry({ tagName: "SELECT", type: "select-one" });
    const state = scroll([100, 100, 100], SHOWN, { ...PHONE, typing });
    expect(state.hidden).toBe(true);
  });
});
