"use client";

import type { Tutor } from "@/types";
import type { CampusNow, TutorAvailability } from "@/utils/availability";
import { getTutorAvailability, toMinutes } from "@/utils/availability";
import TutorCard from "./TutorCard";

interface Props {
  tutors: Tutor[];
  now?: CampusNow;
}

interface AvailableTutor extends TutorAvailability {
  tutor: Tutor;
}

const AvailableNowSection = ({ tutors, now }: Props) => {
  // `now` is undefined until the client resolves campus time, which keeps
  // the first paint identical to the server render.
  if (!now) return null;

  const available: AvailableTutor[] = [];
  for (const tutor of tutors) {
    const availability = getTutorAvailability(tutor, now);
    if (availability) available.push({ ...availability, tutor });
  }

  if (available.length === 0) return null;

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
