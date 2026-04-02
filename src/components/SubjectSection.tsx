import type { Tutor, Day } from "@/types";
import {
  filterSubjectsByField,
  getLocationForField,
  sortTutorsByType,
} from "@/utils/subjectMapping";
import TutorCard from "./TutorCard";

interface Props {
  fieldName: string;
  tutors: Tutor[];
  selectedDay?: Day;
}

const SubjectSection = ({ fieldName, tutors, selectedDay }: Props) => {
  const location = getLocationForField(fieldName);
  const sortedTutors = sortTutorsByType(tutors);
  return (
    <section className="subject">
      <div className="subject__title">{fieldName}</div>
      <p className="subject__note">{location}</p>
      <div className="subject__cards">
        {sortedTutors.map((tutor) => {
          // Only show tutors have subjects in current field
          const displaySubjects = filterSubjectsByField(
            tutor.subjects,
            fieldName,
          );

          return (
            <TutorCard
              key={tutor.name}
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
