"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { type Tutor, type Day } from "@/types";
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

const HomePage = () => {
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [courseFilter, setCourseFilter] = useState("");
  const [dayFilter, setDayFilter] = useState<Day>("");
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);


  // Fetch data on component mount
  useEffect(() => {
    setLoading(true);
    fetch("/api/tutors")
      .then((response) => response.json())
      .then((data) => {
        setTutors(data.tutors);
        setLoading(false);
      })
      .catch((error) => {
        console.error(error);
        setLoading(false);
      });
  }, []);

  // Group tutors by subject field using an empty object
  const groupedByField: Record<string, Tutor[]> = {};

  tutors.forEach((tutor) => {
    // Get all unique fields based on what course the tutor teaches
    const fields = getUniqueFields(tutor.subjects);

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

  // Functions to handle state updates
  const scrollToSchedule = () => {
    setTimeout(() => {
      const scheduleSection = document.getElementById("schedule-section");
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

  const handleCourseChange = (course: string) => {
    setCourseFilter(course);
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
            <>
              <strong>Spring 2026 Drop-In Tutoring</strong> – Students can
              access our EVC tutoring team during the below drop-in days and
              times through <strong>February 2nd</strong> through{" "}
              <strong>May 22nd, 2026</strong>. Tutors are available for drop-in
              tutoring on a first come, first served basis.
            </>
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

          <FilterBar
            selectedCourse={courseFilter}
            selectedDay={dayFilter}
            subjects={sortSubjectAlphabetically(Object.keys(groupedByField))}
            onCourseChange={handleCourseChange}
            onDayChange={handleDayChange}
          />

          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Loading tutor schedules...</p>
            </div>
          ) : (
            <section className={filtering ? "schedule filtering" : "schedule"}>
              {sortedFieldsToShow.length > 0 ? (
                (() => {
                  const sections = sortedFieldsToShow.map((field) => {
                    const tutorsInField = groupedByField[field];
                    const filteredTutors = dayFilter
                      ? tutorsInField.filter((tutor) =>
                          tutor.schedule.some((slot) => slot.day === dayFilter),
                        )
                      : tutorsInField;

                    if (filteredTutors.length === 0) {
                      return null;
                    }

                    return (
                      <SubjectSection
                        key={field}
                        fieldName={field}
                        tutors={filteredTutors}
                        selectedDay={dayFilter || undefined}
                      />
                    );
                  });

                  const hasTutors = sections.some(
                    (section) => section !== null,
                  );

                  return hasTutors ? (
                    sections
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
                          d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
                        />
                      </svg>
                      <p>
                        It looks like no tutors are here for{" "}
                        <strong style={{ color: "var(--primary-color)" }}>
                          {courseFilter || "these filters"}
                        </strong>
                        {dayFilter && ` on `}
                        {dayFilter && (
                          <strong style={{ color: "var(--primary-color)" }}>
                            {dayFilter}
                          </strong>
                        )}
                        . Try {dayFilter ? "another day" : "clearing filters"}!
                      </p>
                    </div>
                  );
                })()
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
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 13h6"
                    />
                  </svg>
                  <p>
                    Sorry, no tutors found for these filters. Try &apos;Clear
                    Filters&apos; above!
                  </p>
                </div>
              )}
            </section>
          )}
        </div>

        <section
          className="action-banner"
          style={{
            background:
              "linear-gradient(135deg, var(--accent-green), var(--primary-dark))",
            marginBottom: "32px",
          }}
        >
          <h2>General Information &amp; MSRC Rules</h2>
          <p>
            Hours, registration, and dos &amp; don&apos;ts for the MATH and
            SCIENCE RESOURCE CENTER.
          </p>
          <Link href="/tutoring-rules" className="action-banner__link">
            View Rules &amp; Hours →
          </Link>
        </section>

        <section className="action-banner">
          <h2>Become an EVC Tutor</h2>
          <p>
            Now hiring student tutors! Earn <strong>$18.00/hour</strong> while
            helping fellow students.
          </p>
          <Link href="/become-a-tutor" className="action-banner__link">
            Learn More &amp; Apply →
          </Link>
        </section>
      </main>

      <ScrollToTop />
      <Footer />
    </div>
  );
};

export default HomePage;
