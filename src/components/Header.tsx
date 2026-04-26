"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const Header = () => {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme && savedTheme !== theme) {
      document.documentElement.setAttribute("data-theme", savedTheme);
      // Deferred update avoids calling setState synchronously in the effect body
      Promise.resolve().then(() => setTheme(savedTheme));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <Image
          src="/img/EVClogo.png"
          alt="Evergreen Valley College logo"
          className="header__logo"
          width={400}
          height={300}
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
