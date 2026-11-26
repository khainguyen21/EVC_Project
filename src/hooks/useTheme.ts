"use client";

import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

/**
 * The visitor's saved light/dark choice, applied to <html data-theme>.
 *
 * Shared by the site header and the schedule page's sign so both toggles read
 * and write the same "theme" key.
 */
export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    if (savedTheme && savedTheme !== theme) {
      document.documentElement.setAttribute("data-theme", savedTheme);
      // Deferred update avoids calling setState synchronously in the effect body
      Promise.resolve().then(() => setTheme(savedTheme));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  };

  return [theme, toggleTheme];
}
