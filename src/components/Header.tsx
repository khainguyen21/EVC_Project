"use client";

import { useEffect, useState } from "react";

const Header = () => {
  // Theme state
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Load theme from localStorage on mount
  useEffect(() => {
    // Check if theme is stored in localStorage,
    // if not, set default theme to light
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    }
  }, []);

  // Toggle theme function
  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    // Save theme to localStorage
    localStorage.setItem("theme", newTheme);
  };

  return (
    <header className="header">
      <button
        className="theme-toggle"
        onClick={toggleTheme}
        aria-label="Toggle theme"
      >
        <span className="theme-toggle__icon">
          {theme === "light" ? "🌙" : "☀️"}
        </span>
        <span className="theme-toggle__text">
          {theme === "light" ? "Dark" : "Light"}
        </span>
      </button>
      <div className="header__logo-container">
        <img
          src="/img/EVClogo.png"
          alt="Evergreen Valley College logo"
          className="header__logo"
        />
      </div>
      <h1 className="header__title">EVC Tutor Schedule</h1>
      <p className="header__subtitle">
        Find FREE tutoring help for your courses at Evergreen Valley College
      </p>
    </header>
  );
};

export default Header;
