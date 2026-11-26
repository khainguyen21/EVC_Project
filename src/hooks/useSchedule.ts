"use client";

import { useEffect, useMemo, useState } from "react";
import { type Term, type Tutor, type Day } from "@/types";
import {
  getUniqueFields,
  sortSubjectAlphabetically,
} from "@/utils/subjectMapping";
import { useCampusNow } from "@/hooks/useCampusNow";
import { getCampusStatus } from "@/utils/term";
import { matchesQuery, parseCourseCodes, parseQuery } from "@/utils/courseCodes";
import { fetchTutors } from "@/utils/fetchTutors";

/**
 * Everything the public schedule page knows, minus how it looks: the tutor
 * list, the campus clock, and the search, subject and day filters.
 *
 * Shared by every design of the page so they behave identically and differ
 * only in presentation.
 */
export function useSchedule(term: Term | null) {
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

  // Fetch data on component mount
  useEffect(() => {
    // A failed load shows the error, never "No tutors found".
    fetchTutors()
      .then((list) => {
        setTutors(list);
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

  return {
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
    subjects: sortSubjectAlphabetically(Object.keys(groupedByField)),
    visibleSections,
    resultCount,
    handleSearchChange,
    handleCourseChange,
    handleDayChange,
  };
}
