"use client";

import type { Term, Tutor } from "@/types";
import type { CampusNow, TutorAvailability } from "@/utils/availability";
import { getTutorAvailability, toMinutes } from "@/utils/availability";
import { formatTermDate, type CampusStatus } from "@/utils/term";
import TutorCard from "./TutorCard";

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
        title: "Closed Today",
        message: `Campus tutoring is closed for ${status.holidayName}.`,
      };
    case "before-term":
      return {
        title: "Not Yet In Session",
        message: term
          ? `${term.name} drop-in tutoring begins ${formatTermDate(term.startDate)}.`
          : "Drop-in tutoring has not started yet.",
      };
    case "after-term":
      return {
        title: "Semester Over",
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
  <section className="subject subject--open-now subject--closed">
    <div className="subject__title subject__title--open-now subject__title--closed">
      <span className="open-now__dot open-now__dot--closed" aria-hidden="true" />
      {title}
      <span className="open-now__count">{message}</span>
    </div>
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
          title="Closed Today"
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
    <section className="subject subject--open-now">
      <div className="subject__title subject__title--open-now">
        <span className="open-now__dot" aria-hidden="true" />
        Open Now
        <span className="open-now__count">
          {openCount > 0 ? `${openCount} available now` : "Starting soon"}
        </span>
      </div>
      <div className="subject__cards">
        {available.map(({ tutor, status, slot }) => (
          <div key={tutor.id ?? tutor.name} className="open-now__entry">
            <span
              className={`availability-chip availability-chip--${status}`}
            >
              {status === "now"
                ? `Available now until ${slot.endTime}`
                : `Starts at ${slot.startTime}`}
              {" · "}
              {slot.location}
            </span>
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
