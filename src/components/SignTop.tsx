"use client";

import Image from "next/image";
import Link from "next/link";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import styles from "@/components/SchedulePage.module.css";

interface Props {
  /** Makes the logo a link back to the schedule (every page but the schedule). */
  logoHref?: string;
}

/** The top row of the green sign: the EVC logo and the light/dark switch. */
const SignTop = ({ logoHref }: Props) => {
  const [theme, toggleTheme] = useTheme();

  const logo = (
    <Image
      src="/img/EVClogo.png"
      alt="Evergreen Valley College logo"
      className={styles.logo}
      width={400}
      height={300}
    />
  );

  return (
    <div className={styles.signTop}>
      {logoHref ? (
        <Link
          href={logoHref}
          className={styles.logoLink}
          aria-label="EVC Tutor Schedule home"
        >
          {logo}
        </Link>
      ) : (
        logo
      )}
      <button
        type="button"
        className={styles.themeToggle}
        onClick={toggleTheme}
        aria-label="Toggle theme"
      >
        {theme === "light" ? (
          <Moon size={16} aria-hidden="true" />
        ) : (
          <Sun size={16} aria-hidden="true" />
        )}
        {theme === "light" ? "Dark" : "Light"}
      </button>
    </div>
  );
};

export default SignTop;
