"use client";

import Image from "next/image";
import { useTheme } from "@/hooks/useTheme";

const Header = () => {
  const [theme, toggleTheme] = useTheme();

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
