import type { Tutor, Day } from "@/types";
import type { CampusNow } from "@/utils/availability";
import { getSlotStatus } from "@/utils/availability";
import LocationBadge from "./LocationBadge";

interface Props {
  tutor: Tutor;
  displaySubjects: string[];
  selectedDay?: Day;
  now?: CampusNow;
}

const TutorCard = ({ tutor, displaySubjects, selectedDay, now }: Props) => {
  const cardClass = ["tutor-card", "visible", tutor.type && `tutor-card--${tutor.type}`]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cardClass}>
      <div className="tutor-card__name">{tutor.name}</div>
      <div className="tutor-card__subjects">{displaySubjects.join(", ")}</div>

      <div className="schedule-list">
        {tutor.schedule.map((slot, index) => {
          const isDimmed = selectedDay && slot.day !== selectedDay;
          const status = now ? getSlotStatus(slot, now) : null;
          // A dimmed row (filtered to another day) must not also glow "Now"
          const isActive = status === "now" && !isDimmed;
          return (
            <div
              key={index}
              className={[
                "schedule-item",
                isDimmed && "schedule-item--dimmed",
                isActive && "schedule-item--active",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="schedule-item__day">
                {slot.day}
                {isActive && (
                  <span className="schedule-item__now-badge">Now</span>
                )}
              </span>
              <span className="schedule-item__time">
                {slot.startTime} - {slot.endTime}
              </span>
              <LocationBadge location={slot.location} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TutorCard;
