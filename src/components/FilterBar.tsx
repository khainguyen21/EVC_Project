"use client";

import type { Day } from "@/types";
import styles from "./SchedulePage.module.css";

interface Props {
  searchQuery: string;
  selectedCourse: string;
  selectedDay: Day;
  subjects: string[];
  /** Distinct tutors currently shown, echoed back so students get feedback. */
  resultCount: number;
  onSearchChange: (query: string) => void;
  onCourseChange: (course: string) => void;
  onDayChange: (day: Day) => void;
}

const DAYS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;

const FilterBar = ({
  searchQuery,
  selectedCourse,
  selectedDay,
  subjects,
  resultCount,
  onSearchChange,
  onCourseChange,
  onDayChange,
}: Props) => {
  const trimmedQuery = searchQuery.trim();
  const hasFilters =
    trimmedQuery !== "" || selectedCourse !== "" || selectedDay !== "";

  const handleClearAll = () => {
    onSearchChange("");
    onCourseChange("");
    onDayChange("");
  };

  return (
    <section className={styles.filter}>
      <div className={styles.filterRow}>
        {/* Primary: the student who already knows their course code. */}
        <div className={`${styles.filterGroup} ${styles.filterGroupSearch}`}>
          <label className={styles.filterLabel} htmlFor="course-search">
            Search your course
          </label>
          <div className={styles.searchWrap}>
            <svg
              className={styles.searchIcon}
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              id="course-search"
              type="search"
              className={styles.search}
              // The placeholder is the only place students learn what to type,
              // and on desktop the label is hidden, so it names the task too.
              placeholder="Search courses, e.g. CHEM 30A"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              // Results filter as you type, so the keyboard's Search key just
              // closes the keyboard and hands the screen back to the list.
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              autoComplete="off"
              enterKeyHint="search"
            />
            {searchQuery !== "" && (
              <button
                type="button"
                className={styles.searchClear}
                onClick={() => onSearchChange("")}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Secondary: the student browsing to see what is on offer. Backed by
            the curated field column, so it finds entries the parser misses. */}
        <div className={`${styles.filterGroup} ${styles.filterGroupBrowse}`}>
          <label className={styles.filterLabel} htmlFor="course-filter">
            Or browse by subject
          </label>
          <select
            id="course-filter"
            className={styles.select}
            value={selectedCourse}
            onChange={(e) => onCourseChange(e.target.value)}
          >
            <option value="">All subjects</option>
            {subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={`${styles.filterGroup} ${styles.filterGroupDays}`}>
        <span className={styles.filterLabel} id="day-filter-label">
          When are you coming to campus?
        </span>
        <div
          className={styles.days}
          role="group"
          aria-labelledby="day-filter-label"
        >
          {DAYS.map((day) => (
            <button
              key={day}
              type="button"
              className={[styles.day, selectedDay === day && styles.dayActive]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onDayChange(day as Day)}
              aria-pressed={selectedDay === day}
              // Shown text shortens on phones; the name stays full for
              // screen readers either way.
              aria-label={day === "" ? "Any day" : day}
            >
              <span className={styles.dayFull}>
                {day === "" ? "Any day" : day}
              </span>
              <span className={styles.dayShort}>
                {day === "" ? "Any" : day.slice(0, 3)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {hasFilters && (
        <div className={styles.filterFooter}>
          <span className={styles.count} aria-live="polite">
            {resultCount === 0
              ? "No tutors match"
              : `${resultCount} tutor${resultCount === 1 ? "" : "s"}`}
            {/* Dropped on desktop, where the query sits right beside it. */}
            {trimmedQuery !== "" && (
              <span className={styles.countQuery}>
                {` for “${trimmedQuery}”`}
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={handleClearAll}
            className={styles.clear}
            aria-label="Clear all filters"
          >
            Clear filters
          </button>
        </div>
      )}
    </section>
  );
};

export default FilterBar;
