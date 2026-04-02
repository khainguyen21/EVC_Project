"use client";

import type { Day } from "@/types";

interface Props {
  selectedCourse: string;
  selectedDay: Day;
  subjects: string[];
  onCourseChange: (course: string) => void;
  onDayChange: (day: Day) => void;
}

const FilterBar = ({
  selectedCourse,
  selectedDay,
  subjects,
  onCourseChange,
  onDayChange,
}: Props) => {
  const hasFilters = selectedCourse !== "" || selectedDay !== "";

  const handleClearAll = () => {
    onCourseChange("");
    onDayChange("");
  };

  return (
    <section className="filter">
      <div className="filter__group">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <label className="filter__label" htmlFor="course-filter">
            Need help? Which subject?
          </label>
          {hasFilters && (
            <button
              onClick={handleClearAll}
              className="filter__clear-button"
              aria-label="Clear all filters"
            >
              Clear Filters
            </button>
          )}
        </div>
        <select
          id="course-filter"
          className="filter__select"
          value={selectedCourse}
          onChange={(e) => onCourseChange(e.target.value)}
        >
          <option value="">All Courses</option>
          {subjects.map((subject) => {
            return (
              <option key={subject} value={subject}>
                {subject}
              </option>
            );
          })}
        </select>
      </div>

      <div className="filter__group">
        <label className="filter__label">When are you coming to campus?</label>
        <div className="day-pills">
          {(
            [
              "",
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
            ] as const
          ).map((day) => (
            <button
              key={day}
              className={`day-pill ${selectedDay === day ? "day-pill--active" : ""}`}
              onClick={() => onDayChange(day as Day)}
              aria-pressed={selectedDay === day}
            >
              {day === "" ? "Any Day" : day.slice(0, day.length)}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FilterBar;
