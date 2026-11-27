"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { SHOWN, isTextEntry, nextBarState } from "@/utils/filterBarScroll";

/** Matches the stacking breakpoint in globals.css; wider screens never hide. */
const MOBILE_QUERY = "(max-width: 640px)";

/**
 * Hide-on-scroll-down for a sticky bar on phones. Once hidden it stays hidden
 * until `reveal` is called (the arrow button) or the student scrolls back up
 * to where the bar normally sits. The rules live in nextBarState.
 *
 * `anchorRef` is a zero-height element placed right where the bar sits in the
 * page. While it is still on screen the bar is in its natural spot, not pinned
 * over content, so there is nothing to hide.
 */
export function useHideOnScroll(
  barRef: RefObject<HTMLElement | null>,
  anchorRef: RefObject<HTMLElement | null>,
): { hidden: boolean; reveal: () => void } {
  const [hidden, setHidden] = useState(false);
  // Read by the scroll listener, so it must not wait for a re-render.
  const state = useRef(SHOWN);

  const reveal = useCallback(() => {
    state.current = SHOWN;
    setHidden(false);
  }, []);

  useEffect(() => {
    const mobile = window.matchMedia(MOBILE_QUERY);
    let lastY = window.scrollY;

    const isTyping = () => {
      const active = document.activeElement;
      return (
        active instanceof HTMLInputElement &&
        barRef.current?.contains(active) === true &&
        isTextEntry(active)
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
      state.current = nextBarState(state.current, {
        delta,
        mobile: mobile.matches,
        pinned: anchorTop < 0,
        typing: isTyping(),
      });
      setHidden(state.current.hidden);
    };

    // A finger dragging the list means the student is done typing, so close
    // the keyboard the way many apps do. Otherwise a search box left focused
    // (Android can hide the keyboard without unfocusing it) would count as
    // typing and keep the bar pinned over the list. Results filter as you
    // type, so nothing is lost. Drags on the bar itself are left alone.
    const onTouchMove = (event: TouchEvent) => {
      const active = document.activeElement;
      if (
        mobile.matches &&
        isTyping() &&
        active instanceof HTMLElement &&
        !barRef.current?.contains(event.target as Node)
      ) {
        active.blur();
      }
    };

    // Tabbing into the bar always brings it back.
    const onFocusIn = (event: FocusEvent) => {
      if (barRef.current?.contains(event.target as Node)) reveal();
    };

    const onBreakpoint = () => {
      if (!mobile.matches) reveal();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("focusin", onFocusIn);
    mobile.addEventListener("change", onBreakpoint);
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("focusin", onFocusIn);
      mobile.removeEventListener("change", onBreakpoint);
    };
  }, [barRef, anchorRef, reveal]);

  return { hidden, reveal };
}
