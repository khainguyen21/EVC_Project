import { GraduationCap, IdCard } from "lucide-react";
import type { Tutor, Day } from "@/types";
import type { CampusNow } from "@/utils/availability";
import { getSlotStatus } from "@/utils/availability";
import LocationBadge from "./LocationBadge";
import styles from "./SchedulePage.module.css";

interface Props {
  tutor: Tutor;
  displaySubjects: string[];
  selectedDay?: Day;
  now?: CampusNow;
}

// Faculty are usually entered as "Professor Kim"; this catches the ones that
// aren't, so the plate always says the word.
const HAS_TITLE = /^(professor|prof\.?)\s/i;

/**
 * Professors get a filled nameplate, like the engraved ones beside faculty
 * office doors; staff get an outlined plate with a "Staff" tab, like an ID
 * badge; student tutors keep the plain name. Each plate names the role in
 * words, so the marks need no legend.
 */
const TutorName = ({ tutor }: { tutor: Tutor }) => {
  if (tutor.type === "professor") {
    return (
      <span className={styles.facultyPlate}>
        <GraduationCap
          className={styles.plateIcon}
          size={18}
          aria-hidden="true"
        />
        <span>
          {HAS_TITLE.test(tutor.name) ? tutor.name : `Professor ${tutor.name}`}
        </span>
      </span>
    );
  }
  if (tutor.type === "staff") {
    return (
      <span className={styles.staffPlate}>
        <span className={styles.staffTab}>
          <IdCard className={styles.plateIcon} size={16} aria-hidden="true" />
          Staff
          {/* Heard as "Staff, Jane Doe" rather than "StaffJane Doe". */}
          <span className={styles.srOnly}>, </span>
        </span>
        <span className={styles.staffName}>{tutor.name}</span>
      </span>
    );
  }
  return tutor.name;
};

const TutorCard = ({ tutor, displaySubjects, selectedDay, now }: Props) => {
  return (
    <article className={styles.tutor}>
      <h3 className={styles.tutorName}>
        <TutorName tutor={tutor} />
      </h3>
      <p className={styles.tutorCourses}>{displaySubjects.join(", ")}</p>

      <ul className={styles.slots}>
        {tutor.schedule.map((slot, index) => {
          const isDimmed = selectedDay && slot.day !== selectedDay;
          const status = now ? getSlotStatus(slot, now) : null;
          // A dimmed row (filtered to another day) must not also glow "Now"
          const isActive = status === "now" && !isDimmed;
          return (
            <li
              key={index}
              className={[
                styles.slot,
                isDimmed && styles.slotDimmed,
                isActive && styles.slotNow,
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className={styles.slotDay}>
                {/* Small phones show "Wed"; screen readers always get the
                    full name. */}
                <span className={styles.slotDayFull}>{slot.day}</span>
                <span className={styles.slotDayShort} aria-hidden="true">
                  {slot.day.slice(0, 3)}
                </span>
                {isActive && <span className={styles.nowTag}>Now</span>}
              </span>
              <span className={styles.slotTime}>
                {slot.startTime} – {slot.endTime}
              </span>
              <LocationBadge location={slot.location} />
            </li>
          );
        })}
      </ul>
    </article>
  );
};

export default TutorCard;
