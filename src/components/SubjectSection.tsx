import type { Tutor, Day } from "@/types";
import type { CampusNow } from "@/utils/availability";
import {
  sortTutorsByType,
} from "@/utils/subjectMapping";
import TutorCard from "./TutorCard";
import styles from "./SchedulePage.module.css";

interface Props {
  fieldName: string;
  tutors: Tutor[];
  selectedDay?: Day;
  now?: CampusNow;
}

const SubjectSection = ({ fieldName, tutors, selectedDay, now }: Props) => {
  const sortedTutors = sortTutorsByType(tutors);
  return (
    <section className={styles.subject}>
      <div className={styles.subjectHead}>
        <h2 className={styles.subjectTitle}>{fieldName}</h2>
        <span className={styles.subjectCount}>
          {tutors.length} {tutors.length === 1 ? "tutor" : "tutors"}
        </span>
      </div>
      <div className={styles.tutorGrid}>
        {sortedTutors.map((tutor) => {
          // Native strict filtering by Database column, zero guesswork!
          const displaySubjects = tutor.subjects
            .filter((s) => s.field === fieldName)
            .map((s) => s.name);

          return (
            <TutorCard
              key={tutor.id}
              tutor={tutor}
              displaySubjects={displaySubjects}
              selectedDay={selectedDay}
              now={now}
            />
          );
        })}
      </div>
    </section>
  );
};

export default SubjectSection;
