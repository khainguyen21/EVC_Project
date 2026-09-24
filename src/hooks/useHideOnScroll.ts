"use client";

import { useEffect, useState, type RefObject } from "react";

/** Matches the stacking breakpoint in globals.css; wider screens never hide. */
const MOBILE_QUERY = "(max-width: 640px)";

/** Scroll travel in one direction before the bar reacts, so jitter is ignored. */
const THRESHOLD_PX = 12;

/**
 * Hide-on-scroll-down, reveal-on-scroll-up for a sticky bar on phones.
 *
 * `anchorRef` is a zero-height element placed right where the bar sits in the
 * page. While it is still on screen the bar is in its natural spot, not pinned
 * over content, so there is nothing to hide.
 *
 * The bar stays put while a text field inside it has focus: the on-screen
 * keyboard scrolls the page, and hiding the box a student is typing into would
 * be baffling.
 */
export function useHideOnScroll(
  barRef: RefObject<HTMLElement | null>,
  anchorRef: RefObject<HTMLElement | null>,
): boolean {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const mobile = window.matchMedia(MOBILE_QUERY);
    let lastY = window.scrollY;
    // Distance travelled in the current direction; sign is the direction.
    let travel = 0;

    const isTyping = () => {
      const active = document.activeElement;
      return (
        active instanceof HTMLElement &&
        barRef.current?.contains(active) === true &&
        (active.tagName === "INPUT" || active.tagName === "SELECT")
      );
    };

    // Browsers already fire scroll at most once per frame, so no rAF throttle.
    const onScroll = () => {
      const y = window.scrollY;
      const maxY = document.documentElement.scrollHeight - window.innerHeight;
      // iOS rubber-banding reports positions past either end; ignore them.
      if (y < 0 || y > maxY) return;

      const delta = y - lastY;
      lastY = y;

      const anchorTop = anchorRef.current?.getBoundingClientRect().top ?? 0;
      if (!mobile.matches || anchorTop >= 0 || isTyping()) {
        travel = 0;
        setHidden(false);
        return;
      }

      // Restart the count whenever the direction flips.
      travel = Math.sign(delta) === Math.sign(travel) ? travel + delta : delta;
      if (travel > THRESHOLD_PX) setHidden(true);
      else if (travel < -THRESHOLD_PX) setHidden(false);
    };

    // Tabbing or tapping into the bar always brings it back.
    const onFocusIn = (event: FocusEvent) => {
      if (barRef.current?.contains(event.target as Node)) setHidden(false);
    };

    const onBreakpoint = () => {
      if (!mobile.matches) setHidden(false);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("focusin", onFocusIn);
    mobile.addEventListener("change", onBreakpoint);
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("focusin", onFocusIn);
      mobile.removeEventListener("change", onBreakpoint);
    };
  }, [barRef, anchorRef]);

  return hidden;
}
