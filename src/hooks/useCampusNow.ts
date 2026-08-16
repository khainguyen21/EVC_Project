"use client";

import { useSyncExternalStore } from "react";
import { getCampusNow, type CampusNow } from "@/utils/availability";

// How often to re-read the clock. Cheap: the snapshot below is memoized, so a
// re-render only happens when the campus minute actually changes.
const POLL_MS = 30_000;

let cachedSnapshot: CampusNow | undefined;

// useSyncExternalStore requires a referentially stable snapshot — returning a
// fresh object on every call would loop forever. Only swap in a new object when
// the campus minute actually changes.
function getSnapshot(): CampusNow | undefined {
  const next = getCampusNow();
  if (
    !cachedSnapshot ||
    cachedSnapshot.day !== next.day ||
    cachedSnapshot.minutes !== next.minutes
  ) {
    cachedSnapshot = next;
  }
  return cachedSnapshot;
}

// Undefined on the server so the first client paint matches the server render.
function getServerSnapshot(): CampusNow | undefined {
  return undefined;
}

function subscribe(onStoreChange: () => void): () => void {
  const interval = setInterval(onStoreChange, POLL_MS);
  // Hidden tabs throttle intervals — resync immediately when the user returns.
  document.addEventListener("visibilitychange", onStoreChange);
  window.addEventListener("focus", onStoreChange);
  return () => {
    clearInterval(interval);
    document.removeEventListener("visibilitychange", onStoreChange);
    window.removeEventListener("focus", onStoreChange);
  };
}

/**
 * Current campus (America/Los_Angeles) day + minutes, refreshed automatically.
 * Returns undefined during server render and the first client paint.
 */
export function useCampusNow(): CampusNow | undefined {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
