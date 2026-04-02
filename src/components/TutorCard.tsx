import type { Tutor, Day } from "@/types";
import LocationBadge from "./LocationBadge";
import { formatSubjectsForDisplay } from "@/utils/subjectMapping";

interface Props {
  tutor: Tutor;
  displaySubjects: string[];
  selectedDay?: Day;
}

const TutorCard = ({ tutor, displaySubjects, selectedDay }: Props) => {
  const cardClass = `tutor-card visible ${tutor.type ? `tutor-card--${tutor.type}` : ""}`;

  return (
    <div className={cardClass}>
      <div className="tutor-card__name">{tutor.name}</div>
      {tutor.role && <div className="tutor-card__role">{tutor.role}</div>}

      <div className="tutor-card__subjects">
        {formatSubjectsForDisplay(displaySubjects)}
      </div>

      <div className="schedule-list">
        {tutor.schedule.map((slot, index) => {
          const isDimmed = selectedDay && slot.day !== selectedDay;
          return (
            <div
              key={index}
              className={`schedule-item ${isDimmed ? "schedule-item--dimmed" : ""}`}
            >
              <span className="schedule-item__day">{slot.day}</span>
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
