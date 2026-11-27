"use client";

import { useRef } from "react";
import { Navigation, SearchX, TriangleAlert } from "lucide-react";
import { type Term } from "@/types";
import FilterBar from "@/components/FilterBar";
import SubjectSection from "@/components/SubjectSection";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import AvailableNowSection from "@/components/AvailableNowSection";
import NetTutorBox from "@/components/NetTutorBox";
import SignTop from "@/components/SignTop";
import { overpass } from "@/components/fonts";
import { ROOMS } from "@/components/LocationBadge";
import { useHideOnScroll } from "@/hooks/useHideOnScroll";
import { useSchedule } from "@/hooks/useSchedule";
import { formatTermDate } from "@/utils/term";
import styles from "@/components/SchedulePage.module.css";

interface Props {
  /** Read on the server so the banner dates are in the first paint. */
  term: Term | null;
}

const HomePage = ({ term }: Props) => {
  const {
    tutors,
    loading,
    error,
    filtering,
    lastUpdated,
    now,
    campusStatus,
    liveNow,
    searchQuery,
    courseFilter,
    dayFilter,
    trimmedQuery,
    subjects,
    visibleSections,
    resultCount,
    handleSearchChange,
    handleCourseChange,
    handleDayChange,
  } = useSchedule(term);
  // On phones the pinned bar covers too much of the list, so it tucks away
  // while scrolling down and returns on the first scroll up.
  const filterBarRef = useRef<HTMLDivElement>(null);
  const filterAnchorRef = useRef<HTMLDivElement>(null);
  const filterBarHidden = useHideOnScroll(filterBarRef, filterAnchorRef);

  return (
    <div className={`${overpass.variable} ${styles.page}`}>
      <div className={styles.inner}>
        <header className={styles.hero}>
          <div className={styles.sign}>
            <div className={styles.signFrame}>
              <SignTop />

              <h1 className={styles.title}>EVC Tutor Schedule</h1>
              <p className={styles.lede}>
                {term ? (
                  <>
                    Free drop-in tutoring for {term.name}, from{" "}
                    <strong>{formatTermDate(term.startDate)}</strong> through{" "}
                    <strong>{formatTermDate(term.endDate)}</strong>. Tutors help
                    students first come, first served.
                  </>
                ) : (
                  <>
                    Free drop-in tutoring for your Evergreen Valley College
                    courses. Tutors help students first come, first served.
                  </>
                )}
              </p>

              <h2 className={styles.signHeading}>Where to go</h2>
              <ul className={styles.rooms}>
                {ROOMS.map((room) => (
                  <li key={room.code}>
                    <a
                      href={room.mapLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.room}
                      title={`Get directions to ${room.code} ${room.place} (${room.building})`}
                    >
                      <span
                        className={`${styles.plate} ${styles.plateLarge}`}
                        data-tone={room.tone}
                      >
                        {room.code}
                      </span>
                      <span className={styles.roomText}>
                        <span className={styles.roomPlace}>{room.place}</span>
                        <span className={styles.roomBuilding}>
                          {room.building}
                        </span>
                      </span>
                      <span className={styles.roomDirections}>
                        <Navigation size={14} aria-hidden="true" />
                        <span className={styles.roomDirectionsText}>
                          Directions
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <NetTutorBox />
        </header>

        <main>
          <div id="schedule-section">
            {!loading && !error && (
              <AvailableNowSection
                tutors={tutors}
                now={now}
                term={term}
                status={campusStatus}
              />
            )}

            {lastUpdated && (
              <p id="last-updated" className={styles.updated}>
                Last updated: {lastUpdated}
              </p>
            )}

            <div ref={filterAnchorRef} aria-hidden="true" />
            <div
              id="filter-section"
              ref={filterBarRef}
              className={filterBarHidden ? "filter-section--hidden" : undefined}
            >
              <FilterBar
                searchQuery={searchQuery}
                selectedCourse={courseFilter}
                selectedDay={dayFilter}
                subjects={subjects}
                resultCount={resultCount}
                onSearchChange={handleSearchChange}
                onCourseChange={handleCourseChange}
                onDayChange={handleDayChange}
              />
            </div>

            {loading ? (
              <div className={styles.status} role="status">
                <span className={styles.spinner} aria-hidden="true" />
                <p>Loading tutor schedules…</p>
              </div>
            ) : error ? (
              <div className={styles.status}>
                <TriangleAlert
                  className={styles.statusIcon}
                  size={36}
                  aria-hidden="true"
                />
                <p className={styles.statusTitle}>The schedule didn’t load.</p>
                <p className={styles.statusHint}>
                  Refresh the page to try again. If it keeps happening, contact
                  the administrator.
                </p>
              </div>
            ) : (
              <section
                className={[styles.results, filtering && styles.resultsFiltering]
                  .filter(Boolean)
                  .join(" ")}
              >
                {visibleSections.length > 0 ? (
                  visibleSections.map(({ field, tutors: sectionTutors }) => (
                    <SubjectSection
                      key={field}
                      fieldName={field}
                      tutors={sectionTutors}
                      selectedDay={dayFilter || undefined}
                      now={liveNow}
                    />
                  ))
                ) : (
                  <div className={styles.status}>
                    <SearchX
                      className={styles.statusIcon}
                      size={36}
                      aria-hidden="true"
                    />
                    <p className={styles.statusTitle}>
                      No tutors found for{" "}
                      <strong>
                        {trimmedQuery || courseFilter || "these filters"}
                      </strong>
                      {dayFilter && (
                        <>
                          {" on "}
                          <strong>{dayFilter}</strong>
                        </>
                      )}
                      .
                    </p>
                    {trimmedQuery ? (
                      <p className={styles.statusHint}>
                        Try a course code like{" "}
                        <strong>CHEM 30A</strong> or <strong>Math 71</strong>,
                        or browse by subject above.
                      </p>
                    ) : (
                      <p className={styles.statusHint}>
                        Try {dayFilter ? "another day" : "clearing the filters"}.
                      </p>
                    )}
                  </div>
                )}
              </section>
            )}
          </div>
        </main>
      </div>

      <ScrollToTop />
      <Footer />
    </div>
  );
};

export default HomePage;
