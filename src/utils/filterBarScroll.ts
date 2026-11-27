/** Scroll travel in one direction before the bar reacts, so jitter is ignored. */
export const THRESHOLD_PX = 12;

export interface BarScrollState {
  hidden: boolean;
  /** Distance travelled in the current direction; the sign is the direction. */
  travel: number;
}

export interface ScrollStep {
  /** Pixels moved since the last scroll event; positive is down the page. */
  delta: number;
  /** Phone width, the only place the bar ever hides. */
  mobile: boolean;
  /** The bar has left its natural spot and is pinned over the tutor list. */
  pinned: boolean;
  /** The search box inside the bar has focus (see isTextEntry). */
  typing: boolean;
}

export const SHOWN: BarScrollState = { hidden: false, travel: 0 };

/**
 * Whether the phone filter bar should be tucked away after one scroll event.
 *
 * Scrolling down past the bar hides it. Scrolling up does NOT bring it back:
 * the student taps the arrow button for that (see useHideOnScroll's reveal),
 * so the bar stops popping over the list on every small scroll up.
 *
 * It always shows on wider screens, in its natural spot near the top, and
 * while the student is typing in it (the phone keyboard scrolls the page, and
 * hiding the box being typed into would be baffling).
 */
export function nextBarState(
  prev: BarScrollState,
  { delta, mobile, pinned, typing }: ScrollStep,
): BarScrollState {
  if (!mobile || !pinned || typing) return SHOWN;

  // Restart the count whenever the direction flips.
  const travel =
    Math.sign(delta) === Math.sign(prev.travel) ? prev.travel + delta : delta;
  return { hidden: prev.hidden || travel > THRESHOLD_PX, travel };
}

/** Input types that bring up the phone keyboard. */
const TEXT_TYPES = new Set(["", "text", "search", "email", "number", "tel", "url"]);

/**
 * Whether focus on this element means the phone keyboard is up, which
 * scrolls the page on its own. Only then must the bar stay put.
 *
 * Dropdowns and buttons don't count: a dropdown keeps focus after a subject is
 * picked, and treating that as typing kept the bar pinned over the list for
 * the rest of the visit (found by Khai, November 26, 2026).
 */
export function isTextEntry(
  element: { tagName: string; type?: string } | null,
): boolean {
  return (
    element?.tagName === "INPUT" &&
    TEXT_TYPES.has((element.type ?? "").toLowerCase())
  );
}
