import type { Tutor, Day } from "@/types";
import {
  sortTutorsByType,
} from "@/utils/subjectMapping";
import TutorCard from "./TutorCard";

interface Props {
  fieldName: string;
  tutors: Tutor[];
  selectedDay?: Day;
}

const SubjectSection = ({ fieldName, tutors, selectedDay }: Props) => {
  const sortedTutors = sortTutorsByType(tutors);
  return (
    <section className="subject">
      <div className="subject__title">{fieldName}</div>
      <div className="subject__cards">
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
            />
          );
        })}
      </div>
    </section>
  );
};

export default SubjectSection;
