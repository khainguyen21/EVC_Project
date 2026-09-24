"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { type Term, type Tutor, type Day } from "@/types";
import FilterBar from "@/components/FilterBar";
import SubjectSection from "@/components/SubjectSection";
import {
  getUniqueFields,
  sortSubjectAlphabetically,
} from "@/utils/subjectMapping";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import InfoSection from "@/components/InfoSection";
import ScrollToTop from "@/components/ScrollToTop";
import AvailableNowSection from "@/components/AvailableNowSection";
import { useCampusNow } from "@/hooks/useCampusNow";
import { useHideOnScroll } from "@/hooks/useHideOnScroll";
import { formatTermDate, getCampusStatus } from "@/utils/term";
import { matchesQuery, parseCourseCodes, parseQuery } from "@/utils/courseCodes";

interface Props {
  /** Read on the server so the banner dates are in the first paint. */
  term: Term | null;
}

const HomePage = ({ term }: Props) => {
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [dayFilter, setDayFilter] = useState<Day>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filtering, setFiltering] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  // Undefined until mounted, so the first client paint matches the server.
  const now = useCampusNow();
  // The term arrives as a prop, so availability can be judged as soon as the
  // clock resolves — there is no window where a holiday could flash "Open Now".
  const campusStatus = now ? getCampusStatus(now, term) : undefined;
  // Live "Now" badges only when drop-in tutoring is actually running today.
  const liveNow = campusStatus?.open ? now : undefined;
  // On phones the pinned bar covers too much of the list, so it tucks away
  // while scrolling down and returns on the first scroll up.
  const filterBarRef = useRef<HTMLDivElement>(null);
  const filterAnchorRef = useRef<HTMLDivElement>(null);
  const filterBarHidden = useHideOnScroll(filterBarRef, filterAnchorRef);

  // Fetch data on component mount
  useEffect(() => {
    fetch("/api/tutors")
      .then((response) => response.json())
      .then((data) => {
        setTutors(data.tutors ?? []); // ✅ safe fallback — prevents crash if DB is down
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(true);
        setLoading(false);
      });

    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.scheduleLastUpdated) {
          setLastUpdated(
            new Date(data.scheduleLastUpdated).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            }),
          );
        }
      })
      .catch(() => {});
  }, []);

  // Group tutors by subject field using an empty object
  const groupedByField: Record<string, Tutor[]> = {};

  tutors.forEach((tutor) => {
    // Rely completely on explicit backend fields binding
    const fields =
      tutor.fields && tutor.fields.length > 0
        ? tutor.fields
        : getUniqueFields(tutor.subjects.map((s) => s.name));

    // Add this tutor to each field they teach
    fields.forEach((field) => {
      if (!groupedByField[field]) {
        groupedByField[field] = [];
      }
      groupedByField[field].push(tutor);
    });
  });

  // Filter fields based on course filter
  const fieldsToShow = courseFilter
    ? Object.keys(groupedByField).filter((field) =>
        field.toLowerCase().includes(courseFilter.toLowerCase()),
      )
    : Object.keys(groupedByField);

  // Sort fields alphabetically
  const sortedFieldsToShow = sortSubjectAlphabetically(fieldsToShow);

  // One entry per distinct subject string, rebuilt only when tutors change.
  const codesBySubject = useMemo(() => {
    const codes = new Map<string, string[]>();
    for (const tutor of tutors) {
      for (const subject of tutor.subjects) {
        if (!codes.has(subject.name)) {
          codes.set(subject.name, parseCourseCodes(subject.name));
        }
      }
    }
    return codes;
  }, [tutors]);

  const trimmedQuery = searchQuery.trim();
  const parsedQuery = trimmedQuery ? parseQuery(trimmedQuery) : null;
  const needle = trimmedQuery.toLowerCase();

  /**
   * Matching is per section, not per tutor. Many tutors cover several
   * departments, so a tutor-level match would put someone found by "chem 30a"
   * under Physics and Mathematics as well, and a student would have no idea
   * why those headings appeared.
   *
   * Two layers within the section: course tokens catch "chem 30a" however it
   * is spelled, and the raw substring pass catches what the parser cannot
   * tokenise, such as "Open Computer Lab".
   */
  const tutorMatchesInField = (tutor: Tutor, field: string) => {
    if (!trimmedQuery) return true;

    // Searching a person shows every subject they cover, which is the point.
    if (tutor.name.toLowerCase().includes(needle)) return true;

    const fieldSubjects = tutor.subjects.filter(
      (subject) => subject.field === field,
    );

    if (parsedQuery) {
      const codes = fieldSubjects.flatMap(
        (subject) => codesBySubject.get(subject.name) ?? [],
      );
      if (matchesQuery(codes, parsedQuery)) return true;
    }

    return (
      field.toLowerCase().includes(needle) ||
      fieldSubjects.some((subject) =>
        subject.name.toLowerCase().includes(needle),
      )
    );
  };

  // Sections left after every active filter; empty ones are dropped entirely.
  const visibleSections = sortedFieldsToShow
    .map((field) => {
      let list = groupedByField[field];
      if (dayFilter) {
        list = list.filter((tutor) =>
          tutor.schedule.some((slot) => slot.day === dayFilter),
        );
      }
      if (trimmedQuery) {
        list = list.filter((tutor) => tutorMatchesInField(tutor, field));
      }
      return { field, tutors: list };
    })
    .filter((section) => section.tutors.length > 0);

  // Counted per person, not per card: one tutor can appear in several fields.
  const resultCount = new Set(
    visibleSections.flatMap((section) =>
      section.tutors.map((tutor) => tutor.id ?? tutor.name),
    ),
  ).size;

  // Functions to handle state updates
  const scrollToSchedule = () => {
    setTimeout(() => {
      const scheduleSection =
        document.getElementById("last-updated") ||
        document.getElementById("filter-section");
      if (scheduleSection) {
        const yOffset = -20;
        const y =
          scheduleSection.getBoundingClientRect().top +
          window.scrollY +
          yOffset;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    }, 50);
  };

  // Search and the subject dropdown are two ways to express one filter, so
  // using either clears the other. Combining them would produce empty results
  // ("Chemistry" plus "math 71") that a student has no way to explain.
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (query) setCourseFilter("");
  };

  const handleCourseChange = (course: string) => {
    setCourseFilter(course);
    if (course) setSearchQuery("");
    setFiltering(true);
    setTimeout(() => setFiltering(false), 300);
    scrollToSchedule();
  };

  const handleDayChange = (day: Day) => {
    setDayFilter(day);
    setFiltering(true);
    setTimeout(() => setFiltering(false), 300);
    scrollToSchedule();
  };

  return (
    <div className="container">
      <Header />
      <main>
        <InfoSection
          title="EVC Campus Tutoring Drop-In Schedule & NetTutor Online Tutoring"
          intro={
            term ? (
              <>
                <strong>{term.name} Drop-In Tutoring</strong> – Students can
                access our EVC tutoring team during the below drop-in days and
                times from <strong>{formatTermDate(term.startDate)}</strong>{" "}
                through <strong>{formatTermDate(term.endDate)}</strong>. Tutors
                are available for drop-in tutoring on a first come, first
                served basis.
              </>
            ) : (
              <>
                <strong>Drop-In Tutoring</strong> – Students can access our EVC
                tutoring team during the below drop-in days and times. Tutors
                are available for drop-in tutoring on a first come, first
                served basis.
              </>
            )
          }
        >
          <h3
            style={{
              color: "var(--primary-color)",
              margin: "20px 0 12px 0",
              fontSize: "1.1rem",
            }}
          >
            On-Campus Locations
          </h3>
          <p
            style={{
              fontSize: "0.9rem",
              color: "var(--text-secondary)",
              marginBottom: "12px",
            }}
          >
            Click any location to get directions via Google Maps
          </p>
          <div style={{ marginBottom: "20px" }}>
            <a
              href="https://www.google.com/maps/dir/?api=1&destination=37.301583,-121.765167"
              target="_blank"
              rel="noopener noreferrer"
              className="location-badge location-badge--clickable location-badge--library"
              title="Get directions to LE-237 Library Building"
            >
              LE-237 Campus Tutoring (Library Building)
              <span className="location-badge__external-icon">↗</span>
            </a>
            <a
              href="https://www.google.com/maps/dir/?api=1&destination=37.300333,-121.764194"
              target="_blank"
              rel="noopener noreferrer"
              className="location-badge location-badge--clickable location-badge--msrc"
              title="Get directions to MS-112 Math & Science Resource Center"
            >
              MS-112 Math &amp; Science Resource Center (MS3 Building)
              <span className="location-badge__external-icon">↗</span>
            </a>
            <a
              href="https://www.google.com/maps/dir/?api=1&destination=37.300694,-121.761333"
              target="_blank"
              rel="noopener noreferrer"
              className="location-badge location-badge--clickable location-badge--bio"
              title="Get directions to SQ-231 Biology Lab"
            >
              SQ-231 Biology Lab (Sequoia Building)
              <span className="location-badge__external-icon">↗</span>
            </a>
            <a
              href="https://www.google.com/maps/dir/?api=1&destination=37.300413,-121.761227"
              target="_blank"
              rel="noopener noreferrer"
              className="location-badge location-badge--clickable location-badge--music"
              title="Get directions to VPA-109/111 Music"
            >
              VPA-109/111 Music (Visual &amp; Performing Arts Building)
              <span className="location-badge__external-icon">↗</span>
            </a>
          </div>
          <h3
            style={{
              color: "var(--primary-color)",
              margin: "20px 0 12px 0",
              fontSize: "1.1rem",
            }}
          >
            NetTutor Online Tutoring
          </h3>
          <p style={{ marginBottom: "16px", lineHeight: 1.7 }}>
            EVC students can access <strong>NetTutor</strong> for all subjects
            by logging into their Canvas course:
          </p>
          <ol className="nettutor-steps">
            <li>Log into the Canvas course you need tutoring for</li>
            <li>
              Open <strong>Pisces/NetTutor Online Tutoring</strong> on the
              Canvas left-hand navigation
            </li>
            <li>
              Open NetTutor to see all subjects tutored, then click on your
              subject (e.g., Math Statistics) to see the drop-in schedule in the
              upper right-hand corner
            </li>
            <li>
              During drop-in hours: meet with a tutor live, schedule an
              appointment, OR drop off a question for feedback
            </li>
            <li>
              When meeting with a live tutor, follow their instructions to
              receive tutoring through the Drawing Canvas and/or video chat
            </li>
            <li>
              For writing help, use the{" "}
              <strong>Writing and Paper Center</strong> option at the bottom of
              the Subjects page to drop off papers for feedback
            </li>
          </ol>
          <p style={{ marginTop: "16px" }}>
            <a
              href="https://youtu.be/VlrPU34FzuY"
              target="_blank"
              rel="noopener noreferrer"
              className="info-section__cta"
            >
              <span>Watch NetTutor Tutorial (YouTube)</span>
            </a>
          </p>
        </InfoSection>

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
            <p
              id="last-updated"
              style={{
                textAlign: "right",
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
                marginBottom: "8px",
                marginRight: "20px",
                fontWeight: "bold",
              }}
            >
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
              subjects={sortSubjectAlphabetically(Object.keys(groupedByField))}
              resultCount={resultCount}
              onSearchChange={handleSearchChange}
              onCourseChange={handleCourseChange}
              onDayChange={handleDayChange}
            />
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Loading tutor schedules...</p>
            </div>
          ) : error ? (
            <div className="empty-state" style={{ minHeight: "300px" }}>
              <span className="empty-state-icon" style={{ fontSize: "3rem" }}>
                ⚠️
              </span>
              <p style={{ fontWeight: 600 }}>
                Could not connect to the database.
              </p>
              <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                Please try refreshing the page. If the issue persists, contact
                the administrator.
              </p>
            </div>
          ) : (
            <section className={filtering ? "schedule filtering" : "schedule"}>
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
                <div className="no-results empty-state">
                  <svg
                    className="empty-state-icon"
                    width="64"
                    height="64"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                    />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6" />
                  </svg>
                  <p>
                    No tutors found for{" "}
                    <strong style={{ color: "var(--primary-color)" }}>
                      {trimmedQuery || courseFilter || "these filters"}
                    </strong>
                    {dayFilter && (
                      <>
                        {" on "}
                        <strong style={{ color: "var(--primary-color)" }}>
                          {dayFilter}
                        </strong>
                      </>
                    )}
                    .
                  </p>
                  {trimmedQuery ? (
                    <p
                      style={{
                        fontSize: "0.9rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      Try a course code like{" "}
                      <strong>CHEM 30A</strong> or <strong>Math 71</strong>, or
                      browse by subject above.
                    </p>
                  ) : (
                    <p
                      style={{
                        fontSize: "0.9rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      Try {dayFilter ? "another day" : "clearing the filters"}.
                    </p>
                  )}
                </div>
              )}
            </section>
          )}
        </div>
      </main>

      <ScrollToTop />
      <Footer />
    </div>
  );
};

export default HomePage;
