"use client";

import { useEffect, useState } from "react";
import type { Term } from "@/types";

/**
 * The active academic term, fetched once on mount.
 * `loaded` lets callers wait before judging availability, so a holiday can't
 * briefly flash "Open Now" while the request is in flight.
 */
export function useActiveTerm() {
  const [term, setTerm] = useState<Term | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/term")
      .then((res) => res.json())
      .then((data) => setTerm(data.term ?? null))
      .catch(() => setTerm(null))
      .finally(() => setLoaded(true));
  }, []);

  return { term, loaded };
}
