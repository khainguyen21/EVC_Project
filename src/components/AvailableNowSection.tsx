"use client";

import type { Term, Tutor } from "@/types";
import type { CampusNow, TutorAvailability } from "@/utils/availability";
import { getTutorAvailability, toMinutes } from "@/utils/availability";
import { formatTermDate, type CampusStatus } from "@/utils/term";
import LocationBadge from "./LocationBadge";
import TutorCard from "./TutorCard";
import styles from "./SchedulePage.module.css";

interface Props {
  tutors: Tutor[];
  now?: CampusNow;
  term: Term | null;
  status?: CampusStatus;
}

interface AvailableTutor extends TutorAvailability {
  tutor: Tutor;
}

// Copy for days the schedule below doesn't apply (holiday, semester break).
function closedNotice(status: CampusStatus, term: Term | null) {
  switch (status.reason) {
    case "holiday":
      return {
        title: "Closed today",
        message: `Campus tutoring is closed for ${status.holidayName}.`,
      };
    case "before-term":
      return {
        title: "Not in session yet",
        message: term
          ? `${term.name} drop-in tutoring begins ${formatTermDate(term.startDate)}.`
          : "Drop-in tutoring has not started yet.",
      };
    case "after-term":
      return {
        title: "Semester over",
        message: term
          ? `${term.name} drop-in tutoring ended ${formatTermDate(term.endDate)}.`
          : "Drop-in tutoring has ended for the semester.",
      };
    default:
      return null;
  }
}

// Weekends have no drop-in shifts, so say so instead of rendering nothing.
const WEEKEND_DAYS = new Set(["Saturday", "Sunday"]);

const ClosedNotice = ({ title, message }: { title: string; message: string }) => (
  <section className={styles.notice}>
    <h2 className={styles.noticeTitle}>{title}</h2>
    <p className={styles.noticeText}>{message}</p>
  </section>
);

const AvailableNowSection = ({ tutors, now, term, status }: Props) => {
  // `now` and `status` are undefined until the client resolves campus time and
  // the active term, which keeps the first paint identical to the server render.
  if (!now || !status) return null;

  if (!status.open) {
    const notice = closedNotice(status, term);
    return notice ? <ClosedNotice {...notice} /> : null;
  }

  const available: AvailableTutor[] = [];
  for (const tutor of tutors) {
    const availability = getTutorAvailability(tutor, now);
    if (availability) available.push({ ...availability, tutor });
  }

  if (available.length === 0) {
    // A weekend inside the term: show a closed notice rather than silence, but
    // only when the data really has no shift today, so a future Saturday
    // schedule would automatically take precedence over this message.
    const hasShiftToday = tutors.some((tutor) =>
      tutor.schedule.some((slot) => slot.day === now.day),
    );
    if (WEEKEND_DAYS.has(now.day) && !hasShiftToday) {
      return (
        <ClosedNotice
          title="Closed today"
          message="Drop-in tutoring runs Monday through Friday."
        />
      );
    }
    return null;
  }

  // On-shift tutors first, then upcoming ones by how soon they start.
  available.sort((a, b) => {
    if (a.status !== b.status) return a.status === "now" ? -1 : 1;
    // Both came from getTutorAvailability, so start is guaranteed parseable.
    return toMinutes(a.slot.start)! - toMinutes(b.slot.start)!;
  });

  const openCount = available.filter((a) => a.status === "now").length;

  return (
    <section className={styles.openNow}>
      <div className={styles.openNowHead}>
        <h2 className={styles.openNowTitle}>
          <span className={styles.liveDot} aria-hidden="true" />
          Open now
        </h2>
        <span className={styles.openNowCount}>
          {openCount > 0 ? `${openCount} available now` : "Starting soon"}
        </span>
      </div>
      <div className={styles.tutorGrid}>
        {available.map(({ tutor, status, slot }) => (
          <div key={tutor.id ?? tutor.name} className={styles.openEntry}>
            <p
              className={[
                styles.openStatus,
                status === "soon" && styles.openStatusSoon,
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {status === "now"
                ? `Available now until ${slot.endTime}`
                : `Starts at ${slot.startTime}`}
              {" in "}
              <LocationBadge location={slot.location} />
            </p>
            <TutorCard
              tutor={tutor}
              displaySubjects={tutor.subjects.map((s) => s.name)}
              now={now}
            />
          </div>
        ))}
      </div>
    </section>
  );
};

export default AvailableNowSection;
